# Tech Stack (Next.js)

Overview of the supastarter Next.js stack. **Next.js only**; no Vue/Nuxt content.

## Stack Summary

- **Framework**: Next.js (App Router, Route Handlers, Server Actions), React, TypeScript
- **Backend / Data**: **Prisma + Drizzle (both)**, Hono, oRPC, PostgreSQL
- **Auth**: Better Auth (with passkeys, magic links, organizations plugins)
- **Payments**: Stripe / Lemonsqueezy / Polar / Creem / DodoPayments (pick one)
- **Mail**: React Email + Plunk / Resend / Postmark / Mailgun / Nodemailer / Console (dev)
- **Storage**: S3-compatible (AWS S3, R2, MinIO local)
- **UI**: Tailwind CSS v4, Radix UI, shadcn/ui, `cn` helper
- **Forms**: react-hook-form + zod
- **Client data**: TanStack Query via oRPC client
- **Tooling**: Turbo (monorepo), pnpm 10+, **Oxlint + Oxfmt** (NOT Biome/ESLint/Prettier), Playwright for E2E
- **AI**: Vercel AI SDK + provider configs in `packages/ai/`
- **Content**: content-collections (blog/changelog/docs MDX)
- **i18n**: next-intl, 4 locales × 4 scopes

## Apps (split-app monorepo)

- `apps/saas/` — protected SaaS (port 3000)
- `apps/marketing/` — public site (port 3001)
- `apps/docs/` — documentation (port 3002)
- `apps/mail-preview/` — email template preview (port 3003)

## Shared packages

- `packages/api/` — Hono + oRPC
- `packages/auth/` — Better Auth
- `packages/database/` — Prisma + Drizzle
- `packages/notifications/` — in-app + email notifications
- `packages/ai/` — AI integrations
- `packages/mail/` — React Email templates + providers
- `packages/payments/` — payment providers
- `packages/storage/` — S3 client
- `packages/i18n/` — translations + locale config
- `packages/ui/` — shadcn UI components
- `packages/utils/` — shared helpers
- `packages/logs/` — logger

## Tooling

- `tooling/tailwind/theme.css` — Tailwind v4 design tokens (no per-app config)
- `tooling/typescript/` — shared tsconfig
- `tooling/scripts/` — utility scripts

## Runtime

- Node.js ≥ 20, ESM imports

## Docs

- [Tech Stack](https://supastarter.dev/docs/nextjs/tech-stack)
- [Introduction](https://supastarter.dev/docs/nextjs)
