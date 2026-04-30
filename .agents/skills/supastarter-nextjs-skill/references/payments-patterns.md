# Payments Patterns (Next.js)

Payments, webhooks, and subscriptions in supastarter Next.js.

## Patterns

- **Provider config**: `packages/payments/config.ts`.
- **Supported providers**: Stripe, LemonSqueezy, Polar, Creem, DodoPayments.
- **Webhooks**: implement provider-specific handlers under API routes/procedures; always verify webhook signatures.
- **Billing UI**: SaaS app settings pages under `apps/saas/`.
- **Plans / products**: define canonical plans in shared config and map to provider product IDs.

## Key Paths

- Payment config: `packages/payments/config.ts`
- Payment exports: `packages/payments/index.ts`
- API integration: `packages/api/modules/` and `apps/saas/app/api/`

## Docs

- [Payments overview](https://supastarter.dev/docs/nextjs/payments/overview)
- [Plans / products](https://supastarter.dev/docs/nextjs/payments/plans)
- [Check purchases](https://supastarter.dev/docs/nextjs/payments/check-purchases)
- [Paywall](https://supastarter.dev/docs/nextjs/payments/paywall)
- [Providers index](https://supastarter.dev/docs/nextjs/payments/providers/stripe)
