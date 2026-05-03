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

## API Endpoints

### List Available Regions

```http
GET /api/compliance/regions
```

Returns all available storage regions with compliance metadata.

### Get Organization Region

```http
GET /api/compliance/organizations/{organizationId}/region
```

Returns the current storage region for an organization.

### Set Organization Region

```http
PUT /api/compliance/organizations/{organizationId}/region
Content-Type: application/json

{
  "region": "eu"
}
```

Sets the target storage region for new data. Existing data is NOT automatically
migrated — use the migrate endpoint separately.

### Migrate Data Between Regions

```http
POST /api/compliance/organizations/{organizationId}/migrate
Content-Type: application/json

{
  "sourceRegion": "eu",
  "destRegion": "us"
}
```

Migrates all search data for an organization from one region to another.
This is a copy operation — source data is preserved.

### Check Region Health

```http
GET /api/compliance/regions/health
```

Returns connectivity status and latency for all configured Typesense regions.

## Environment Files

Each region has a `.env.*` file with region-specific configuration.
Copy and fill in real values before deploying:

- `eu/.env.eu` → EU region
- `us/.env.us` → US region
- `ru/.env.ru` → RU region

## Configuration Variables

| Variable                     | Description                              |
| ---------------------------- | ---------------------------------------- |
| `REGION`                     | Region code (eu, us, ru)                 |
| `TYPESENSE_HOST`             | Local Typesense host                     |
| `TYPESENSE_ADMIN_API_KEY`    | Local Typesense API key                  |
| `TYPESENSE_HOST_EU`          | EU Typesense endpoint (for cross-region) |
| `TYPESENSE_PORT_EU`          | EU Typesense port                        |
| `TYPESENSE_ADMIN_API_KEY_EU` | EU Typesense API key                     |
| `TYPESENSE_HOST_US`          | US Typesense endpoint                    |
| `TYPESENSE_HOST_RU`          | RU Typesense endpoint                    |

## Data Migration

To migrate an organization's data between regions:

1. **Set the target region** via `PUT /api/compliance/organizations/{id}/region`
2. **Run migration** via `POST /api/compliance/organizations/{id}/migrate`
3. **Verify** via the region health check

The migration tool exports documents from the source region's Typesense cluster
and imports them into the destination cluster using `emplace` semantics (upserts
by document ID). The source data is preserved as a safety net.

## CDN / Edge Caching

For production deployments, configure a CDN per region:

- **EU region**: Cloudflare with data center restriction to European PoPs
- **US region**: CloudFront or Cloudflare with US-only PoPs
- **RU region**: Use RU-based CDN providers (e.g., DDoS-Guard, Qrator)

Set cache TTL for search API responses appropriately based on index update
frequency. Search results can be cached at edge for 60-300s with cache
invalidation on document upsert.

## Adding a New Region

1. Create directory `deploy/regions/<code>/`
2. Create `docker-compose.yml` (override file)
3. Create `.env.<code>` with region-specific config
4. Add the region to `packages/search/lib/regions.ts`:
    - Add region code to `StorageRegion` type
    - Add entry to `AVAILABLE_REGIONS` array
5. Add i18n labels in all 5 locales (`packages/i18n/translations/{en,de,es,fr,ru}/shared.json`)
6. Update this README
7. Add region-specific env vars to `.env.local.example`
