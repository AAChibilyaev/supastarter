# AACSearch — Self-Hosting Guide

This guide covers deploying AACSearch on your own infrastructure using Docker and Coolify.

## Prerequisites

- Docker 24+ and Docker Compose v2
- A PostgreSQL-compatible database (included in compose, or use an external managed DB)
- A domain name with DNS configured
- (Optional) [Coolify](https://coolify.io) for one-click managed deployments

---

## Quick Start (Docker Compose)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/aacsearch.git
cd aacsearch
```

### 2. Configure environment

```bash
cp .env.local.example .env.production
```

Edit `.env.production` and fill in the required values:

| Variable                  | Required | Description                                                                     |
| ------------------------- | -------- | ------------------------------------------------------------------------------- |
| `DB_PASSWORD`             | ✅       | PostgreSQL password                                                             |
| `NEXT_PUBLIC_SAAS_URL`    | ✅       | Your app URL, e.g. `https://app.aacsearch.com`                                  |
| `BETTER_AUTH_SECRET`      | ✅       | Random 32-byte secret: `openssl rand -base64 32`                                |
| `TYPESENSE_ADMIN_API_KEY` | ✅       | Strong random key for Typesense: `openssl rand -hex 32`                         |
| `SEARCH_CRON_SECRET`      | ✅       | Secret for cron endpoint auth: `openssl rand -hex 24`                           |
| `WALLET_CRON_SECRET`      | ✅       | Secret for wallet cron endpoints: `openssl rand -hex 24`                        |
| `MINIO_ROOT_PASSWORD`     | ✅       | MinIO admin password                                                            |
| `MAIL_FROM`               | ✅       | Sender address, e.g. `noreply@aacsearch.com`                                    |
| One mail provider key     | ✅       | `RESEND_API_KEY` or SMTP vars (`MAIL_HOST`/`MAIL_PORT`/`MAIL_USER`/`MAIL_PASS`) |

### 3. Start services

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

### 4. Run database migrations

Run Prisma migrations on first deploy (and after any schema updates):

```bash
docker compose -f docker-compose.production.yml exec app \
  node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect().then(() => { console.log('DB connected'); process.exit(0); });
"
```

For full migration (required on first deploy):

```bash
# From your local machine with DATABASE_URL pointing at the production DB:
DATABASE_URL="postgresql://postgres:***@<host>:5432/aacsearch" \
  pnpm --filter @repo/database migrate
```

### 5. Verify

```bash
# Check all services are healthy
docker compose -f docker-compose.production.yml ps

# Tail app logs
docker compose -f docker-compose.production.yml logs -f app

# Smoke test
curl https://app.aacsearch.com/api/health
```

---

## Multi-Region Deployment (Data Residency)

AACSearch supports deploying across multiple geographic regions for data residency compliance. Each region runs an independent stack (Typesense, PostgreSQL, MinIO).

### Available Regions

| Region | Code | Compliance      | Location           |
| ------ | ---- | --------------- | ------------------ |
| EU     | `eu` | GDPR            | Frankfurt, Germany |
| US     | `us` | SOC2 / CCPA     | Virginia, USA      |
| RU     | `ru` | 152-ФЗ / 242-ФЗ | Moscow, Russia     |

### Region-Specific Environment Variables

When deploying a single-region setup, only the base `TYPESENSE_HOST`/`TYPESENSE_PORT`/`TYPESENSE_ADMIN_API_KEY` are needed.

For multi-region, add per-region Typesense endpoints to `.env.production`:

| Variable                     | Required | Description                                      |
| ---------------------------- | -------- | ------------------------------------------------ |
| `TYPESENSE_HOST_EU`          | If EU    | EU Typesense host (e.g. `typesense-eu.internal`) |
| `TYPESENSE_PORT_EU`          | If EU    | EU Typesense port                                |
| `TYPESENSE_PROTOCOL_EU`      | No       | EU Typesense protocol (default: `http`)          |
| `TYPESENSE_ADMIN_API_KEY_EU` | If EU    | EU Typesense admin API key                       |
| `TYPESENSE_HOST_US`          | If US    | US Typesense host                                |
| `TYPESENSE_PORT_US`          | If US    | US Typesense port                                |
| `TYPESENSE_PROTOCOL_US`      | No       | US Typesense protocol                            |
| `TYPESENSE_ADMIN_API_KEY_US` | If US    | US Typesense admin API key                       |
| `TYPESENSE_HOST_RU`          | If RU    | RU Typesense host                                |
| `TYPESENSE_PORT_RU`          | If RU    | RU Typesense port                                |
| `TYPESENSE_PROTOCOL_RU`      | No       | RU Typesense protocol                            |
| `TYPESENSE_ADMIN_API_KEY_RU` | If RU    | RU Typesense admin API key                       |

### Deploying a Region

See [`deploy/regions/README.md`](./deploy/regions/README.md) for the full deployment guide, including Docker Compose commands and per-region `.env.*` files.

```bash
# Quick deploy for EU region
./deploy/regions/setup-region.sh eu
```

The application routes search queries to the closest healthy region, with automatic cross-region failover if a Typesense cluster becomes unavailable. The failover logic is latency-aware — queries are directed to the region with the lowest measured response time.

---

## Coolify Deployment

[Coolify](https://coolify.io) is the recommended platform for self-hosted deployments.

### Option A: Docker Compose (recommended — all services in one stack)

1. In Coolify, create a new **Docker Compose** service.
2. Point it at this repository.
3. Set **Docker Compose file** to `docker-compose.production.yml`.
4. Add all environment variables from `.env.local.example` in the Coolify environment tab.
5. Deploy.

Coolify will manage health checks, restarts, and zero-downtime redeploys automatically.

### Option B: Nixpacks (single-service, external DB/storage required)

Use this if you already have managed PostgreSQL, MinIO/S3, and Typesense.

1. Create a new **Nixpacks** service in Coolify.
2. Point at this repository — Coolify auto-detects `nixpacks.toml`.
3. Set environment variables (see table above, plus `DATABASE_URL`, `TYPESENSE_HOST`, `S3_ENDPOINT`).
4. Deploy.

> The Nixpacks path does **not** include the cron-worker service. Schedule the cron endpoints externally (e.g. Coolify Scheduled Tasks, QStash, Vercel Cron).

---

## Cron Workers

AACSearch needs four periodic jobs. In the Docker Compose setup, the `cron-worker` service handles them automatically using `deploy/cron/crontab`.

| Endpoint                                 | Schedule     | Secret               | Purpose                          |
| ---------------------------------------- | ------------ | -------------------- | -------------------------------- |
| `POST /api/cron/search-flush`            | Every minute | `SEARCH_CRON_SECRET` | Flush ingest buffer → Typesense  |
| `POST /api/cron/reindex-runner`          | Every 2 min  | `SEARCH_CRON_SECRET` | Run pending reindex jobs         |
| `POST /api/cron/expire-reservations`     | Every 5 min  | `WALLET_CRON_SECRET` | Expire stale wallet reservations |
| `POST /api/cron/reconcile-tochka-topups` | Hourly       | `WALLET_CRON_SECRET` | Reconcile Tochka top-up orders   |
| `POST /api/cron/index-health-check`      | Every 5 min  | `SEARCH_CRON_SECRET` | Drift, lag, error rate checks    |

To call them manually:

```bash
curl -X POST https://app.aacsearch.com/api/cron/search-flush \
  -H "Authorization: Bearer $SEARCH_CRON_SECRET"
```

---

## Reverse Proxy (nginx example)

```nginx
server {
    listen 443 ssl http2;
    server_name app.aacsearch.com;

    ssl_certificate     /etc/ssl/certs/aacsearch.crt;
    ssl_certificate_key /etc/ssl/private/aacsearch.key;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Coolify configures Caddy/Traefik automatically — no manual nginx config needed.

---

## Updating

```bash
# Pull latest image / rebuild
git pull
docker compose -f docker-compose.production.yml --env-file .env.production build app
docker compose -f docker-compose.production.yml --env-file .env.production up -d app cron-worker

# If schema changed (CEO approval required per Invariant 9):
DATABASE_URL="..." pnpm --filter @repo/database migrate
```

---

## Troubleshooting

| Symptom                                  | Fix                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| App starts but `/api/health` returns 503 | Check `docker compose logs app` — usually a missing env var              |
| Typesense connection refused             | Ensure `TYPESENSE_ADMIN_API_KEY` matches what Typesense was started with |
| Email not sending                        | Verify `MAIL_FROM` and at least one mail provider key                    |
| Search ingest stuck                      | Check cron-worker logs: `docker compose logs cron-worker`                |
| MinIO bucket missing                     | Re-run `docker compose up minio-setup`                                   |
