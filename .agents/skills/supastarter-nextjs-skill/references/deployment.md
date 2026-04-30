# Deployment (Next.js)

Production deployment for supastarter Next.js (split-app monorepo).

supastarter has **8 official deployment recipes**. Pick the one that matches your hosting.

| Path                     | Best for                          | Doc                                                             |
| ------------------------ | --------------------------------- | --------------------------------------------------------------- |
| **Vercel** (recommended) | Zero-ops, one project per app     | <https://supastarter.dev/docs/nextjs/deployment/vercel>         |
| **Netlify**              | Similar to Vercel, alternate host | <https://supastarter.dev/docs/nextjs/deployment/netlify>        |
| **Docker**               | Generic container deploy          | <https://supastarter.dev/docs/nextjs/deployment/docker>         |
| **Coolify**              | Self-hosted PaaS (Docker-based)   | <https://supastarter.dev/docs/nextjs/deployment/coolify>        |
| **Railway**              | PaaS, easy Postgres included      | <https://supastarter.dev/docs/nextjs/deployment/railway>        |
| **Render**               | PaaS with managed Postgres        | <https://supastarter.dev/docs/nextjs/deployment/render>         |
| **Fly.io**               | Edge regions, Docker-based        | <https://supastarter.dev/docs/nextjs/deployment/flydotio>       |
| **Standalone Node API**  | Split API for independent scaling | <https://supastarter.dev/docs/nextjs/deployment/standalone-api> |

Below: detail on the three most common paths (Vercel, Coolify/Docker, Standalone API). The Railway/Render/Fly.io/Netlify recipes are minor variations of the Docker pattern — see their official docs for platform-specific quirks.

---

## 1. Vercel (recommended)

Deploy each app (`apps/saas`, `apps/marketing`, `apps/docs`) as a **separate Vercel project** from the same monorepo.

Per Vercel project:

- **Root Directory**: `apps/saas` (or `apps/marketing` / `apps/docs`)
- **Build Command**: `cd ../.. && pnpm --filter <app> build` (Turbo handles the workspace)
- **Install Command**: `pnpm install --frozen-lockfile`
- **Output Directory**: `.next`
- **Node version**: ≥ 20

Set the same env vars (see [assets/env.example](../assets/env.example)) per app, plus app-specific URL vars.

Reference: <https://vercel.com/docs/monorepos/turborepo>.

---

## 2. Coolify (self-hosted)

[Coolify](https://coolify.io) is an open-source PaaS for self-hosted deployments. Each app is built from the monorepo into its own container.

### Per-app Dockerfile pattern

Use Next.js standalone output. Add to the relevant `apps/<app>/next.config.ts`:

```typescript
const nextConfig = {
	output: "standalone",
	// ...
};
export default nextConfig;
```

Then a multi-stage Dockerfile per app:

```dockerfile
# apps/saas/Dockerfile
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/saas/package.json ./apps/saas/
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @repo/database generate
RUN pnpm --filter saas build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/saas/.next/standalone ./
COPY --from=builder /app/apps/saas/.next/static ./apps/saas/.next/static
COPY --from=builder /app/apps/saas/public ./apps/saas/public
EXPOSE 3000
CMD ["node", "apps/saas/server.js"]
```

In Coolify:

1. Create a new application from your repo.
2. Build pack: **Dockerfile**.
3. Dockerfile path: `apps/saas/Dockerfile` (and one Coolify app per Next.js app).
4. Set environment variables in Coolify (same as Vercel — see [assets/env.example](../assets/env.example)).
5. Set the domain; Coolify will provision SSL via Caddy/Traefik.

Run DB migrations as a build step or via a separate one-off Coolify task: `pnpm --filter @repo/database migrate deploy`.

Docs: <https://supastarter.dev/docs/nextjs/deployment/coolify>.

---

## 3. Standalone API

If you need to scale the API independently of the SaaS frontend (e.g., heavier oRPC traffic, websockets, long-running endpoints), split `packages/api` into a standalone Node server.

Pattern:

1. Create a tiny new app `apps/api/` that imports the Hono `app` from `@repo/api` and runs it via `@hono/node-server`:

    ```typescript
    // apps/api/server.ts
    import { serve } from "@hono/node-server";
    import { app } from "@repo/api";

    const port = Number(process.env.PORT ?? 8080);
    serve({ fetch: app.fetch, port });
    console.log(`API listening on :${port}`);
    ```

2. Build it as a separate container (similar Dockerfile to the apps).
3. Update `apps/saas/next.config.ts` to proxy `/api/*` to the standalone API URL, OR change the SaaS oRPC client base URL to point at the standalone host.
4. Configure CORS in `packages/api/index.ts` to allow the SaaS origin.
5. Set the same DB/auth/storage env vars on the API container.

Useful when:

- API needs to scale separately from the frontend
- You want to host the API on Fly.io / Railway / Render while keeping the frontend on Vercel
- You need longer execution timeouts than Vercel allows

Docs: <https://supastarter.dev/docs/nextjs/deployment/standalone-api>.

---

## Required env in production (per app)

```env
DATABASE_URL=
DIRECT_URL=                 # if your provider needs it for migrations (Supabase)
BETTER_AUTH_SECRET=         # openssl rand -base64 32
NEXT_PUBLIC_SAAS_URL=https://app.example.com
NEXT_PUBLIC_MARKETING_URL=https://example.com
NEXT_PUBLIC_DOCS_URL=https://docs.example.com

# Storage
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=
S3_REGION=
NEXT_PUBLIC_AVATARS_BUCKET_NAME=avatars

# Mail (one of)
RESEND_API_KEY=             # or PLUNK / POSTMARK / MAILGUN / SMTP
MAIL_FROM=noreply@example.com

# Payments (one of)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# OAuth (when enabled)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Database migrations

Use a managed Postgres (Neon, Supabase, RDS, etc.). Run migrations on deploy:

```bash
pnpm --filter @repo/database migrate deploy
```

Wire this as a Vercel build step, GitHub Action, or Coolify pre-deploy task. Production env vars must be available to the migration step (Prisma scripts read `.env`/`process.env`).

## Webhooks

All payment providers post to **the same path**:

```
${NEXT_PUBLIC_SAAS_URL}/api/webhooks/payments
```

The handler routes by active provider + signature. Set the matching `*_WEBHOOK_SECRET` per provider.

## OAuth callbacks

Each OAuth provider needs:

```
${NEXT_PUBLIC_SAAS_URL}/api/auth/callback/<provider>
```

## CORS

`packages/api/index.ts` configures CORS using `NEXT_PUBLIC_SAAS_URL`. Set it correctly in the SaaS app's production env. For standalone API, also include the SaaS origin explicitly.

## Pre-deploy checklist

- [ ] Env vars set per app
- [ ] DB migrations applied
- [ ] OAuth callback URLs match production
- [ ] Payment webhook URL + secret configured
- [ ] Mail provider tested (real send through `apps/mail-preview` or smoke route)
- [ ] CORS, security headers, rate limiting reviewed
- [ ] DB backups enabled
- [ ] Monitoring / Sentry wired (see `references/monitoring.md`)
- [ ] Background tasks deployed (`pnpm --filter tasks deploy` for trigger.dev)
- [ ] E2E suite green (`pnpm test` per app)

## Docs

- [Deployment overview](https://supastarter.dev/docs/nextjs/deployment)
- [Coolify](https://supastarter.dev/docs/nextjs/deployment/coolify)
- [Standalone API](https://supastarter.dev/docs/nextjs/deployment/standalone-api)
- [Going to production / Launch](https://supastarter.dev/docs/nextjs/launch)
- Vercel monorepo: <https://vercel.com/docs/monorepos/turborepo>
- Coolify: <https://coolify.io>
