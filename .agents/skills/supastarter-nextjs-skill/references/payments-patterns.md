# Payments Patterns (Next.js)

supastarter Next.js ships **five payment providers**. Pick one per project. Plus support for **usage-based billing** on top.

## Supported providers

| Provider     | Docs                                                                  |
| ------------ | --------------------------------------------------------------------- |
| Stripe       | <https://supastarter.dev/docs/nextjs/payments/providers/stripe>       |
| Lemonsqueezy | <https://supastarter.dev/docs/nextjs/payments/providers/lemonsqueezy> |
| Polar        | <https://supastarter.dev/docs/nextjs/payments/providers/polar>        |
| Creem        | <https://supastarter.dev/docs/nextjs/payments/providers/creem>        |
| DodoPayments | <https://supastarter.dev/docs/nextjs/payments/providers/dodopayments> |

Each provider has a driver in `packages/payments/provider/<name>/` and is selected in `packages/payments/config.ts`.

## Webhook URL (unified)

All providers post to **the same path**:

```
${NEXT_PUBLIC_SAAS_URL}/api/webhooks/payments
```

The handler routes by provider based on the active config + signature. Set the matching `*_WEBHOOK_SECRET` env var. For local testing, expose port 3000 with ngrok: `ngrok http 3000`, then use `https://<id>.ngrok-free.app/api/webhooks/payments`.

## Env keys

```env
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Lemonsqueezy
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_STORE_ID=

# Polar
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=

# Creem
CREEM_API_KEY=
CREEM_WEBHOOK_SECRET=

# DodoPayments
DODO_PAYMENTS_API_KEY=

# Plan price IDs (server-only — do not expose to client)
PRICE_ID_PRO_MONTHLY=
PRICE_ID_PRO_YEARLY=
PRICE_ID_LIFETIME=
```

## Plans config

`packages/payments/config.ts` is the source of truth for plans, prices, locales and the active provider. Real shape (Polar example):

```typescript
export const config = {
	plans: {
		pro: {
			recommended: true,
			prices: [
				{
					type: "subscription", // or "one-time"
					priceId: process.env.PRICE_ID_PRO_MONTHLY as string,
					interval: "month",
					amount: 29,
					currency: "USD",
					seatBased: true, // for org-level seat pricing
					trialPeriodDays: 7,
				},
				{
					type: "subscription",
					priceId: process.env.PRICE_ID_PRO_YEARLY as string,
					interval: "year",
					amount: 290,
					currency: "USD",
					seatBased: true,
					trialPeriodDays: 7,
				},
			],
		},
	},
	locales: {
		en: { currency: "USD", language: "en" },
		de: { currency: "EUR", language: "de" },
	},
};
```

Notes:

- `priceId` always references provider-side product/price IDs — keep them server-only.
- `seatBased` enables per-seat billing for organizations (when org-level billing is on).
- `trialPeriodDays` works on subscription plans where the provider supports it.
- Use real production price IDs only on prod; sandbox/test IDs in dev/staging.

## Provider-specific notes

### Polar

- Token: Polar dashboard → Settings → Developers → New token (all scopes recommended).
- Webhook events to subscribe: `order.created`, `subscription.created`, `subscription.updated`, `subscription.canceled`.
- Use sandbox products in dev; switch to live before deploy.

### Stripe

- Use Stripe CLI for local webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/payments`.
- Test mode keys (`sk_test_*`) → live keys (`sk_live_*`) on switchover.

### Lemonsqueezy / Creem / DodoPayments

- Each has its own dashboard for products + webhooks. Same unified webhook URL.
- Lemonsqueezy needs `LEMONSQUEEZY_STORE_ID`.

## API procedures

`packages/api/modules/payments/` contains:

- `checkout` — create checkout session / redirect URL
- `portal` — open the customer billing portal
- `plans` — list plans (server-side resolves prices to provider data)
- helpers for the active provider

## Frontend

- Plan selection: `apps/saas/app/(authenticated)/choose-plan/`
- Billing UI: `apps/saas/modules/payments/components/`
- Hooks: `apps/saas/modules/payments/hooks/`
- Server-side helpers: `apps/saas/modules/payments/lib/`
- After-checkout return: `apps/saas/app/(authenticated)/checkout-return/`

## Subscription state

The webhook handler updates the user/org's purchase rows in DB. Check active subscription:

```typescript
import { db } from "@repo/database";

const purchases = await db.purchase.findMany({
	where: { userId }, // or organizationId
});
```

For paywalls, gate via Server Component + `redirect("/choose-plan")` if no active purchase. See [paywall docs](https://supastarter.dev/docs/nextjs/payments/paywall).

## Usage-based billing

Supported on top of subscriptions for providers that allow metered usage. Workflow:

1. Track usage events server-side (call provider's "report usage" API after work happens).
2. Surface remaining usage in the UI from your DB or from the provider's API.
3. Enforce limits in oRPC procedures before allowing usage.

Docs: <https://supastarter.dev/docs/nextjs/payments/usage-based-billing>.

## Test mode

Always start in sandbox/test mode. Switch to live keys only after end-to-end checkout, portal, and webhook handling are verified in staging.

## Docs

- [Payments overview](https://supastarter.dev/docs/nextjs/payments/overview)
- [Plans / products](https://supastarter.dev/docs/nextjs/payments/plans)
- [Check purchases](https://supastarter.dev/docs/nextjs/payments/check-purchases)
- [Paywall](https://supastarter.dev/docs/nextjs/payments/paywall)
- [Usage-based billing](https://supastarter.dev/docs/nextjs/payments/usage-based-billing)
- Stripe: <https://stripe.com/docs>
- Lemonsqueezy: <https://docs.lemonsqueezy.com>
- Polar: <https://docs.polar.sh>
- Creem: <https://docs.creem.io>
