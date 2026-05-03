import { db } from "@repo/database";
import { logger } from "@repo/logs";

import { parsePgRpcError } from "./parse-pg-error";

export interface ApplySubscriptionInput {
	organizationId: string | null;
	userId: string | null;
	planId: string;
	subscriptionId: string;
	includedKopecks: bigint;
}

/**
 * Apply subscription's included monthly credits to the wallet.
 * Idempotent per (subscriptionId, current calendar month).
 *
 * Caller is responsible for resolving planId and includedKopecks
 * (typically from `@repo/payments` config) — keeps `@repo/billing-wallet`
 * decoupled from any specific payment provider.
 */
export async function applySubscriptionToWallet(
	input: ApplySubscriptionInput,
): Promise<string | null> {
	if ((input.organizationId == null) === (input.userId == null)) {
		throw new Error("OWNER_REQUIRED_XOR: either organizationId or userId must be set, not both");
	}

	try {
		const rows = await db.$queryRaw<Array<{ apply_subscription_to_wallet: string | null }>>`
			SELECT apply_subscription_to_wallet(
				${input.organizationId}::text,
				${input.userId}::text,
				${input.planId}::text,
				${input.subscriptionId}::text,
				${input.includedKopecks}::bigint
			)
		`;
		return rows[0]?.apply_subscription_to_wallet ?? null;
	} catch (err) {
		logger.error("apply_subscription_to_wallet failed", parsePgRpcError(err));
		throw parsePgRpcError(err);
	}
}
