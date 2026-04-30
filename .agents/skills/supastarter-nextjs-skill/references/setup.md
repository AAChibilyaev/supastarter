# Setup (Next.js)

Install, dependencies, and initial setup for supastarter Next.js (split-app monorepo).

## Prerequisites

- **Node.js ≥ 20** (`node --version`)
- **pnpm 10+** (`pnpm --version`; install via `corepack enable` or `npm i -g pnpm`)
- **Docker** + Compose (for local Postgres + MinIO)

## Steps

```bash
git clone <your-repo>
cd <your-repo>

# 1. Install workspace dependencies
pnpm install

# 2. Env files (note: .env.local for app dev, .env for Prisma scripts)
cp .env.local.example .env.local
# Edit .env.local — at minimum set DATABASE_URL, BETTER_AUTH_SECRET,
# NEXT_PUBLIC_SAAS_URL, NEXT_PUBLIC_MARKETING_URL, NEXT_PUBLIC_DOCS_URL
# (with the Docker stack: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/supastarter)
cp .env.local .env  # Prisma scripts read .env

# Generate a Better Auth secret if you don't have one:
# openssl rand -base64 32

# 3. Start local services (Postgres + MinIO + auto-create avatars bucket)
docker compose up -d

# 4. Push DB schema and generate clients
pnpm --filter @repo/database generate
pnpm --filter @repo/database push

# 5. Start all dev servers
pnpm dev
```

After `pnpm dev`:
- SaaS:          http://localhost:3000
- Marketing:     http://localhost:3001
- Docs:          http://localhost:3002
- Mail-preview:  http://localhost:3003
- MinIO console: http://localhost:9001 (`minioadmin` / `minioadmin`)

## Single-app Dev

```bash
pnpm dev --filter=saas
pnpm dev --filter=marketing
pnpm dev --filter=docs
pnpm dev --filter=mail-preview
```

## Reset / Clean

```bash
docker compose down -v          # drop postgres + minio volumes
pnpm clean                      # turbo clean
rm -rf node_modules apps/*/.next
pnpm install
```

## Key Paths

- Root: `package.json`, `turbo.json`, `pnpm-workspace.yaml`
- Apps: `apps/saas/`, `apps/marketing/`, `apps/docs/`, `apps/mail-preview/`
- Database: `packages/database/`
- Docker: `docker-compose.yml` (Postgres on 5432, MinIO on 9000/9001 + setup container creates `avatars` bucket)
- Env example: `.env.local.example`

## Docs

- [Setup](https://supastarter.dev/docs/nextjs/setup)
- [Configuration](https://supastarter.dev/docs/nextjs/configuration)
