# Setup (Next.js)

Install, dependencies, and initial setup for supastarter Next.js.

## Patterns

- Use **pnpm** for install and workspaces.
- Monorepo: root `pnpm install`; apps under `apps/*`, shared code under `packages/*`.
- Database: set `DATABASE_URL`, then prefer `pnpm --filter database push`.
- Local services: Docker (Postgres, MinIO) per docs; create required buckets (e.g. `avatars`).

## Key Paths

- Root: `package.json`, `turbo.json`, `pnpm-workspace.yaml`
- SaaS app: `apps/saas/`
- Marketing app: `apps/marketing/`
- Database: `packages/database/` (schema, migrations)

## Docs

- [Setup](https://supastarter.dev/docs/nextjs/setup)
- [Configuration](https://supastarter.dev/docs/nextjs/configuration) (env, config)
