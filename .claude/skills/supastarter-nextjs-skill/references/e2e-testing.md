# E2E Testing (Next.js)

Playwright in supastarter Next.js (split-app monorepo).

## Layout

Each app keeps its own Playwright suite + config:

```
apps/saas/playwright.config.ts
apps/saas/tests/                # tests for SaaS flows (auth, onboarding, billing, etc.)

apps/marketing/playwright.config.ts
apps/marketing/tests/           # tests for marketing pages (home, blog, contact)
```

There is also `apps/saas/vitest.config.ts` and `apps/marketing/vitest.config.ts` for unit tests where present.

## Run

```bash
# All apps via Turbo
pnpm test

# Specific app
pnpm --filter saas test
pnpm --filter marketing test

# Or run Playwright directly
pnpm --filter saas exec playwright test
pnpm --filter saas exec playwright test --headed
pnpm --filter saas exec playwright test --ui
```

## Patterns

- **Critical flows first**: auth (signup/login/logout/passkey), onboarding, organization invitation acceptance, checkout return, settings updates.
- Run against `pnpm dev` (or a separate test build) — configure `webServer` in `playwright.config.ts` to start the right app.
- Hit a clean DB per test run, or seed and clean up. With Docker: `docker compose down -v && docker compose up -d && pnpm --filter @repo/database push` between runs.
- Use `data-testid` attributes sparingly; prefer accessible roles/labels from Radix/shadcn primitives.

## Auth in tests

Implement a `signIn` helper that hits the Better Auth credentials/email endpoint and stores the session cookie, then reuse it across tests via Playwright `storageState`.

## Docs

- [E2E testing](https://supastarter.dev/docs/nextjs/e2e)
- Playwright: <https://playwright.dev>
