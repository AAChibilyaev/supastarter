# AACsearch Multi-Region Deployment

This directory contains deployment configurations for AACsearch data residency.

## Regions

| Region | Directory | Compliance      | Location           |
| ------ | --------- | --------------- | ------------------ |
| EU     | `eu/`     | GDPR            | Frankfurt, Germany |
| US     | `us/`     | SOC2 / CCPA     | Virginia, USA      |
| RU     | `ru/`     | 152-ФЗ / 242-ФЗ | Moscow, Russia     |

## Quick Start

### Deploy a specific region

```bash
# Deploy EU region
./deploy/regions/setup-region.sh eu

# Deploy US region
./deploy/regions/setup-region.sh us

# Deploy RU region
./deploy/regions/setup-region.sh ru
```

### Manual deploy (without setup script)

```bash
# EU region
docker compose \
  -f deploy/regions/common/docker-compose.base.yml \
  -f deploy/regions/eu/docker-compose.yml \
  --env-file deploy/regions/eu/.env.eu \
  up -d

# US region
docker compose \
  -f deploy/regions/common/docker-compose.base.yml \
  -f deploy/regions/us/docker-compose.yml \
  --env-file deploy/regions/us/.env.us \
  up -d

# RU region
docker compose \
  -f deploy/regions/common/docker-compose.base.yml \
  -f deploy/regions/ru/docker-compose.yml \
  --env-file deploy/regions/ru/.env.ru \
  up -d
```

### Stop a region

```bash
docker compose \
  -f deploy/regions/common/docker-compose.base.yml \
  -f deploy/regions/eu/docker-compose.yml \
  --env-file deploy/regions/eu/.env.eu \
  down
```

## Architecture

Each region runs a full AACsearch stack:

- App (Next.js)
- Typesense (search engine)
- PostgreSQL (database)
- MinIO (S3-compatible object storage)
- Cron worker

The app's `REGION` env variable determines which Typesense instance is used as
the primary cluster. Cross-region Typesense endpoints are configured for admin
features like data migration.

## Environment Files

Each region has a `.env.*` file with region-specific configuration.
Copy and fill in real values before deploying:

- `eu/.env.eu` → EU region
- `us/.env.us` → US region
- `ru/.env.ru` → RU region

## Adding a New Region

1. Create directory `deploy/regions/<code>/`
2. Create `docker-compose.yml` (override file)
3. Create `.env.<code>` with region-specific config
4. Update this README
5. Add region to the API's region list in `packages/search/lib/regions.ts`
6. Add i18n labels in all 5 locales
