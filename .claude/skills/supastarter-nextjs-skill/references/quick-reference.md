# supastarter Quick Reference (Next.js)

Fast command/path lookup aligned with the current split-app monorepo.

## Core Commands

```bash
# install
pnpm install

# run all dev apps
pnpm dev

# typecheck/lint
pnpm run typecheck
pnpm lint

# database (preferred package scope)
pnpm --filter database generate
pnpm --filter database push
```

## Main Paths

- SaaS app: `apps/saas/`
- Marketing app: `apps/marketing/`
- Docs app: `apps/docs/`
- API modules: `packages/api/modules/`
- API root router: `packages/api/orpc/router.ts`
- Database schema: `packages/database/prisma/schema.prisma`
- Database queries: `packages/database/*/queries/`
- Auth package: `packages/auth/`
- Payments config: `packages/payments/config.ts`
- Shared UI: `packages/ui/`

## Feature Checklist

1. Update schema in `packages/database/prisma/schema.prisma`.
2. Run `pnpm --filter database generate` and `pnpm --filter database push`.
3. Add queries in `packages/database/.../queries/`.
4. Add oRPC module in `packages/api/modules/<feature>/`.
5. Implement UI in `apps/saas/modules/` (or marketing module if public).
6. Add i18n messages and validate with typecheck/lint.

## Payments and Tasks

- Providers: Stripe, LemonSqueezy, Polar, Creem, DodoPayments.
- Background jobs docs: qstash, trigger.dev, queuebase.
- Keep provider secrets server-only; never expose webhook secrets or admin keys.

## Docs Shortcuts

- https://supastarter.dev/docs/nextjs
- https://supastarter.dev/docs/nextjs/setup
- https://supastarter.dev/docs/nextjs/configuration
- https://supastarter.dev/docs/nextjs/payments/overview
- https://supastarter.dev/docs/nextjs/tasks/overview
