# Data Residency — Multi-Region Infrastructure Design

**Issue:** AAC-892
**Status:** Implemented ✅
**Requires:** Schema change for `Organization.storageRegion` (completed ✅)

---

## 1. Overview

AACsearch customers can choose where their search data is stored. Three regions:

| Region | Location  | Compliance     | Provider Example           |
| ------ | --------- | -------------- | -------------------------- |
| EU     | Frankfurt | GDPR, DPA      | Hetzner / AWS eu-central-1 |
| US     | Virginia  | SOC2, CCPA     | AWS us-east-1 / Hetzner US |
| RU     | Moscow    | 152-ФЗ, 242-ФЗ | Selectel / Yandex Cloud    |

Each region runs an independent AACsearch stack with its own:

- Typesense cluster (single leader, replicated across AZs)
- PostgreSQL database
- MinIO object storage
- Application instances (Next.js)

---

## 2. Architecture

```
                          ┌──────────────┐
                          │  Global LB   │
                          │  (DNS-based) │
                          └──────┬───────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
    ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
    │  EU (Frankfurt)│   │  US (Virginia)│   │  RU (Moscow) │
    │               │   │               │   │              │
    │  app          │   │  app          │   │  app         │
    │  typesense    │   │  typesense    │   │  typesense   │
    │  postgres     │   │  postgres     │   │  postgres    │
    │  minio        │   │  minio        │   │  minio       │
    │  cron-worker  │   │  cron-worker  │   │  cron-worker │
    └───────────────┘   └───────────────┘   └───────────────┘
```

### 2.1. DNS-Based Routing

The application layer is per-region. Each region has its own domain:

- `eu.aacsearch.com` → EU stack
- `us.aacsearch.com` → US stack
- `ru.aacsearch.com` → RU stack
- `api.aacsearch.com` → global LB → routes to nearest region (for API calls)

Organization region selection determines which backend cluster handles their data.

### 2.2. Typesense Cluster Architecture

Each region runs a single Typesense leader node per stack. For production:

- 3-node Typesense cluster per region (leader + 2 followers)
- Automatic failover with Typesense node discovery
- Data replicated within region only — no cross-region replication

---

## 3. Schema Changes Required (needs approval)

### 3.1. Organization model

```prisma
model Organization {
  // ... existing fields ...

  /// Storage region for data residency compliance
  /// Default: "eu" (GDPR-compliant by default)
  /// Values: "eu" | "us" | "ru"
  storageRegion String @default("eu")

  // ... existing relations ...
}
```

### 3.2. Add indexes

```prisma
@@index([storageRegion])
```

---

## 4. Environment Configuration

### 4.1. New env vars (per region)

Three sets of Typesense connection variables, one per region:

```env
# EU Region (Frankfurt)
TYPESENSE_HOST_EU=typesense-eu.internal
TYPESENSE_PORT_EU=8108
TYPESENSE_PROTOCOL_EU=http
TYPESENSE_ADMIN_API_KEY_EU=<key-eu>

# US Region (Virginia)
TYPESENSE_HOST_US=typesense-us.internal
TYPESENSE_PORT_US=8108
TYPESENSE_PROTOCOL_US=http
TYPESENSE_ADMIN_API_KEY_US=<key-us>

# RU Region (Moscow)
TYPESENSE_HOST_RU=typesense-ru.internal
TYPESENSE_PORT_RU=8108
TYPESENSE_PROTOCOL_RU=http
TYPESENSE_ADMIN_API_KEY_RU=<key-ru>

# Default (fallback — used for services without org context)
TYPESENSE_HOST=typesense-eu.internal
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_ADMIN_API_KEY=<key-eu>
```

### 4.2. Per-region Docker Compose

Each `docker-compose.region-{eu,us,ru}.yml` deploys the full stack for that region.
Common config extracted to `docker-compose.region-common.yml`.

---

## 5. Client Routing Layer

### 5.1. `getTypesenseClientForRegion(region)` — new function

Located in `packages/search/lib/client.ts`.

```typescript
type StorageRegion = "eu" | "us" | "ru";

function getTypesenseClientForRegion(region: StorageRegion): Client {
	const prefix = region.toUpperCase();
	const host = process.env[`TYPESENSE_HOST_${prefix}`] ?? process.env.TYPESENSE_HOST;
	const port = parseInt(
		process.env[`TYPESENSE_PORT_${prefix}`] ?? process.env.TYPESENSE_PORT ?? "8108",
		10,
	);
	const protocol = (process.env[`TYPESENSE_PROTOCOL_${prefix}`] ??
		process.env.TYPESENSE_PROTOCOL ??
		"http") as "http" | "https";
	const apiKey =
		process.env[`TYPESENSE_ADMIN_API_KEY_${prefix}`] ?? process.env.TYPESENSE_ADMIN_API_KEY!;

	if (!host || !apiKey) {
		throw new Error(`Typesense config for region ${region} is incomplete`);
	}

	return createCachedClient(region, { host, port, protocol, apiKey });
}
```

### 5.2. `getTypesenseClient(tenantId?)` — enhanced

Modify existing `getTypesenseClient()` to accept optional `tenantId`:

- If `tenantId` is provided: look up org's `storageRegion`, return region-specific client
- If `tenantId` is not provided: return default (EU) client
- Cache clients per region (one per region, cached after first use)

### 5.3. Queries

```typescript
// In packages/database/prisma/queries/organizations.ts
async function getOrganizationStorageRegion(organizationId: string): Promise<StorageRegion> {
	const org = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { storageRegion: true },
	});
	return org?.storageRegion ?? "eu";
}
```

---

## 6. Deployment Configuration

### 6.1. Directory Structure

```
deploy/regions/
  eu/
    docker-compose.yml          # Override with EU-specific env
    .env.eu                     # EU-specific env vars
    setup.sh                    # Init script
  us/
    docker-compose.yml
    .env.us
    setup.sh
  ru/
    docker-compose.yml
    .env.ru
    setup.sh
  common/
    docker-compose.base.yml     # Shared service definitions
```

### 6.2. Region Docker Compose

Each region compose file extends the base and sets region-specific env:

```yaml
# deploy/regions/eu/docker-compose.yml
name: aacsearch-eu
services:
    typesense:
        environment:
            TYPESENSE_API_KEY: ${TYPESENSE_ADMIN_API_KEY_EU}
        volumes:
            - typesense_data_eu:/data
volumes:
    typesense_data_eu:
```

### 6.3. Regional .env file pattern

```env
# deploy/regions/eu/.env.eu
REGION=eu
REGION_LABEL=Frankfurt, Germany
TYPESENSE_ADMIN_API_KEY=...
```

---

## 7. API Procedures

### 7.1. `organization.updateStorageRegion` (new oRPC)

- **Auth:** Admin of organization
- **Body:** `{ storageRegion: "eu" | "us" | "ru" }`
- **Logic:**
    1. Validate region is available
    2. If changing region: schedule data migration job
    3. Update Org.storageRegion

### 7.2. `organization.getStorageRegions` (new oRPC)

- **Auth:** Authenticated
- **Returns:** Available regions list with metadata (compliance, latency note, pricing)

---

## 8. Data Migration Between Regions

Moving an organization's data from one region to another:

1. Create target-region Typesense collections (same schema)
2. Export data from source Typesense (using exportDocuments API)
3. Import into target Typesense
4. Verify document counts match
5. Update Organization.storageRegion
6. Delete from source after confirmation window

Implemented as an async background job (cron or worker).

---

## 9. UI Changes

### 9.1. Organization Settings → Data Residency

- Radio group: EU (Frankfurt, Germany) | US (Virginia, USA) | RU (Moscow, Russia)
- Compliance badges next to each option: "GDPR", "SOC2", "152-ФЗ"
- Warning when switching: "Data migration may take several minutes"
- Current region shown on dashboard

### 9.2. Onboarding

- During org creation: prompt to choose region
- Default: EU (GDPR-compliant)

---

## 10. Implementation Plan

### Phase 1: Schema (requires approval)

1. Add `storageRegion` to Organization model
2. Run migration

### Phase 2: Environment & Config

1. Add multi-region env vars to `.env.local.example`
2. Create `deploy/regions/` directory structure

### Phase 3: Client Routing

1. Add `getTypesenseClientForRegion()` to search client
2. Add `getOrganizationStorageRegion()` query
3. Modify `getTypesenseClient()` to accept optional tenantId
4. Update all search callers to pass tenantId

### Phase 4: Deploy Configs

1. Create region-specific docker-compose files
2. Create regional setup scripts

### Phase 5: API & UI

1. Add `organization.updateStorageRegion` procedure
2. Add region selection UI in settings
3. Add region choice during onboarding

### Phase 6: Data Migration

1. Implement export → import pipeline
2. Track migration progress
3. Verification step

### Phase 7: Documentation

1. Customer-facing docs: "Where is my data stored?"
2. Operations runbook for deploying new regions

---

## 11. Open Questions

1. **Pricing**: Should certain regions cost more? (RU hosting may be cheaper)
2. **Global search**: When a user searches from a different region, should we proxy or reject?
3. **Compliance overlap**: EU-RU data transfer restrictions — how to handle?
4. **Typesense node configuration**: Single leader vs. 3-node cluster per region for MVP?
5. **CDN**: Should we add Cloudflare / CDN per region for widget search?

---

## 12. Verification

- [x] `pnpm type-check` passes
- [x] `pnpm lint` passes (0 errors, 0 warnings)
- [x] Region-specific Typesense clients resolve correct env vars
- [x] Default (EU) client works when no org context available
- [x] `getTypesenseClient(tenantId)` returns correct region client
- [x] Docker compose for each region starts successfully
- [x] Data migration script copies documents between regions
- [x] Invalid region falls back gracefully
- [x] i18n labels for regions in all 5 locales
