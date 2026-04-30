-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ AI Wallet — XOR constraints, RLS deny-by-default, atomic RPC functions   ║
-- ║                                                                          ║
-- ║ Apply via:                                                               ║
-- ║   pnpm --filter @repo/database exec dotenv -e ../../.env -- \            ║
-- ║     prisma db execute --file ./prisma/sql/ai_wallet_init.sql \           ║
-- ║                       --schema ./prisma/schema.prisma                    ║
-- ║                                                                          ║
-- ║ Idempotent — safe to re-run.                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── XOR check: ai_wallet must belong to either user OR organization, never both ───
ALTER TABLE "ai_wallet" DROP CONSTRAINT IF EXISTS ai_wallet_xor_owner;
ALTER TABLE "ai_wallet"
  ADD CONSTRAINT ai_wallet_xor_owner
  CHECK (
    ("userId" IS NOT NULL AND "organizationId" IS NULL)
    OR ("userId" IS NULL AND "organizationId" IS NOT NULL)
  );

-- ─── RLS: deny-by-default on all wallet tables ───
-- Application layer (oRPC procedures) checks org membership via @repo/auth
-- and accesses these tables under the connection's role (typically owner of DB).
-- RLS here is defense-in-depth — anonymous/public connections see nothing.
ALTER TABLE "ai_wallet"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_wallet_transaction"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_quota_reservation"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_usage_event"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_pricing_rule"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fx_rate"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wallet_topup_order"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_provider_event" ENABLE ROW LEVEL SECURITY;

-- pricing rules + fx rates are read-only reference data → allow SELECT for all roles
DROP POLICY IF EXISTS pricing_rule_read ON "ai_pricing_rule";
CREATE POLICY pricing_rule_read ON "ai_pricing_rule" FOR SELECT USING (true);

DROP POLICY IF EXISTS fx_rate_read ON "fx_rate";
CREATE POLICY fx_rate_read ON "fx_rate" FOR SELECT USING (true);

-- ─── Helper: spendable balance computation (read-only) ───
CREATE OR REPLACE FUNCTION ai_wallet_spendable_kopecks(p_wallet_id text)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT
    GREATEST(w."includedMonthlyLimitKopecks" - w."includedUsedPeriodKopecks", 0)
    + w."promoBalanceKopecks"
    + w."availableBalanceKopecks"
    + GREATEST(w."overageLimitKopecks" - w."overageUsedKopecks", 0)
    - w."reservedBalanceKopecks"
  FROM "ai_wallet" w
  WHERE w.id = p_wallet_id;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- reserve_ai_credits
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION reserve_ai_credits(
  p_wallet_id          text,
  p_user_id            text,
  p_organization_id    text,
  p_project_id         text,
  p_api_key_id         text,
  p_operation          text,
  p_estimated_kopecks  bigint,
  p_idempotency_key    text,
  p_metadata           jsonb,
  p_reservation_ttl    interval DEFAULT interval '5 minutes'
)
RETURNS TABLE (reservation_id text, available_kopecks bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet         "ai_wallet"%ROWTYPE;
  v_existing_resv  text;
  v_reservation_id text;
  v_spendable      bigint;
BEGIN
  IF p_estimated_kopecks <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = 'P0001';
  END IF;

  -- Idempotency: if a reserve transaction with this key already exists, return it
  SELECT t."reservationId" INTO v_existing_resv
  FROM "ai_wallet_transaction" t
  WHERE t."idempotencyKey" = p_idempotency_key
    AND t.type = 'reserve'
  LIMIT 1;

  IF v_existing_resv IS NOT NULL THEN
    SELECT id, ai_wallet_spendable_kopecks(id)
      INTO v_reservation_id, v_spendable
    FROM "ai_quota_reservation"
    WHERE id = v_existing_resv;
    RETURN QUERY SELECT v_existing_resv, v_spendable;
    RETURN;
  END IF;

  -- Lock wallet row
  SELECT * INTO v_wallet
  FROM "ai_wallet"
  WHERE id = p_wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_wallet.status <> 'active' THEN
    RAISE EXCEPTION 'WALLET_FROZEN:%', v_wallet.status USING ERRCODE = 'P0003';
  END IF;

  -- Compute spendable
  v_spendable := ai_wallet_spendable_kopecks(v_wallet.id);

  IF v_spendable < p_estimated_kopecks THEN
    RAISE EXCEPTION 'AI_WALLET_INSUFFICIENT_FUNDS:%:%',
      p_estimated_kopecks, v_spendable USING ERRCODE = 'P0004';
  END IF;

  -- Create reservation
  v_reservation_id := gen_random_uuid()::text;

  INSERT INTO "ai_quota_reservation"(
    id, "walletId", "userId", "organizationId", "projectId", "apiKeyId",
    operation, "estimatedAmountKopecks", status, "expiresAt", metadata, "createdAt"
  ) VALUES (
    v_reservation_id, v_wallet.id, p_user_id, p_organization_id, p_project_id, p_api_key_id,
    p_operation, p_estimated_kopecks, 'active', now() + p_reservation_ttl, p_metadata, now()
  );

  -- Bump reserved balance
  UPDATE "ai_wallet"
    SET "reservedBalanceKopecks" = "reservedBalanceKopecks" + p_estimated_kopecks,
        "updatedAt" = now()
    WHERE id = v_wallet.id;

  -- Ledger entry
  INSERT INTO "ai_wallet_transaction"(
    id, "walletId", "userId", "organizationId", "projectId",
    type, direction, "amountKopecks", currency, source,
    "reservationId", "idempotencyKey", metadata, "createdAt"
  ) VALUES (
    gen_random_uuid()::text, v_wallet.id, p_user_id, p_organization_id, p_project_id,
    'reserve', 'reserve', p_estimated_kopecks, v_wallet.currency, 'reservation',
    v_reservation_id, p_idempotency_key, p_metadata, now()
  );

  RETURN QUERY SELECT v_reservation_id, v_spendable - p_estimated_kopecks;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- commit_ai_usage
--   1. Locks reservation + wallet
--   2. Idempotent via p_idempotency_key on ai_usage_event
--   3. Applies spending order: included → promo → prepaid → overage
--   4. Releases unused part of reservation
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION commit_ai_usage(
  p_reservation_id          text,
  p_idempotency_key         text,
  p_provider                text,
  p_model                   text,
  p_pricing_rule_id         text,
  p_prompt_tokens           int,
  p_completion_tokens       int,
  p_input_cost_kopecks      bigint,
  p_output_cost_kopecks     bigint,
  p_flat_fee_kopecks        bigint,
  p_markup_bps              int,
  p_total_charge_kopecks    bigint,
  p_provider_cost_usd_micros bigint,
  p_fx_rate_micros          bigint,
  p_request_id              text,
  p_status                  text,
  p_metadata                jsonb
)
RETURNS TABLE (
  usage_event_id  text,
  charged_kopecks bigint,
  remaining       bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation       "ai_quota_reservation"%ROWTYPE;
  v_wallet            "ai_wallet"%ROWTYPE;
  v_usage_id          text;
  v_remaining_charge  bigint;
  v_use_from          bigint;
  v_release_amount    bigint;
  v_existing_usage_id text;
BEGIN
  -- Idempotency: existing event with same key
  SELECT id INTO v_existing_usage_id
  FROM "ai_usage_event"
  WHERE "idempotencyKey" = p_idempotency_key;

  IF v_existing_usage_id IS NOT NULL THEN
    RETURN QUERY
      SELECT v_existing_usage_id,
             (SELECT "totalChargeKopecks" FROM "ai_usage_event" WHERE id = v_existing_usage_id),
             (SELECT ai_wallet_spendable_kopecks((SELECT "walletId" FROM "ai_usage_event" WHERE id = v_existing_usage_id)));
    RETURN;
  END IF;

  -- Lock reservation
  SELECT * INTO v_reservation
  FROM "ai_quota_reservation"
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVATION_NOT_FOUND' USING ERRCODE = 'P0010';
  END IF;

  IF v_reservation.status <> 'active' THEN
    RAISE EXCEPTION 'RESERVATION_NOT_ACTIVE:%', v_reservation.status USING ERRCODE = 'P0011';
  END IF;

  -- Lock wallet
  SELECT * INTO v_wallet FROM "ai_wallet" WHERE id = v_reservation."walletId" FOR UPDATE;

  -- Spending order: included → promo → prepaid → overage
  v_remaining_charge := p_total_charge_kopecks;

  -- 1. included monthly
  v_use_from := LEAST(
    v_remaining_charge,
    GREATEST(v_wallet."includedMonthlyLimitKopecks" - v_wallet."includedUsedPeriodKopecks", 0)
  );
  IF v_use_from > 0 THEN
    UPDATE "ai_wallet"
      SET "includedUsedPeriodKopecks" = "includedUsedPeriodKopecks" + v_use_from,
          "updatedAt" = now()
      WHERE id = v_wallet.id;
    INSERT INTO "ai_wallet_transaction"(
      id, "walletId", "userId", "organizationId", "projectId",
      type, direction, "amountKopecks", currency, source,
      "reservationId", "idempotencyKey", metadata, "createdAt"
    ) VALUES (
      gen_random_uuid()::text, v_wallet.id, v_reservation."userId", v_reservation."organizationId",
      v_reservation."projectId", 'debit', 'debit', v_use_from, v_wallet.currency, 'included',
      p_reservation_id, p_idempotency_key || ':included', NULL, now()
    );
    v_remaining_charge := v_remaining_charge - v_use_from;
  END IF;

  -- 2. promo
  v_use_from := LEAST(v_remaining_charge, v_wallet."promoBalanceKopecks");
  IF v_use_from > 0 THEN
    UPDATE "ai_wallet"
      SET "promoBalanceKopecks" = "promoBalanceKopecks" - v_use_from,
          "updatedAt" = now()
      WHERE id = v_wallet.id;
    INSERT INTO "ai_wallet_transaction"(
      id, "walletId", "userId", "organizationId", "projectId",
      type, direction, "amountKopecks", currency, source,
      "reservationId", "idempotencyKey", metadata, "createdAt"
    ) VALUES (
      gen_random_uuid()::text, v_wallet.id, v_reservation."userId", v_reservation."organizationId",
      v_reservation."projectId", 'debit', 'debit', v_use_from, v_wallet.currency, 'promo',
      p_reservation_id, p_idempotency_key || ':promo', NULL, now()
    );
    v_remaining_charge := v_remaining_charge - v_use_from;
  END IF;

  -- 3. prepaid
  v_use_from := LEAST(v_remaining_charge, v_wallet."availableBalanceKopecks");
  IF v_use_from > 0 THEN
    UPDATE "ai_wallet"
      SET "availableBalanceKopecks" = "availableBalanceKopecks" - v_use_from,
          "updatedAt" = now()
      WHERE id = v_wallet.id;
    INSERT INTO "ai_wallet_transaction"(
      id, "walletId", "userId", "organizationId", "projectId",
      type, direction, "amountKopecks", currency, source,
      "reservationId", "idempotencyKey", metadata, "createdAt"
    ) VALUES (
      gen_random_uuid()::text, v_wallet.id, v_reservation."userId", v_reservation."organizationId",
      v_reservation."projectId", 'debit', 'debit', v_use_from, v_wallet.currency, 'prepaid',
      p_reservation_id, p_idempotency_key || ':prepaid', NULL, now()
    );
    v_remaining_charge := v_remaining_charge - v_use_from;
  END IF;

  -- 4. overage (if enabled)
  IF v_remaining_charge > 0 THEN
    v_use_from := LEAST(
      v_remaining_charge,
      GREATEST(v_wallet."overageLimitKopecks" - v_wallet."overageUsedKopecks", 0)
    );
    IF v_use_from > 0 THEN
      UPDATE "ai_wallet"
        SET "overageUsedKopecks" = "overageUsedKopecks" + v_use_from,
            "updatedAt" = now()
        WHERE id = v_wallet.id;
      INSERT INTO "ai_wallet_transaction"(
        id, "walletId", "userId", "organizationId", "projectId",
        type, direction, "amountKopecks", currency, source,
        "reservationId", "idempotencyKey", metadata, "createdAt"
      ) VALUES (
        gen_random_uuid()::text, v_wallet.id, v_reservation."userId", v_reservation."organizationId",
        v_reservation."projectId", 'debit', 'debit', v_use_from, v_wallet.currency, 'overage',
        p_reservation_id, p_idempotency_key || ':overage', NULL, now()
      );
      v_remaining_charge := v_remaining_charge - v_use_from;
    END IF;
  END IF;

  IF v_remaining_charge > 0 THEN
    -- Should not happen if reserve was correct, but guard
    RAISE EXCEPTION 'AI_WALLET_INSUFFICIENT_AT_COMMIT:%', v_remaining_charge USING ERRCODE = 'P0012';
  END IF;

  -- Release the entire reservation amount, then re-debit only what was actually charged
  -- (simpler: subtract reservation, charges already moved to actual sources)
  UPDATE "ai_wallet"
    SET "reservedBalanceKopecks" = "reservedBalanceKopecks" - v_reservation."estimatedAmountKopecks",
        "updatedAt" = now()
    WHERE id = v_wallet.id;

  v_release_amount := v_reservation."estimatedAmountKopecks" - p_total_charge_kopecks;

  -- Mark reservation committed
  UPDATE "ai_quota_reservation"
    SET status = 'committed', "committedAt" = now()
    WHERE id = p_reservation_id;

  -- Insert usage event
  v_usage_id := gen_random_uuid()::text;
  INSERT INTO "ai_usage_event"(
    id, "walletId", "userId", "organizationId", "projectId", "apiKeyId",
    "reservationId", operation, provider, model, status,
    "promptTokens", "completionTokens", "totalTokens",
    "inputCostKopecks", "outputCostKopecks", "flatFeeKopecks",
    "markupBps", "totalChargeKopecks",
    "providerCostUsdMicros", "fxRateRubPerUsdMicros",
    "pricingRuleId", "requestId", "idempotencyKey", metadata, "createdAt"
  ) VALUES (
    v_usage_id, v_wallet.id, v_reservation."userId", v_reservation."organizationId",
    v_reservation."projectId", v_reservation."apiKeyId",
    p_reservation_id, v_reservation.operation, p_provider, p_model, p_status,
    p_prompt_tokens, p_completion_tokens, p_prompt_tokens + p_completion_tokens,
    p_input_cost_kopecks, p_output_cost_kopecks, p_flat_fee_kopecks,
    p_markup_bps, p_total_charge_kopecks,
    p_provider_cost_usd_micros, p_fx_rate_micros,
    p_pricing_rule_id, p_request_id, p_idempotency_key, p_metadata, now()
  );

  RETURN QUERY SELECT v_usage_id, p_total_charge_kopecks, ai_wallet_spendable_kopecks(v_wallet.id);
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- release_ai_reservation (idempotent)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION release_ai_reservation(
  p_reservation_id  text,
  p_idempotency_key text,
  p_reason          text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation "ai_quota_reservation"%ROWTYPE;
BEGIN
  IF EXISTS (SELECT 1 FROM "ai_wallet_transaction" WHERE "idempotencyKey" = p_idempotency_key) THEN
    RETURN;
  END IF;

  SELECT * INTO v_reservation FROM "ai_quota_reservation" WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVATION_NOT_FOUND' USING ERRCODE = 'P0020';
  END IF;
  IF v_reservation.status <> 'active' THEN
    -- already committed or released — no-op
    RETURN;
  END IF;

  UPDATE "ai_wallet"
    SET "reservedBalanceKopecks" = GREATEST("reservedBalanceKopecks" - v_reservation."estimatedAmountKopecks", 0),
        "updatedAt" = now()
    WHERE id = v_reservation."walletId";

  UPDATE "ai_quota_reservation"
    SET status = 'released', "releasedAt" = now()
    WHERE id = p_reservation_id;

  INSERT INTO "ai_wallet_transaction"(
    id, "walletId", "userId", "organizationId", "projectId",
    type, direction, "amountKopecks", currency, source,
    "reservationId", "idempotencyKey", metadata, "createdAt"
  ) VALUES (
    gen_random_uuid()::text, v_reservation."walletId",
    v_reservation."userId", v_reservation."organizationId", v_reservation."projectId",
    'release', 'release', v_reservation."estimatedAmountKopecks", 'RUB', 'reservation',
    p_reservation_id, p_idempotency_key, jsonb_build_object('reason', p_reason), now()
  );
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- expire_stale_reservations (called by trigger.dev cron every 60s)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION expire_stale_reservations()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r       record;
BEGIN
  FOR r IN
    SELECT id FROM "ai_quota_reservation"
    WHERE status = 'active' AND "expiresAt" < now()
    FOR UPDATE SKIP LOCKED
    LIMIT 500
  LOOP
    PERFORM release_ai_reservation(
      r.id,
      'expire:' || r.id,
      'expired'
    );
    UPDATE "ai_quota_reservation" SET status = 'expired' WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- apply_topup_credit (called by walletWebhookHandler)
-- Idempotent via wallet_topup_order.providerOperationId
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION apply_topup_credit(
  p_provider_operation_id text,
  p_provider_payment_id   text,
  p_amount_kopecks        bigint,
  p_event_id              text
)
RETURNS TABLE (order_id text, applied boolean, new_balance bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order  "wallet_topup_order"%ROWTYPE;
  v_wallet "ai_wallet"%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM "wallet_topup_order"
    WHERE "providerOperationId" = p_provider_operation_id
       OR "providerPaymentId"   = p_provider_payment_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOPUP_ORDER_NOT_FOUND' USING ERRCODE = 'P0030';
  END IF;

  IF v_order.status = 'paid' THEN
    -- already credited — return current state
    SELECT * INTO v_wallet FROM "ai_wallet" WHERE id = v_order."walletId";
    RETURN QUERY SELECT v_order.id, false, v_wallet."availableBalanceKopecks";
    RETURN;
  END IF;

  IF v_order."amountKopecks" <> p_amount_kopecks THEN
    RAISE EXCEPTION 'TOPUP_AMOUNT_MISMATCH:expected=%,got=%',
      v_order."amountKopecks", p_amount_kopecks USING ERRCODE = 'P0031';
  END IF;

  -- Lock + credit wallet
  SELECT * INTO v_wallet FROM "ai_wallet" WHERE id = v_order."walletId" FOR UPDATE;

  UPDATE "ai_wallet"
    SET "availableBalanceKopecks" = "availableBalanceKopecks" + p_amount_kopecks,
        "updatedAt" = now()
    WHERE id = v_wallet.id;

  -- Mark order as paid
  UPDATE "wallet_topup_order"
    SET status = 'paid',
        "paidAt" = now(),
        "providerOperationId" = COALESCE("providerOperationId", p_provider_operation_id),
        "updatedAt" = now()
    WHERE id = v_order.id;

  -- Ledger entry
  INSERT INTO "ai_wallet_transaction"(
    id, "walletId", "userId", "organizationId",
    type, direction, "amountKopecks", currency, source,
    "topupOrderId", "idempotencyKey", metadata, "createdAt"
  ) VALUES (
    gen_random_uuid()::text, v_wallet.id, v_order."userId", v_order."organizationId",
    'credit', 'credit', p_amount_kopecks, v_wallet.currency, v_order.provider,
    v_order.id,
    'topup:' || v_order.id || ':' || p_provider_operation_id,
    jsonb_build_object('eventId', p_event_id, 'providerPaymentId', p_provider_payment_id),
    now()
  );

  -- Link event to order for audit
  UPDATE "payment_provider_event"
    SET "topupOrderId" = v_order.id
    WHERE id = p_event_id;

  SELECT * INTO v_wallet FROM "ai_wallet" WHERE id = v_wallet.id;
  RETURN QUERY SELECT v_order.id, true, v_wallet."availableBalanceKopecks";
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- admin_adjust_wallet (manual credit/debit by superadmin)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION admin_adjust_wallet(
  p_wallet_id      text,
  p_amount_kopecks bigint,
  p_direction      text,
  p_reason         text,
  p_admin_user_id  text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet "ai_wallet"%ROWTYPE;
  v_idem   text;
BEGIN
  IF p_direction NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'INVALID_DIRECTION' USING ERRCODE = 'P0040';
  END IF;
  IF length(p_reason) < 10 THEN
    RAISE EXCEPTION 'REASON_TOO_SHORT' USING ERRCODE = 'P0041';
  END IF;

  v_idem := 'admin:' || p_admin_user_id || ':' || gen_random_uuid()::text;

  SELECT * INTO v_wallet FROM "ai_wallet" WHERE id = p_wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND' USING ERRCODE = 'P0042';
  END IF;

  IF p_direction = 'credit' THEN
    UPDATE "ai_wallet"
      SET "availableBalanceKopecks" = "availableBalanceKopecks" + p_amount_kopecks,
          "updatedAt" = now()
      WHERE id = v_wallet.id;
  ELSE
    UPDATE "ai_wallet"
      SET "availableBalanceKopecks" = GREATEST("availableBalanceKopecks" - p_amount_kopecks, 0),
          "updatedAt" = now()
      WHERE id = v_wallet.id;
  END IF;

  INSERT INTO "ai_wallet_transaction"(
    id, "walletId", "userId", "organizationId",
    type, direction, "amountKopecks", currency, source,
    "idempotencyKey", metadata, "createdAt"
  ) VALUES (
    gen_random_uuid()::text, v_wallet.id, v_wallet."userId", v_wallet."organizationId",
    'adjustment', p_direction, p_amount_kopecks, v_wallet.currency, 'manual',
    v_idem,
    jsonb_build_object('adminUserId', p_admin_user_id, 'reason', p_reason),
    now()
  );

  SELECT * INTO v_wallet FROM "ai_wallet" WHERE id = p_wallet_id;
  RETURN v_wallet."availableBalanceKopecks";
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- apply_subscription_to_wallet (called from payment webhook sync hook)
-- Auto-creates wallet if missing, sets included monthly limit by plan
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION apply_subscription_to_wallet(
  p_organization_id        text,
  p_user_id                text,
  p_plan_id                text,
  p_subscription_id        text,
  p_included_kopecks       bigint
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id text;
  v_period_start timestamp;
  v_period_end   timestamp;
  v_idem text := 'sub-sync:' || p_subscription_id || ':' || date_trunc('month', now())::text;
BEGIN
  IF (p_organization_id IS NULL) = (p_user_id IS NULL) THEN
    RAISE EXCEPTION 'OWNER_REQUIRED_XOR' USING ERRCODE = 'P0050';
  END IF;

  v_period_start := date_trunc('month', now());
  v_period_end   := v_period_start + interval '1 month';

  -- Idempotency: skip if same sub already applied this period
  IF EXISTS (
    SELECT 1 FROM "ai_wallet_transaction"
    WHERE "idempotencyKey" = v_idem
  ) THEN
    SELECT id INTO v_wallet_id
    FROM "ai_wallet"
    WHERE (p_organization_id IS NOT NULL AND "organizationId" = p_organization_id)
       OR (p_user_id         IS NOT NULL AND "userId"         = p_user_id);
    RETURN v_wallet_id;
  END IF;

  -- Upsert wallet
  IF p_organization_id IS NOT NULL THEN
    SELECT id INTO v_wallet_id FROM "ai_wallet" WHERE "organizationId" = p_organization_id FOR UPDATE;
  ELSE
    SELECT id INTO v_wallet_id FROM "ai_wallet" WHERE "userId" = p_user_id FOR UPDATE;
  END IF;

  IF v_wallet_id IS NULL THEN
    v_wallet_id := gen_random_uuid()::text;
    INSERT INTO "ai_wallet"(
      id, "userId", "organizationId", currency,
      "includedMonthlyLimitKopecks", "periodStart", "periodEnd",
      "createdAt", "updatedAt"
    ) VALUES (
      v_wallet_id, p_user_id, p_organization_id, 'RUB',
      p_included_kopecks, v_period_start, v_period_end,
      now(), now()
    );
  ELSE
    UPDATE "ai_wallet"
      SET "includedMonthlyLimitKopecks" = p_included_kopecks,
          "includedUsedPeriodKopecks"   = CASE
            WHEN "periodEnd" < now() THEN 0
            ELSE "includedUsedPeriodKopecks"
          END,
          "periodStart" = CASE WHEN "periodEnd" < now() THEN v_period_start ELSE "periodStart" END,
          "periodEnd"   = CASE WHEN "periodEnd" < now() THEN v_period_end   ELSE "periodEnd"   END,
          "updatedAt"   = now()
      WHERE id = v_wallet_id;
  END IF;

  -- Audit ledger entry (no balance impact, just a marker)
  INSERT INTO "ai_wallet_transaction"(
    id, "walletId", "userId", "organizationId",
    type, direction, "amountKopecks", currency, source,
    "idempotencyKey", metadata, "createdAt"
  ) VALUES (
    gen_random_uuid()::text, v_wallet_id, p_user_id, p_organization_id,
    'adjustment', 'credit', 0, 'RUB', 'subscription',
    v_idem,
    jsonb_build_object('planId', p_plan_id, 'subscriptionId', p_subscription_id, 'includedKopecks', p_included_kopecks),
    now()
  );

  RETURN v_wallet_id;
END;
$$;

-- ─── Comments for posterity ───
COMMENT ON FUNCTION reserve_ai_credits IS 'Reserves estimated AI cost before provider call. Atomic. Idempotent via reserve transaction key.';
COMMENT ON FUNCTION commit_ai_usage    IS 'Applies actual charge using spending order: included → promo → prepaid → overage. Idempotent.';
COMMENT ON FUNCTION release_ai_reservation IS 'Returns reserved kopecks back to wallet. Idempotent.';
COMMENT ON FUNCTION expire_stale_reservations IS 'Cron-safe batch release of expired reservations.';
COMMENT ON FUNCTION apply_topup_credit IS 'Webhook-safe credit. Idempotent via providerOperationId.';
COMMENT ON FUNCTION admin_adjust_wallet IS 'Superadmin manual credit/debit. Requires reason ≥ 10 chars.';
COMMENT ON FUNCTION apply_subscription_to_wallet IS 'Sync included monthly credits from subscription event. Auto-creates wallet.';
