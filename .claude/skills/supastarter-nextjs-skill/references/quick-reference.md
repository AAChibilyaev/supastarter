# supastarter Quick Reference (Next.js)

Quick reference for common supastarter Next.js development tasks and commands. All commands are run from monorepo root unless noted.

## Definition of Done

Before claiming any feature/fix complete, run **all** of these against the changed surface. `tsc --noEmit` alone is **not** "done".

| #   | Check                                                 | Command                                                                    |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | TypeScript across the workspace (not one filter)      | `pnpm type-check`                                                          |
| 2   | Lint clean                                            | `pnpm lint` (fix with `pnpm lint:fix`)                                     |
| 3   | Format clean                                          | `pnpm format:check` (fix with `pnpm format`)                               |
| 4   | Dev server boots without runtime errors               | `pnpm dev` then load the changed route                                     |
| 5   | The actual user-visible behavior works                | open the page / curl the procedure / hit the webhook with a sample payload |
| 6   | A test pinning the new behavior exists or was updated | `pnpm test` (Playwright/Vitest as the package uses)                        |

A change that only passes #1 has 5 ways to be silently broken. Don't say "готово" / "done" / "shipped" until at least #1, #2, #4, #5 are green.

## Initial Setup

```bash
git clone <your-repo>
cd <your-repo>

# Install
pnpm install

# Env (note: .env.local for app dev, .env for Prisma scripts)
cp .env.local.example .env.local
cp .env.local .env

# Configure .env.local — at minimum:
#   DATABASE_URL  (e.g. postgresql://postgres:postgres@localhost:5432/supastarter)
#   BETTER_AUTH_SECRET  (openssl rand -base64 32)
#   NEXT_PUBLIC_SAAS_URL=http://localhost:3000
#   NEXT_PUBLIC_MARKETING_URL=http://localhost:3001
#   NEXT_PUBLIC_DOCS_URL=http://localhost:3002
#   S3_*  (MinIO defaults: minioadmin / minioadmin / http://localhost:9000)

# Local services (Postgres + MinIO + auto-create avatars bucket)
docker compose up -d

# Generate Prisma Client + push schema
pnpm --filter @repo/database generate
pnpm --filter @repo/database push

# Start all dev servers
pnpm dev
```

After `pnpm dev`:

- SaaS app: http://localhost:3000
- Marketing site: http://localhost:3001
- Docs: http://localhost:3002
- Mail-preview: http://localhost:3003
- MinIO console: http://localhost:9001 (minioadmin / minioadmin)

## Common Commands

### Development

```bash
pnpm dev                       # All apps via Turbo
pnpm dev --filter=saas         # SaaS only
pnpm dev --filter=marketing    # Marketing only
pnpm dev --filter=docs         # Docs only
pnpm build                     # Build all
pnpm type-check                # Turbo type-check
pnpm lint                      # Oxlint
pnpm lint:fix                  # Oxlint --fix
pnpm format                    # Oxfmt
pnpm format:check              # Oxfmt --check
pnpm clean                     # Turbo clean
pnpm test                      # Playwright (per app)
```

### Database

Scripts live in `packages/database/package.json`; they read `.env` (not `.env.local`).

```bash
pnpm --filter @repo/database generate   # prisma generate
pnpm --filter @repo/database push       # prisma db push (dev)
pnpm --filter @repo/database migrate    # prisma migrate dev
pnpm --filter @repo/database studio     # prisma studio
```

For Drizzle:

```bash
# Drizzle commands per drizzle-kit setup in packages/database/drizzle/drizzle.config.ts
# typically: pnpm --filter @repo/database drizzle-kit push   (script may need to be added)
```

To reset DB locally:

```bash
docker compose down -v          # Drops postgres + minio volumes
docker compose up -d
pnpm --filter @repo/database push
```

### Mail preview

```bash
pnpm dev --filter=mail-preview  # http://localhost:3003
```

### Docker (local services)

```bash
docker compose up -d            # Postgres (5432), MinIO (9000/9001), avatars bucket
docker compose ps               # status
docker compose logs -f postgres # tail logs
docker compose down             # stop, keep data
docker compose down -v          # stop + drop volumes (RESET)
```

## File Locations Cheat Sheet

### Config

- Root env: `.env.local` (dev), `.env` (for Prisma scripts)
- App config: `apps/saas/config.ts`, `apps/marketing/config.ts`, `apps/docs/config.ts`
- i18n config: `packages/i18n/config.ts`
- Tailwind v4 tokens: `tooling/tailwind/theme.css` (no per-app tailwind.config.ts)

### Database

- Prisma schema: `packages/database/prisma/schema.prisma`
- Prisma queries: `packages/database/prisma/queries/`
- Drizzle schema: `packages/database/drizzle/schema/`
- Drizzle queries: `packages/database/drizzle/queries/`
- Generated Prisma client: `packages/database/prisma/generated/` (do not edit)

### API (oRPC)

- Root router: `packages/api/orpc/router.ts`
- Procedures (public/protected/admin): `packages/api/orpc/procedures.ts`
- Modules: `packages/api/modules/<name>/{types.ts,procedures/,router.ts}`
- Hono entry: `packages/api/index.ts` (mounted in `apps/saas/app/api/[[...rest]]/route.ts`)

### Frontend (SaaS)

- Routes: `apps/saas/app/(unauthenticated)/...`, `apps/saas/app/(authenticated)/...`
- Org-scoped routes: `apps/saas/app/(authenticated)/(main)/(organizations)/[organizationSlug]/`
- Settings: `apps/saas/app/(authenticated)/(main)/(account)/settings/`
- Admin: `apps/saas/app/(authenticated)/(main)/(account)/admin/`
- Modules: `apps/saas/modules/{auth,organizations,settings,payments,admin,ai,onboarding,shared,i18n}/`

### Frontend (Marketing)

- Routes: `apps/marketing/app/[locale]/`
- Modules: `apps/marketing/modules/{home,blog,changelog,legal,shared,analytics,i18n}/`
- Content (MDX): `apps/marketing/content/`

### Authentication

- Better Auth config: `packages/auth/auth.ts`, `packages/auth/config.ts`
- Server helpers: `apps/saas/modules/auth/lib/server.ts` (alias `@auth/lib/server`)
- Client hooks: `apps/saas/modules/auth/hooks/use-session.ts` (alias `@auth/hooks/use-session`)
- UI: `apps/saas/modules/auth/components/`
- Routes: `apps/saas/app/(unauthenticated)/`

### i18n

- Translations: `packages/i18n/translations/{en,de,es,fr}/{mail,marketing,saas,shared}.json`
- Lib: `packages/i18n/lib/` (loaders, helpers)
- Config: `packages/i18n/config.ts` (locales, defaultLocale, cookie name)

### Notifications

- Core: `packages/notifications/{create-notification,list,mark-read,preferences,catalog,types}.ts`
- API: `packages/api/modules/notifications/` (list, unread count, mark read, preferences)
- UI (notification center): `apps/saas/modules/shared/components/`

### Mail

- Templates: `packages/mail/emails/`
- Components: `packages/mail/components/`
- Provider: `packages/mail/provider/` (Plunk, Resend, Postmark, Nodemailer, Mailgun, Console)
- Config: `packages/mail/config.ts`

### Payments

- Provider: `packages/payments/provider/` (Stripe, Lemonsqueezy, Polar, Creem, DodoPayments)
- Webhook handler: `packages/payments/` exports `webhookHandler`, mounted in `packages/api/index.ts`
- Billing UI: `apps/saas/modules/payments/components/`
- Choose-plan flow: `apps/saas/app/(authenticated)/choose-plan/`

### Storage (S3 / MinIO)

- Provider: `packages/storage/provider/`
- Avatars bucket name: env `NEXT_PUBLIC_AVATARS_BUCKET_NAME` (default `avatars`)

## Environment Variables (snapshot)

See [assets/env.example](../assets/env.example) for the full list.

```env
# DB
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/supastarter"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/supastarter"

# URLs (split apps)
NEXT_PUBLIC_SAAS_URL="http://localhost:3000"
NEXT_PUBLIC_MARKETING_URL="http://localhost:3001"
NEXT_PUBLIC_DOCS_URL="http://localhost:3002"

# Better Auth
BETTER_AUTH_SECRET="..."  # openssl rand -base64 32

# Storage (MinIO local)
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
NEXT_PUBLIC_AVATARS_BUCKET_NAME="avatars"
```

## Quick Troubleshooting

### "Cannot find module '@repo/...' or '@auth/...'"

- `pnpm install` from monorepo root.
- Check tsconfig path aliases in `apps/<app>/tsconfig.json`.
- Restart TS server.

### Prisma can't connect / `DATABASE_URL` empty

- Prisma scripts read `.env` (not `.env.local`). Copy: `cp .env.local .env`.
- Check `docker compose ps` — postgres healthy?

### "Prisma Client not generated"

- `pnpm --filter @repo/database generate`
- Restart dev server.

### Better Auth warnings about `clientId`/`clientSecret`

- Expected in dev when `GITHUB_CLIENT_ID` / `GOOGLE_CLIENT_ID` are empty. Email login still works (mail goes to console if no SMTP).

### Build errors / stale state

```bash
pnpm clean
rm -rf node_modules apps/*/.next
pnpm install
pnpm build
```

### Type errors after schema changes

```bash
pnpm --filter @repo/database generate
# Restart TS server in IDE
```

## Common Modifications

### Add a new SaaS page

1. Create file in `apps/saas/app/(authenticated)/(main)/...` or `(account)/...` per App Router.
2. Server Component by default; `"use client"` only when needed.
3. Use `getSession()` from `@auth/lib/server` to gate access.

### Add a new oRPC API module

1. Run `python3 scripts/generate_module.py <name> [--type public|protected|admin]` (from skill `scripts/`).
2. Or manually create `packages/api/modules/<name>/{types.ts, procedures/<action>.ts, router.ts}`.
3. Mount in `packages/api/orpc/router.ts`:
    ```ts
    import { fooRouter } from "../modules/foo/router";
    export const router = publicProcedure.router({ ..., foo: fooRouter });
    ```
4. Use from client: `useQuery(orpc.foo.<action>.queryOptions())`.

### Add a new database model

1. Edit `packages/database/prisma/schema.prisma`.
2. `pnpm --filter @repo/database push` (dev) or `migrate` (prod).
3. `pnpm --filter @repo/database generate` to refresh client.
4. Add queries in `packages/database/prisma/queries/<feature>.ts`.
5. Restart dev server.

### Add a new notification type

1. Add to `NotificationType` enum in `packages/database/prisma/schema.prisma`; push.
2. Update `packages/notifications/types.ts` and `catalog.ts` (group + i18n label key).
3. Add i18n label under `saas.settings.notificationsPage.*` in all 4 locales.
4. Trigger via `createNotification({ userId, type, data?, link? })`.

### Customize UI theme

1. Edit `tooling/tailwind/theme.css` (Tailwind v4 design tokens — there is NO per-app tailwind.config).
2. Override shadcn primitives in `packages/ui/components/<name>.tsx`.

## Production Deployment Checklist

- [ ] Set all env vars in production for **each app**: `apps/saas`, `apps/marketing`, `apps/docs`.
- [ ] Run database migrations: `pnpm --filter @repo/database migrate deploy`.
- [ ] Configure payment provider webhooks → `<saas-url>/api/payments/webhook` (per provider's path).
- [ ] Set up domain + SSL.
- [ ] Configure CORS in `packages/api/index.ts` (`NEXT_PUBLIC_SAAS_URL`).
- [ ] Set up monitoring (Sentry, etc. — see `references/monitoring.md`).
- [ ] Test auth flows (OAuth callbacks must match production URL).
- [ ] Test payment flows in test/sandbox first.
- [ ] Configure email provider (Plunk/Resend/Postmark/Mailgun/SMTP) — empty in dev logs to console.
- [ ] DB backups.
- [ ] Review security headers.
- [ ] Rate limiting if needed.

## Resources

- supastarter docs: <https://supastarter.dev/docs/nextjs>
- Next.js: <https://nextjs.org/docs>
- Prisma: <https://www.prisma.io/docs>
- Drizzle: <https://orm.drizzle.team/docs>
- Hono: <https://hono.dev>
- oRPC: <https://orpc.unnoq.com>
- Better Auth: <https://better-auth.com>
- shadcn/ui: <https://ui.shadcn.com>
- Oxlint: <https://oxc.rs/docs/guide/usage/linter>
