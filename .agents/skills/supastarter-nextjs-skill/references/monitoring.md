# Monitoring (Next.js)

Error tracking and logging in supastarter Next.js.

## Logging

Structured logging is centralized in `packages/logs/` and exported as `@repo/logs`. The Hono app in `packages/api/index.ts` uses it via `logger.log`. Use it everywhere instead of `console.log`:

```typescript
import { logger } from "@repo/logs";

logger.info("Feedback created", { id, userId });
logger.error("Webhook signature mismatch", { provider });
```

## Error boundaries

Per-app:

- `apps/saas/app/error.tsx` — runtime errors in protected segment
- `apps/saas/app/global-error.tsx` — global fallback (incl. root layout errors)
- `apps/marketing/app/[locale]/error.tsx` — marketing errors
- `apps/saas/app/not-found.tsx`, etc.

## Sentry / external monitoring

supastarter doesn't ship Sentry by default; integrate per-app:

1. `pnpm --filter saas add @sentry/nextjs` (and same for marketing/docs as needed).
2. Run `npx @sentry/wizard@latest -i nextjs` in each app.
3. Set `SENTRY_DSN` (server) and `NEXT_PUBLIC_SENTRY_DSN` (client) env vars per app.
4. Wrap `next.config.ts` with `withSentryConfig`.
5. Optionally tie into the logger by piping `logger.error` through `Sentry.captureException`.

## Health checks

Add a health endpoint when needed:

```typescript
// apps/saas/app/api/health/route.ts
import { db } from "@repo/database";

export async function GET() {
	await db.$queryRaw`SELECT 1`;
	return Response.json({ ok: true });
}
```

Hit it from your platform's uptime monitor.

## Docs

- [Monitoring](https://supastarter.dev/docs/nextjs/monitoring)
- Sentry for Next.js: <https://docs.sentry.io/platforms/javascript/guides/nextjs>
