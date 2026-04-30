# Troubleshooting (Next.js)

Common issues for supastarter Next.js (split-app monorepo).

## "Cannot find module '@repo/...' or '@auth/...'"

- Run `pnpm install` from monorepo root. **A newly created workspace package (e.g. `packages/foo`) is invisible until `pnpm install` re-links node_modules** — symptoms: `Cannot find module '@repo/foo'` even though the path is correct in tsconfig.
- Path aliases live in `apps/<app>/tsconfig.json` and per-package `tsconfig.json`. If you added a new alias, add it there.
- Restart the TS server (VS Code: `TypeScript: Restart TS Server`).

## `Edit` tool fails with "String to replace not found" right after a successful Read

This happens when a formatter (Oxfmt) or another agent rewrites the file between your `Read` and `Edit` — even an untracked save can re-tab/normalize quotes. **Symptoms**: the Read showed the exact text, the Edit insists it's missing.

**Fix**: re-`Read` the file immediately before retrying the `Edit`. If two retries fail, switch to a full `Write` of the whole file. Don't loop more than twice — formatter races are deterministic; pick a different anchor string.

## `pnpm --filter <pkg> type-check` passed but the build is broken

`--filter` checks **one** package's tsconfig. It does NOT walk the dep graph. Two failure modes this hides:

1. You added a new export to `@repo/foo`. `@repo/foo` type-checks, but a consumer in `@repo/api` was relying on the old shape.
2. You added a new package and didn't add it to a consumer's `dependencies`. The consumer can't even resolve the import, but its type-check wasn't run.

**Fix**: when changing public exports of any package, run `pnpm type-check` (root, runs Turbo across the workspace) or at least the immediate consumers (`@repo/api`, `apps/saas`).

## DB connection / `DATABASE_URL` is empty in Prisma scripts

- Prisma scripts use `dotenv -c -e ../../.env`, which reads `.env` (NOT `.env.local`).
- Fix: `cp .env.local .env`.
- Verify Postgres is up: `docker compose ps`. Health-check should be `healthy`.

## "Prisma Client not generated"

```bash
pnpm --filter @repo/database generate
```

Then restart the dev server. After every schema change, push/migrate AND regenerate.

## Better Auth warns: "Social provider X is missing clientId or clientSecret"

Expected in dev when `GITHUB_CLIENT_ID` / `GOOGLE_CLIENT_ID` are blank. Email/password and magic link still work. Set the env vars when you're ready to enable OAuth.

## Emails don't arrive

In dev with no mail provider configured, emails go to the `pnpm dev` console (search `[mail]`). To send real mail, set one of `PLUNK_API_KEY` / `RESEND_API_KEY` / `POSTMARK_SERVER_TOKEN` / `MAILGUN_*` / SMTP `MAIL_*`. Always set `MAIL_FROM`.

## Webhook payload is invalid / signature mismatch

- Check the `*_WEBHOOK_SECRET` env matches the secret in the provider dashboard.
- Webhook URL must be reachable (use `ngrok`/`cloudflared` in dev to expose `localhost:3000`).
- Test events from the provider dashboard before going live.

## `pnpm dev` starts but a port is already in use

- 3000–3003 are used by saas / marketing / docs / mail-preview; 9000–9001 by MinIO; 5432 by Postgres.
- `lsof -i :3000` (macOS/Linux) → `kill <pid>`.
- Or change ports in each app's `package.json` `dev` script.

## i18n key shows as raw key in UI

- Make sure the key exists in **all four** locale files for the relevant scope (`mail/marketing/saas/shared.json` × `en/de/es/fr`).
- Check the scope: SaaS-only key must be in `saas.json`, not `marketing.json`.
- For Server Components, ensure `setRequestLocale(locale)` was called in the layout/page.

## Build errors / stale state

```bash
pnpm clean
rm -rf node_modules apps/*/.next
pnpm install
pnpm --filter @repo/database generate
pnpm build
```

## Type errors after Prisma schema change

```bash
pnpm --filter @repo/database generate
# Restart TS server
```

## Notification doesn't show / settings page misses a type

The catalog has 4 places to keep in sync — Prisma enum, `packages/notifications/types.ts`, `packages/notifications/catalog.ts`, and i18n labels. See `references/notifications-patterns.md`.

## Lint errors complain about Biome / ESLint configs

This project uses **Oxlint + Oxfmt**, not Biome and not ESLint+Prettier. Configs: `.oxlintrc.json`, `.oxfmtrc.json`. Run `pnpm lint:fix` and `pnpm format`.

## Docs

- [Troubleshooting](https://supastarter.dev/docs/nextjs/troubleshooting)
