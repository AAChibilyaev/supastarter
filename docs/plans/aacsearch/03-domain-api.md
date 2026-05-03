# 03 — Domain Model & API Contracts

> **Read after [02-architecture.md](02-architecture.md).** Defines the logical domain model (DB-free), the `ProductDocument` schema, the three API surfaces (Connector / Search / Dashboard), and the security model.

## 3.1 Hard constraint — DB is frozen

While "DB не трогаю" stands:

- All entities below are **logical**, not Prisma deltas.
- Existing models (`Organization`, `Member`, `SearchIndex`, `SearchApiKey`, `SearchScopedToken`, `SearchIngestBuffer`, `SearchUsage`, …) keep working as today.
- New entities (`Project`, `Connector`, `SyncJob`, `ConnectorToken`, `WidgetConfig`, `AnalyticsEvent`, `UsageCounter`) describe **shape and ownership**, not persistence. When implementation needs storage, the task **must** call out the schema change and wait for explicit approval before running `pnpm --filter @repo/database push`.
- Until then, "Project" lives implicitly inside `SearchIndex` (one index per logical project), and "Connector" lives implicitly in `SearchApiKey` with a `kind` distinction (search-only vs. connector-write) added when persistence lands.

## 3.2 Logical domain model

```
Organization                                  ── exists today (supastarter)
  id
  name
  slug
  plan
  members[]

Project                                       ── ❌ logical only
  id
  organizationId
  name
  platform: prestashop | bitrix | bitrix24 | api | demo
  status
  defaultLocale
  currency
  allowedOrigins[]
  createdAt
  ─ Note: today represented implicitly by SearchIndex; persisted Project entity is a future migration.

Connector                                     ── ❌ logical only
  id
  projectId
  type: prestashop | bitrix
  status
  moduleVersion
  externalBaseUrl                             ── for callbacks/heartbeat
  lastSeenAt
  lastSyncAt

ConnectorToken                                ── ❌ logical only
  id
  connectorId
  tokenHash                                   ── never store plaintext
  scopes[]
  expiresAt
  lastUsedAt
  ─ Note: when persisted, will likely live alongside SearchApiKey with a `purpose: "connector"` discriminant rather than a separate table.

SearchIndex                                   ── ✅ exists today
  id
  organizationId                              ── will become projectId after Project lands
  slug
  collectionName
  aliasName
  schemaVersion
  status

SearchApiKey                                  ── ✅ exists today
  id
  indexId
  organizationId
  hashedKey                                   ── plaintext shown ONCE at creation
  prefix                                      ── ss_search_… / ss_scoped_…
  scopes[]
  allowedOrigins[]
  rateLimitPerMinute
  expiresAt

SearchScopedToken                             ── ✅ exists today
  ─ Stateless HMAC-signed claim, NOT a row in DB.
  ─ Returned by `issueScopedSearchToken`, verified by `verifyScopedSearchToken`.

SyncJob                                       ── ❌ logical only
  id
  projectId
  connectorId
  type: full | delta | reindex | delete
  status: queued | running | succeeded | failed | cancelled
  totalItems
  processedItems
  errorCode
  errorMessage
  startedAt
  finishedAt

WidgetConfig                                  ── ❌ logical only
  id
  projectId
  theme                                        ── light | dark | auto + accent color
  layout                                       ── inline | modal | autocomplete-only | results-page
  filters[]                                    ── ordered, with display labels per locale
  sorting[]                                    ── allowed sort options
  resultFields[]                               ── which doc fields to render in cards
  locale

AnalyticsEvent                                ── ❌ logical only
  id
  projectId
  sessionId
  anonymousUserId                              ── stable per browser, optional per privacy mode
  type                                         ── search_query | zero_results | result_click | …
  query
  productId
  position                                     ── 1-indexed rank in result list (for click events)
  filters
  sort
  locale
  userAgent
  referrer
  metadata                                     ── free JSON, capped size
  createdAt

UsageCounter                                  ── 🟡 partial today
  id
  organizationId
  projectId
  period                                       ── e.g. "2026-04" (month) or "2026-04-30" (day)
  indexedDocuments
  searches
  syncJobs
  apiRequests
  ─ Today: `recordSearchUsage` writes raw rows; rollup into UsageCounter is deferred.
```

## 3.3 ProductDocument schema v1

MVP indexes only **products**. One canonical Typesense schema across PrestaShop and Bitrix — connectors normalize their native fields into this shape.

```yaml
ProductDocument:
  id: string # external_id namespaced by project — e.g. "proj_42:7891"
  project_id: string # tenant boundary — must always be filtered on
  external_id: string # raw id from CMS
  platform: string # prestashop | bitrix
  title: string
  description: string
  sku: string
  brand: string
  categories: string[] # display names, may be localized
  category_ids: string[] # platform-stable ids for facet links
  tags: string[]
  price: float
  sale_price: float
  currency: string # ISO 4217 — RUB | USD | EUR | …
  image_url: string
  product_url: string
  availability: string # in_stock | out_of_stock | preorder
  stock_quantity: int32 # optional / -1 if unknown
  attributes: object # free-form CMS attributes (color, size, …) — small payload
  locale: string # primary locale of the doc; multi-locale via separate docs in v1
  created_at: int64 # epoch seconds
  updated_at: int64
```

### Field roles

| Role                  | Fields                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| **query_by** (search) | `title`, `sku`, `brand`, `categories`, `description`, `tags`                                               |
| **filter_by**         | `project_id`, `availability`, `categories`, `category_ids`, `brand`, `price` (range), `currency`, `locale` |
| **facet**             | `brand`, `categories`, `availability`, `price` (manual buckets in the widget), `currency`, `locale`        |
| **sort_by**           | `_text_match:desc`, `price:asc/desc`, `sale_price:asc/desc`, `created_at:desc`, `updated_at:desc`          |

### Schema versioning

We never edit a live Typesense collection in place — that risks downtime and rollback impossible. Instead we use the **alias-swap** flow already implemented in `packages/search/lib/reindex.ts`:

```
v1: aac_products_proj_123_v1   ← alias `aac_products_proj_123` points here

migration:
  create new collection v2
  bulk import documents into v2
  swap alias to v2
  keep v1 temporarily (rollback target)
  drop v1 after verification
```

The recipe **R5** in `SKILL.md` covers exactly this flow.

## 3.4 API surfaces — three of them

These are **logical contracts**. Today only the Search API + admin oRPC subset is implemented; Connector API and Dashboard `/projects/*` are vision-stage.

### Connector API (called by CMS modules)

| Method | Endpoint                                        | Purpose                                                 |
| ------ | ----------------------------------------------- | ------------------------------------------------------- |
| POST   | `/api/connectors/handshake`                     | Module checks token + project; returns project metadata |
| POST   | `/api/connectors/:connectorId/heartbeat`        | Module reports it's alive (cron-driven)                 |
| POST   | `/api/projects/:projectId/sync/full`            | Create a full-sync job (returns `jobId`)                |
| POST   | `/api/projects/:projectId/sync/delta`           | Push delta (product updated/deleted)                    |
| DELETE | `/api/projects/:projectId/products/:externalId` | Idempotent delete by external id                        |
| GET    | `/api/projects/:projectId/sync/jobs/:jobId`     | Sync job status                                         |
| POST   | `/api/projects/:projectId/diagnostics`          | Module reports its diagnostics (version, last-error, …) |

**Auth**: bearer with a connector token (hashed server-side, scoped, project-bound).

### Search API (called by storefronts / browser SDK)

Implemented in `packages/api/modules/search/public-handler.ts`. ✅ Live.

| Method | Endpoint               | Purpose                                                           |
| ------ | ---------------------- | ----------------------------------------------------------------- |
| POST   | `/search/public/:slug` | Single search against the project's index                         |
| POST   | `/search/public/multi` | Federated multi-search (autocomplete + results in one round-trip) |

Future / planned (vision):

| Method | Endpoint                        | Purpose                                                                                         |
| ------ | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| GET    | `/api/search/:projectId/config` | Widget config + safe public key (one round-trip widget bootstrap)                               |
| POST   | `/api/events/:projectId`        | Tracking events (search/click/zero-results) — separate from search to keep search hot path pure |

**Auth**: `Authorization: Bearer ss_search_…` or `ss_scoped_…`, plus `Origin` validated against `allowedOrigins`.

### Dashboard API (called by `apps/saas`)

Implemented as oRPC procedures in `packages/api/modules/search/procedures/` (✅ partial — see `searchRouter`):

| Status | Procedure                                                          |
| ------ | ------------------------------------------------------------------ |
| ✅     | `listIndexes`, `createIndex`, `reindex`, `usage`                   |
| ✅     | `listApiKeys`, `createApiKey`, `revokeApiKey`, `createScopedToken` |
| ✅     | `upsertDocument`, `importDocuments`                                |

Future (vision, ❌):

| Procedure             | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `listProjects`        | When `Project` lands as DB entity        |
| `createProject`       | …same                                    |
| `getProjectOverview`  | Setup checklist + status counts          |
| `listSyncJobs`        | Drives indexing-status page              |
| `getAnalyticsSummary` | Top queries, zero-results, click-through |
| `updateWidgetConfig`  | Widget editor save                       |

### Auth rules summary

```
Dashboard API:
  ─ requires Better Auth session
  ─ requires organization membership (and admin role for write paths)

Connector API:
  ─ requires connector token (hashed server-side, scoped, project-bound)
  ─ token has scopes (sync_write, diagnostics_write, …)
  ─ token cannot be elevated by client claims

Search API:
  ─ uses search-only `ss_search_…` or signed scoped `ss_scoped_…`
  ─ validates `Origin` against `allowedOrigins`
  ─ enforces `rateLimitPerMinute`
  ─ enforces per-org plan quota (`searchLimits`)
  ─ NEVER exposes Typesense admin key
```

## 3.5 Security model

Tied to Hard Invariants 3, 4, 5, 6 in `SKILL.md`. Repeating them here for context, with practical detail:

### Key types

| Token                              | Carrier                                | Stored as                                                                                                      | Used by                                                               |
| ---------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Better Auth session                | HTTP cookie                            | session table                                                                                                  | Dashboard users                                                       |
| Connector token (`ss_connector_*`) | `Authorization: Bearer ss_connector_…` | `SearchApiKey.hashedKey` row with `scopes: ["connector_write"]` (**no separate table** — DB-frozen workaround) | CMS modules (PrestaShop / Bitrix), via `connector-public.ts`          |
| Search API key                     | `Authorization: Bearer ss_search_…`    | `SearchApiKey.hashedKey` row with `scopes: ["search"]`                                                         | Storefront browser, partner SDKs                                      |
| Scoped search token                | `Authorization: Bearer ss_scoped_…`    | **stateless HMAC** over `BETTER_AUTH_SECRET`                                                                   | Logged-in storefront users with per-user filter (e.g. own org's docs) |
| Typesense admin                    | `X-TYPESENSE-API-KEY` (server-side)    | `TYPESENSE_ADMIN_KEY` env                                                                                      | Server only — `getTypesenseClient()`                                  |

> All three `ss_*` token types share one storage table (`SearchApiKey`). The discriminator is `scopes`. Plaintext is shown **once** at creation (Hard Invariant #3) and never returned on read.

### P0 security tasks (cross-checked against current code)

- ✅ Generate connector tokens (will reuse `generateSearchApiKey` shape; show plaintext once).
- ✅ Hash connector tokens at rest.
- ✅ Bearer auth on every API.
- ✅ Validate project ownership (today: org ownership via `requireSearchIndex` / `requireOrganizationAdmin`).
- ✅ Validate `allowedOrigins` per key (in `gatePublicSearchRequest`).
- ✅ Per-key per-minute rate limit (in `gatePublicSearchRequest`).
- ✅ Per-org plan quota for searches (`searchLimits` from `@repo/payments`).
- ✅ Never log full secrets — only the prefix `ss_search_xxxx****`.
- ✅ Mask tokens in dashboard (only last-used timestamp + prefix shown after creation).
- 🟡 Rate-limit on event/tracking endpoint — not yet implemented because endpoint not yet built.

### Scoped tokens — how they narrow

`issueScopedSearchToken({ keyId, filterBy, expiresInSeconds })` produces an opaque `ss_scoped_…` HMAC. On verify, we extract the embedded `filterBy`. In `public-handler.ts`, `combineFilters(scopedFilter, callerFilter)` AND-merges them.

**Never** apply scoped filter as OR. **Never** let the caller widen scope by sending a competing `filterBy`. That's Hard Invariant #4.
