# AACsearch Architecture Reference

> Generated from codebase analysis — supastarter-based search-as-a-service (SaaS).
> Last updated: 2026-05-03

---

## 1. Project Overview

**AACsearch** is a hosted search-as-a-service platform built on top of the **supastarter** Next.js monorepo starter kit. It provides Typesense-powered search with API keys, scoped tokens, CMS connectors, an embeddable widget, analytics, and a Knowledge module (RAG/GraphRAG).

- **Name:** AACsearch / AACsearch Engine
- **Base:** supastarter Next.js monorepo
- **Stack:** TypeScript, Next.js 16, React 19, pnpm, Turborepo
- **Structure:** 4 apps, 17 packages, 2 tooling, 15 oRPC API modules
- **Deploy:** Coolify-ready, Docker Compose, Nixpacks
- **Active version:** v0.5 (marketing) + R2.5 (Knowledge, dashboard, analytics)

---

## 2. Monorepo Structure

```
/Users/aac/Projects/ts/supastarter/
├── apps/
│   ├── saas/              # Protected SaaS dashboard (Next.js App Router)
│   ├── marketing/         # Public marketing site (Next.js App Router)
│   ├── docs/              # Public docs site (deferred to v0.7)
│   └── mail-preview/      # Email template preview only
├── packages/
│   ├── api/               # Hono + oRPC — all backend routes
│   ├── auth/              # Better Auth (sessions, orgs, OAuth, 2FA, passkeys)
│   ├── database/          # Prisma (active ORM, 33 models) + Drizzle (legacy)
│   ├── search/            # Typesense client, ingest buffer, search, reindex
│   ├── search-client/     # Browser-safe SDK for customers
│   ├── widget/            # Vanilla JS storefront widget (Shadow DOM, 14KB)
│   ├── shopify-connector/ # Shopify OAuth + sync engine
│   ├── aacsearch-mcp/     # MCP server for AI agent integration
│   ├── ai/                # Vercel AI SDK configs (chat-style)
│   ├── ai-core/           # Lower-level AI orchestration primitives
│   ├── billing-wallet/    # Kopecks ledger, reserve/commit/release
│   ├── payments/          # Stripe, LemonSqueezy, Polar, Creem, DodoPayments, Tochka
│   ├── i18n/              # 5 locales × 4 scopes (en, de, es, fr, ru)
│   ├── logs/              # Pino-based logger
│   ├── mail/              # React Email templates + provider drivers
│   ├── notifications/     # In-app notification system
│   ├── storage/           # S3-compatible (MinIO local)
│   ├── ui/                # Shadcn UI primitives (75 components)
│   ├── utils/             # Generic helpers
│   ├── nlp/               # NLP pipeline utilities
│   ├── document-processor/# Document processing
│   ├── recommendations/   # Recommendation engine
│   └── e2e/               # Playwright E2E tests
├── modules/               # PHP CMS modules (NOT Node workspace)
│   ├── prestashop/aacsearch/
│   └── bitrix/aac.search/
├── tooling/
│   ├── tailwind/          # Tailwind v4 design tokens
│   ├── scripts/           # Build scripts
│   └── tsconfig/          # Shared TS configs
└── docs/
    ├── plans/aacsearch/   # PRD vision pack (10 docs)
    ├── audits/            # Infrastructure, UI structure audits
    └── references/        # External reference notes
```

### App layers (Next.js App Router)

| App            | Port    | Purpose                                                       |
| -------------- | ------- | ------------------------------------------------------------- |
| `saas`         | `:3000` | Protected dashboard — auth, search, analytics, billing, admin |
| `marketing`    | `:3001` | Public site — landing, pricing, blog, changelog, legal        |
| `docs`         | `:3002` | Public documentation (deferred to v0.7)                       |
| `mail-preview` | —       | Email template preview                                        |

---

## 3. Tech Stack (Exact Versions)

| Technology     | Version           | Notes                                         |
| -------------- | ----------------- | --------------------------------------------- |
| Next.js        | ^16.2.0           | App Router, RSC, Server Actions               |
| React          | 19.2.4            | Server Components default                     |
| TypeScript     | 6.0.2             | strict, target ES6 (ES2020 for BigInt)        |
| pnpm           | 10.28.2           | workspace catalog                             |
| Turborepo      | ^2.9.4            | dotenv -c wrapper                             |
| Tailwind CSS   | 4.2.2             | v4, no config file, only `@theme`             |
| oRPC           | 1.13.13           | Type-safe RPC + TanStack Query                |
| Hono           | ^4.12.11          | HTTP handler — mounts oRPC, webhooks, CORS    |
| Better Auth    | 1.5.6             | Auth, orgs, passkeys, 2FA, magic links, OAuth |
| Prisma         | 7.6.0             | Active ORM — 33 models                        |
| Typesense      | ^3.0.0            | Search engine (server v30.2)                  |
| OpenAI SDK     | ^6.33.0           | Knowledge RAG, GraphRAG                       |
| Vercel AI SDK  | ^6.0.146          | AI streaming                                  |
| Zod            | ^4.3.6            | Validation                                    |
| TanStack Query | ^5.96.2           | Client data fetching                          |
| Oxlint / Oxfmt | ^1.58.0 / ^0.43.0 | Lint + format (NOT ESLint/Prettier)           |
| next-intl      | 4.9.0             | i18n — 5 locales × 4 scopes                   |

---

## 4. API Architecture

### Request Flow

All routes mount on a single Hono app at `packages/api/index.ts` with `basePath("/api")`:

```
/api
├── /api/*              ← publicSearchApp (permissive CORS) — search, handshake
├── /api/*              ← eventsApp (widget analytics POST /api/events/track)
├── /api/widget/widget.js ← static file (widget bundle)
├── /api/*              ← connectorApp (CMS connector API, 8 endpoints)
├── /api/*              ← analyticsApp
├── /api/scim/v2/*      ← SCIM 2.0 identity provisioning
├── /api/v1/*           ← v1 REST API (15 endpoints, OpenAPI 3.1)
├── /api/auth/**        ← Better Auth handler
├── /api/webhooks/payments    ← Payments webhook
├── /api/webhooks/payments/tochka ← Wallet webhook
├── /api/health         ← Health check
├── /api/rpc/**         ← oRPC handler (15 modules)
└── /api/**             ← OpenAPI spec handler
```

### oRPC Modules (15 total)

Defined in `packages/api/orpc/router.ts`:

| Module            | Router                                           | Purpose                                                     |
| ----------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| `admin`           | `packages/api/modules/admin/router.ts`           | Admin dashboard, user/org management                        |
| `organizations`   | `packages/api/modules/organizations/router.ts`   | Org CRUD, member management                                 |
| `users`           | `packages/api/modules/users/router.ts`           | User profile, settings                                      |
| `payments`        | `packages/api/modules/payments/router.ts`        | Billing, subscriptions                                      |
| `ai`              | `packages/api/modules/ai/router.ts`              | AI chat features                                            |
| `notifications`   | `packages/api/modules/notifications/router.ts`   | In-app notifications                                        |
| `search`          | `packages/api/modules/search/router.ts`          | **26 procedures** — indexes, keys, tokens, usage, analytics |
| `knowledge`       | `packages/api/modules/knowledge/router.ts`       | RAG/GraphRAG — spaces, sources, documents                   |
| `feedback`        | `packages/api/modules/feedback/router.ts`        | User feedback collection                                    |
| `billingWallet`   | `packages/api/modules/billing-wallet/router.ts`  | Wallet ledger, top-ups                                      |
| `entitlements`    | `packages/api/modules/entitlements/router.ts`    | Feature gates, quota middleware                             |
| `indexing`        | `packages/api/modules/indexing/router.ts`        | Index management                                            |
| `mySearch`        | `packages/api/modules/my-search/router.ts`       | Personal cross-index search                                 |
| `onboarding`      | `packages/api/modules/onboarding/router.ts`      | Onboarding wizard, health scores                            |
| `recommendations` | `packages/api/modules/recommendations/router.ts` | Product recommendations                                     |

### Request Gate Pipeline

Every search API request traverses:

```
Auth Gate → Feature Gate → Quota Gate → Rate Gate → Typesense
```

- **Auth Gate:** `public-handler.ts` — verifies API key (hash lookup), scoped token (HMAC), or connector token
- **Feature Gate:** `entitlements/middleware/feature-gate.ts` — plan-based feature access (`.use(featureGate('synonyms'))`)
- **Quota Gate:** `entitlements/middleware/quota-check.ts` — plan-based usage limits
- **Rate Gate:** Rate-limit check via `SearchRateLimitBucket` table
- **Output:** Sanitized JSON (no raw Typesense errors — mapped to typed codes)

---

## 5. Search Engine Architecture

### Core Package: `@repo/search`

Files in `packages/search/lib/`:

| File                  | Responsibility                                          |
| --------------------- | ------------------------------------------------------- |
| `client.ts`           | Typesense connection, collection creation, document ops |
| `collections.ts`      | Schema definitions, version naming, alias swap          |
| `search.ts`           | `searchDocuments` / `multiSearchDocuments`              |
| `buffer.ts`           | Ingest buffer worker — DB queue → Typesense             |
| `ingest.ts`           | Document ingestion (bulkUpsert, deleteByQuery)          |
| `reindex.ts`          | Versioned zero-downtime reindex                         |
| `keys.ts`             | API key generation + hashing (SHA-256)                  |
| `verify.ts`           | Connection verification                                 |
| `env.ts`              | Environment validation                                  |
| `maintenance.ts`      | Expired keys, rate limit cleanup                        |
| `delta-sync.ts`       | Delta sync for connectors                               |
| `query-processor.ts`  | Query processing/normalization                          |
| `analytics-events.ts` | Analytics event handling                                |
| `embeddings.ts`       | Embedding generation (for vector search)                |
| `auto-embed.ts`       | Auto-embedding pipeline                                 |
| `synonyms-sync.ts`    | Synonym synchronization                                 |

### Data Flow: Write Path

```
Request → public-handler.ts (auth check)
  → enqueueManySearchIngest (INSERT into SearchIngestBuffer table)
  → Worker picks up unprocessed rows
  → bulkUpsert to Typesense
  → markIngestRowsSuccess / markIngestRowsFailure (exponential backoff)
```

**Key constraint:** Public write requests NEVER call `bulkUpsert` directly. Only the worker does. (Invariant 2)

### Data Flow: Read Path

```
Request → public-handler.ts (auth + rate limit + quota)
  → searchDocuments / multiSearchDocuments
  → Typesense response → sanitized JSON
  → recordSearchUsage (async — q, filters, resultCount, latencyMs, UA, referrer)
```

### Data Flow: Analytics Events

```
Widget trackEvent() → POST /api/events/track (Bearer ss_search_*)
  → events-public.ts → recordSearchUsage (SearchUsageEvent table)
  → Event types: search_query, zero_results, result_click, widget_open, filter_used
```

### Collection Management

- Each index is versioned: `{orgShortId}_{slug}_v{version}`
- Alias maps to current version: `{orgShortId}_{slug}`
- Reindex creates `_v{newVersion}` → verifies → atomically swaps alias
- Old version kept until next reindex confirms green

### Token System

| Token Type       | Prefix           | Purpose                                                                  |
| ---------------- | ---------------- | ------------------------------------------------------------------------ |
| API keys         | `ss_search_*`    | Hashed in DB, shown once. Scopes: search, ingest, admin, connector_write |
| Scoped tokens    | `ss_scoped_*`    | HMAC over BETTER_AUTH_SECRET, narrows permissions (AND-combined)         |
| Connector tokens | `ss_connector_*` | Reuse SearchApiKey with `connector_write` scope                          |

### v1 REST API

15 public endpoints at `/api/v1/*` with API-key auth. OpenAPI 3.1 spec at `/api/v1/openapi.json`.

Auth scopes: `aa_admin_*`, `aa_write_*`, `aa_search_*`, `aa_scoped_*`

---

## 6. Connector System

### Connector API (8 public endpoints)

All mounted on `/api` with permissive CORS, defined in `packages/api/modules/search/connector-public.ts`:

| Method | Path                                            | Purpose                           |
| ------ | ----------------------------------------------- | --------------------------------- |
| POST   | `/api/connectors/handshake`                     | Verify token, return index info   |
| POST   | `/api/connectors/:connectorId/heartbeat`        | Keepalive                         |
| POST   | `/api/projects/:projectId/sync/full`            | Full sync — enqueue all products  |
| POST   | `/api/projects/:projectId/sync/delta`           | Delta sync — enqueue changed only |
| DELETE | `/api/projects/:projectId/products/:externalId` | Delete single product             |
| DELETE | `/api/connector/documents`                      | Batch delete by external IDs      |
| POST   | `/api/projects/:projectId/diagnostics`          | Send diagnostics report           |
| GET    | `/api/projects/:projectId/sync/jobs/:jobId`     | Get sync job status               |

### CMS Connector Modules (PHP, separate repos)

- **PrestaShop 8.x** — `modules/prestashop/aacsearch/`: Module class, config, Client, Exporter, SyncQueue, admin controller, widget template
- **Bitrix** — `modules/bitrix/aac.search/`: Installer, Client, ProductExporter, SyncAgent, EventHandlers, admin settings, widget component

### Shopify Connector (`@repo/shopify-connector`)

Full OAuth flow and sync engine for Shopify stores:

| File                      | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `src/router.ts`           | Hono router — install, callback, status, sync, webhooks |
| `src/oauth.ts`            | OAuth token exchange                                    |
| `src/client.ts`           | Shopify REST/GraphQL client                             |
| `src/sync.ts`             | Full/delta product sync                                 |
| `src/product-mapper.ts`   | Product mapping to search documents                     |
| `src/webhooks.ts`         | Webhook handlers (app/uninstalled, products/update)     |
| `src/webhook-verifier.ts` | HMAC webhook signature verification                     |
| `src/crypto.ts`           | AES-256-GCM encryption for access tokens                |
| `src/types.ts`            | TypeScript types                                        |
| `src/inventory-sync.ts`   | Inventory level sync                                    |
| `src/category-sync.ts`    | Category/collection sync                                |

Endpoints: `GET /api/shopify/install`, `GET /api/shopify/callback`, `GET /api/shopify/:storeId/status`, `POST /api/shopify/:storeId/sync`, `POST /api/shopify/:storeId/sync/delta`, `POST /api/shopify/webhooks/app/uninstalled`

### SCIM 2.0

12 endpoints at `/api/scim/v2/*` for identity provisioning:

| Method               | Path                     | Purpose            |
| -------------------- | ------------------------ | ------------------ |
| GET                  | `/ServiceProviderConfig` | SCIM config        |
| GET/POST             | `/Users`                 | List/create users  |
| GET/PUT/PATCH/DELETE | `/Users/{id}`            | User CRUD          |
| GET/POST             | `/Groups`                | List/create groups |
| GET/PUT/DELETE       | `/Groups/{id}`           | Group CRUD         |

---

## 7. Database (Prisma)

**33 models** total, categorized:

### Core Auth (7 models)

`User`, `Session`, `Account`, `Verification`, `Passkey`, `TwoFactor`, `Organization`, `Member`, `Invitation`

### Search (6 models)

| Model                    | Purpose                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| `SearchIndex`            | Org-owned index — slug, schema (JSON), version, enabled               |
| `SearchApiKey`           | Hashed API keys — scope, prefix, lastUsedAt                           |
| `SearchRateLimitBucket`  | Rate-limit tracking — window, count, expires                          |
| `SearchUsageEvent`       | Search/click/event analytics — query, filters, resultCount, latencyMs |
| `SearchIngestBuffer`     | DB queue for ingest — status, retryCount, lastError                   |
| `SearchConnectorSyncJob` | Sync job tracking — itemsCount, failuresCount, events                 |

### Knowledge (7 models)

`KnowledgeSpace`, `DataSource`, `IngestionJob`, `KnowledgeDocument`, `KnowledgeChunk`, `GraphNode`, `GraphEdge`

### Wallet / AI (7 models)

`AiWallet`, `AiWalletTransaction`, `AiQuotaReservation`, `AiUsageEvent`, `AiPricingRule`, `FxRate`, `WalletTopupOrder`

### Payments / Notifications / Other

`Purchase`, `PaymentProviderEvent`, `Notification`, `UserNotificationPreference`, `ShopifyStore`, `RoadmapItem`, `ActivationEvent`

### DB Query Files

Located in `packages/database/prisma/queries/`:

- `search.ts` — Search index, API key, usage queries
- `organizations.ts` — Org-related queries
- `users.ts` — User queries
- `purchases.ts` — Purchase/subscription queries
- `search-rate-limit.ts` — Rate limit tracking
- `knowledge.ts` — Knowledge space queries
- `ai-pricing.ts` — AI pricing rules
- `ai-usage.ts` — AI usage events
- `ai-wallets.ts` — Wallet queries
- `wallet-topup-orders.ts` — Top-up orders
- `index.ts` — Barrel exports

---

## 8. Knowledge Module (RAG / GraphRAG)

A separate product surface for document Q&A, not storefront search.

### Architecture

| Component       | File                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| Types & schemas | `packages/api/modules/knowledge/types.ts`                                                                          |
| oRPC router     | `packages/api/modules/knowledge/router.ts`                                                                         |
| Procedures      | 10 procedures: list/create spaces/sources, ingestion jobs, ingest file, ask (RAG), graphrag-explain, usage metrics |
| Chunking        | `packages/api/modules/knowledge/lib/chunking.ts`                                                                   |
| Parsers         | `packages/api/modules/knowledge/lib/parsers.ts`                                                                    |
| Retrieval       | `packages/api/modules/knowledge/lib/retrieval.ts`                                                                  |
| GraphRAG        | `packages/api/modules/knowledge/lib/graphrag.ts`                                                                   |
| Access control  | `packages/api/modules/knowledge/lib/access.ts`                                                                     |

### Data Models

- `KnowledgeSpace` — top-level container, owned by org or user
- `DataSource` — file source (PDF, DOCX, TXT)
- `IngestionJob` — ingestion tracking
- `KnowledgeDocument` — processed document
- `KnowledgeChunk` — individual chunk for retrieval
- `GraphNode` / `GraphEdge` — knowledge graph entities

### UI

`KnowledgeWorkbench.tsx` — integrated in org-scoped sidebar (`/[orgSlug]/knowledge`) and account scope (`/knowledge`).

---

## 9. Billing & Wallet

### Plans (5 tiers)

Free (10K units, 1 index) → Starter → Pro (1M units, 10 indexes) → Business → Enterprise (custom)

### Payment Providers (6)

| Provider     | Currency | Integration                                                   |
| ------------ | -------- | ------------------------------------------------------------- |
| Stripe       | USD      | International subscriptions, Customer Portal, invoices, cards |
| LemonSqueezy | USD      | Alternative payment processor                                 |
| Polar        | USD      | Open-source alternative                                       |
| Creem        | USD      | Payment processor                                             |
| DodoPayments | USD      | Payment processor                                             |
| Tochka Bank  | RUB      | Russian payments, AI Wallet top-up                            |

### Wallet System (`@repo/billing-wallet`)

- BigInt kopecks ledger (minor units — Invariant 8)
- Reserve → commit/release pattern
- Wallet models: `AiWallet`, `AiWalletTransaction`, `AiQuotaReservation`, `AiUsageEvent`, `AiPricingRule`, `FxRate`, `WalletTopupOrder`
- Money is always BigInt, never numeric/decimal (Invariant 16)
- Over oRPC: BigInt fields `.transform(v => v.toString())` (Invariant 7)

### Entitlements Module

`packages/api/modules/entitlements/`:

- Feature gate middleware: `.use(featureGate('synonyms'))`
- Quota check middleware: `quotaCheck(c, orgId, 'search')`
- Plan resolution: Purchase (SUBSCRIPTION) → priceId → planId → feature matrix
- Grace period: 7d reads, 0d writes on cancel
- 60s cache, fail-open on errors

---

## 10. Widget Architecture

### Package: `@repo/widget`

| File                   | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `src/index.ts`         | Main widget class (AacSearchWidget) — ~800 lines |
| `src/translations.ts`  | 5-locale embedded translation map, 20 keys       |
| `src/search-client.ts` | Fetch wrapper for search API                     |

### Key Details

- Vanilla JS (no framework dependency)
- Shadow DOM for style isolation
- Served via static file at `/api/widget/widget.js`
- IIFE + ESM dual build (tsup, ~18KB)
- Configurable via `data-*` attributes on `<script>` tag
- 5 locales auto-detected from `data-locale` attribute

### Widget Lifecycle

```
constructor() → resolve locale + container → render() → attachEvents()
  → trackEvent("widget_open")
  → user types → doSearch() → render results
  → click result → trackEvent("result_click")
  → filter change → trackEvent("filter_used")
```

### Analytics Integration

Events tracked via `fetch` keepalive to `POST /api/events/track`:

- `search_query`, `zero_results`, `result_click`, `widget_open`, `filter_used`
- Includes sessionId, locale, referrer

---

## 11. Auth System

### Better Auth Setup

`packages/auth/auth.ts` configures:

- **Database:** Prisma adapter (PostgreSQL)
- **Session:** 30-day expiry, impersonation support
- **Features:** email/password, magic links, passkeys, 2FA (TOTP), OAuth (Google + GitHub), username, admin, organizations, invitation-only
- **Hooks:** Cancel subscriptions on user/org delete, update seat count on invitation accept/member removal

### Session Access Patterns

| Context              | Import                                                                                 | Usage                                                                         |
| -------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Server Component     | `import { getSession } from "@auth/lib/server"`                                        | `const session = await getSession()`                                          |
| Client Component     | `import { useSession } from "@auth/hooks/use-session"`                                 | `const { user, loaded } = useSession()`                                       |
| oRPC procedure       | `protectedProcedure` / `adminProcedure`                                                | `context.user`, `context.session`                                             |
| Org context (client) | `import { useActiveOrganization } from "@organizations/hooks/use-active-organization"` | `const { activeOrganization, isOrganizationAdmin } = useActiveOrganization()` |

---

## 12. i18n System

### 5 Locales × 4 Scopes = 20 Files

```
packages/i18n/translations/
  {en,de,es,fr,ru}/
    saas.json       # apps/saas only
    marketing.json  # apps/marketing only
    shared.json     # Cross-app strings
    mail.json       # Email templates only
```

### Hard Rules

- **NEVER skip `ru`** — all 5 locales must have the key in every change
- Marketing site uses `[locale]` segment in URL
- SaaS app detects locale via cookie (`NEXT_LOCALE`)
- `ru` uses RUB currency; others use USD
- i18n config at `packages/i18n/config.ts`

---

## 13. Infrastructure

### Docker Compose (Local Dev — `docker-compose.yml`)

| Service   | Image                    | Port       | Purpose               |
| --------- | ------------------------ | ---------- | --------------------- |
| postgres  | postgres:16-alpine       | 5432       | Primary database      |
| minio     | minio/minio:latest       | 9000, 9001 | S3-compatible storage |
| typesense | typesense/typesense:30.2 | 8108       | Search engine         |
| neo4j     | neo4j:5-enterprise       | 7687, 7474 | Knowledge graph       |

### Production Docker Compose

Separate compose file with app, cron-worker, postgres, minio, typesense on 2 isolated networks.

### CI/CD (GitHub Actions)

4 workflows:

1. **validate-prs** — lint (oxlint), format (oxfmt), type-check, build, unit tests, E2E (Playwright)
2. **deploy** — Build → push to GHCR → deploy staging → smoke tests → deploy production
3. **rollback** — Manual trigger via workflow_dispatch with tag validation
4. **benchmark** — k6-based nightly performance tests

### Deployment

- **Platform:** Coolify (self-hosted)
- **Registry:** GHCR (`ghcr.io/<repo>`)
- **Health check:** Docker HEALTHCHECK on app (`wget /api/health`, 30s interval)
- **Alternative:** Nixpacks support for Railway/Render

### Hard Invariants (19 total — critical rules)

Key invariants relevant to architecture:

1. **Split-app only** — No `apps/web/*`, only saas, marketing, docs, mail-preview
2. **DB-first ingest** — Public writes enqueue, only worker calls bulkUpsert
3. **API keys hash-only** — `hashedKey` is the only stored form
4. **Scoped tokens narrow** — AND-combined with caller filters, never OR
5. **Tenant isolation** — Every search call passes `tenantId`
6. **No raw Typesense errors** — Map to typed JSON errors
7. **BigInt over oRPC** — `.transform(v => v.toString())` on all BigInt output fields
8. **Money in kopecks** — BigInt minor units, never numeric/decimal
9. **DB is FROZEN** — No Prisma migrations without explicit user approval
10. **i18n ALL 5 locales** — Every user-visible string in en, de, es, fr, ru
11. **Reuse first** — Grep before write, 3-layer UI ranking
12. **Prisma is active ORM** — Drizzle is legacy reference only
13. **agents.md = claude.md** — Symlink, edit only agents.md
14. **Lint/Format = Oxlint + Oxfmt ONLY** — NOT Biome/ESLint/Prettier
15. **Removed code stays removed** — Don't recreate deleted files
16. **Money is never numeric/decimal** — Always BigInt minor units
17. **No console.log in production** — Use `logger` from `@repo/logs`
18. **JSON fields — explicit casts** — `Record<string, unknown>` on read, `Prisma.InputJsonValue` on write
19. **Organization has NO updatedAt** — Don't reference `org.updatedAt`

---

## 14. SaaS Dashboard Routes

### Unauthenticated

`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify`

### Authenticated — Account

`/`, `/settings/general`, `/settings/security`, `/settings/notifications`, `/settings/billing`, `/settings/billing/ai-credits`, `/knowledge`, `/chatbot`, `/admin/*`

### Authenticated — Organization (`/[orgSlug]`)

`/overview`, `/getting-started`, `/search`, `/api-keys`, `/import-jobs`, `/preview`, `/analytics`, `/relevance`, `/connectors`, `/knowledge`, `/settings/general`, `/settings/members`, `/settings/billing`

---

## 15. Component Architecture

### 3-Layer UI Ranking (always check before creating)

1. **`@repo/ui/components/*`** — Shadcn primitives + landing blocks + chat components (75 total)
2. **`apps/saas/modules/shared/components/`** — App-level shared blocks (AppWrapper, NavBar, PageHeader, etc.)
3. **`apps/saas/modules/<feature>/components/`** — Feature-specific components

### Key UI Rules

- NO raw card divs — use `<Card>` from `@repo/ui`
- NO wrapping shadcn components — edit the .tsx source
- NO barrel imports from `@repo/ui` — import from `@repo/ui/components/<name>`
- Button has `loading` prop — no custom loading states
- `cn()` from `@repo/ui` — never clsx/twMerge directly

### Marketing Site Components

`apps/marketing/modules/home/components/`: HeroSection, HeroWithCode, FeaturesGrid, HowItWorks, CtaFooter, PricingPlans, ContactForm
`apps/marketing/modules/shared/components/`: NavBar, Footer, ClientProviders, ConsentProvider, ColorModeToggle, ThemeProvider, LocaleSwitch

### Search Feature Components (29 files)

`apps/saas/modules/search/components/`: BillingPlanInfo, ConnectorCard, ConnectorWizard, ConnectorsPage, CreateSearchIndexDialog, CurationsPanel, DashboardOverview, EmptyState, GettingStarted, ImportJobsPanel, IndexRowActions, KnowledgeWorkbench, OverviewPage, PlaygroundPanel, ProjectOverview, ProjectsList, RelevanceTabs, SearchAnalyticsCards, SearchApiKeysPage, SearchApiKeysPanel, SearchDashboard, SearchIndexesList, SearchPreview, SearchPreviewPage, SearchUsageCard, SearchUsageCards, SyncJobsTable, SynonymsPanel, WidgetPanel

---

## 16. Search Module oRPC Procedures (26 total)

| Procedure                | Type | Description                 |
| ------------------------ | ---- | --------------------------- |
| `listIndexes`            | oRPC | List all indexes for org    |
| `createIndex`            | oRPC | Create new search index     |
| `importDocuments`        | oRPC | Bulk import via UI          |
| `importJobs`             | oRPC | Import job history          |
| `upsertDocument`         | oRPC | Single doc upsert           |
| `listApiKeys`            | oRPC | List API keys               |
| `createApiKey`           | oRPC | Create API key              |
| `createScopedToken`      | oRPC | Create HMAC scoped token    |
| `revokeApiKey`           | oRPC | Revoke API key              |
| `reindex`                | oRPC | Trigger alias-swap reindex  |
| `usage`                  | oRPC | Raw usage events            |
| `usageSummary`           | oRPC | Aggregated usage            |
| `topQueries`             | oRPC | Most frequent queries       |
| `recentActivity`         | oRPC | Activity feed               |
| `widgetConfig`           | oRPC | Widget snippet config       |
| `analytics`              | oRPC | Analytics data              |
| `pipelineStatus`         | oRPC | Ingest pipeline health      |
| `listDocuments`          | oRPC | List indexed documents      |
| `onboardingStatus`       | oRPC | Self-deriving checklist     |
| `retryFailedBatches`     | oRPC | Retry failed ingest batches |
| `schema.{get,update}`    | oRPC | Collection schema mgmt      |
| `synonyms.{get,update}`  | oRPC | Synonym management          |
| `curations.{get,update}` | oRPC | Curations management        |
| `listConnectorTokens`    | oRPC | Connector tokens            |
| `createConnectorToken`   | oRPC | Create connector token      |
| `revokeConnectorToken`   | oRPC | Revoke connector token      |
| `listConnectorSyncJobs`  | oRPC | Sync job history            |

---

## 17. MCP Server

`packages/aacsearch-mcp/` — Model Context Protocol server for AI agent integration:

- **Tools:** `search`, `list_indexes`, `upsert_document`, `search_stats`
- **Transport:** JSON-RPC 2.0 over stdio
- **Compatible with:** Claude Code, Cursor, any MCP client
- **Purpose:** Let AI agents search and manage AACsearch indexes programmatically

---

## 18. Roadmap Status

| Version | Status      | Contents                                                                                       |
| ------- | ----------- | ---------------------------------------------------------------------------------------------- |
| v0.x    | ✅ Shipped  | Search core, API keys, scoped tokens, rate-limit, quota, reindex, DB-first ingest, browser SDK |
| v0.5    | 🟡 Active   | Marketing site (apps/marketing)                                                                |
| v0.6    | ⏳ Deferred | Stripe billing wired to search-units + per-plan metering                                       |
| v0.7    | ⏳ Deferred | Public docs site (apps/docs)                                                                   |
| v1.0    | ⏳ Deferred | Self-host quickstart + Helm chart                                                              |
| R2      | ✅ Shipped  | Connector API, widget, owner discriminator, connector tokens, sync jobs, dashboard             |
| R2.5    | ✅ Shipped  | Knowledge module (RAG/GraphRAG), dashboard, analytics pipeline                                 |

---

## 19. Key Files Reference

### Config Files

| File                          | Purpose                                     |
| ----------------------------- | ------------------------------------------- |
| `.env.local`                  | Dev env vars                                |
| `.env.local.example`          | Template                                    |
| `apps/saas/config.ts`         | SaaS app config                             |
| `apps/marketing/config.ts`    | Marketing config                            |
| `packages/i18n/config.ts`     | i18n config                                 |
| `packages/auth/config.ts`     | Auth config                                 |
| `packages/payments/config.ts` | Payment provider + price IDs                |
| `packages/search/config.ts`   | Typesense config (prefix, batch size, etc.) |
| `packages/storage/config.ts`  | S3/MinIO config                             |
| `packages/mail/config.ts`     | Mail provider config                        |
| `tooling/tailwind/theme.css`  | Tailwind v4 design tokens                   |

### Entry Points

| File                                     | Purpose                       |
| ---------------------------------------- | ----------------------------- |
| `packages/api/index.ts`                  | Hono app — all routes mounted |
| `packages/api/orpc/router.ts`            | Root oRPC router (15 modules) |
| `packages/api/orpc/procedures.ts`        | Procedure type definitions    |
| `packages/api/orpc/handler.ts`           | rpcHandler + openApiHandler   |
| `apps/saas/app/api/[[...rest]]/route.ts` | SaaS API route (mounts Hono)  |
| `packages/search/index.ts`               | Search package exports        |

### Architecture Docs

| Path                                      | Purpose                                                           |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `AGENTS.md`                               | Full autonomous coding guide — all invariants, patterns, commands |
| `docs/plans/aacsearch/`                   | 10-document PRD vision pack                                       |
| `docs/plans/aacsearch/02-architecture.md` | System architecture deep-dive                                     |
| `docs/audits/infrastructure-audit.md`     | Infra audit (CI/CD, Docker, monitoring)                           |
