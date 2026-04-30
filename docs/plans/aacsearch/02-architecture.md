# 02 — Architecture

> **Read after [01-vision-scope.md](01-vision-scope.md).** Defines monorepo layout, product areas, the layered backend principle, reliability/ops contract.

## 2.1 Monorepo layout (target state)

The target layout below is what the repo should look like once the connector + widget tracks land. Items marked ❌ do not yet exist; do not invent paths that aren't here without an explicit task.

```
apps/
  marketing/                # Public site — landing, pricing, use-cases (PrestaShop search, Bitrix search), blog, changelog, legal
  saas/                     # Protected app — dashboard, projects, connectors, indexing, search preview, widget config, analytics, billing
  docs/                     # Public docs site (deferred to v0.7)
  mail-preview/             # Email template preview only

packages/                   # 17 workspace packages — all imported via @repo/<name>
  api/                      # Hono + oRPC. Modules: admin, ai, billing-wallet, entitlements, notifications, organizations, payments, search, users (9 oRPC modules). Public Hono routes: search public-handler, search connector-public, widget bundle, wallet webhook
  auth/                     # Better Auth — login/signup/sessions/orgs
  database/                 # Prisma + Drizzle. 25 Prisma models today. Prisma is the active ORM (Hard Invariant #13)
  ai/                       # Vercel AI SDK + provider configs (chat-style)
  ai-core/                  # Lower-level AI orchestration primitives (consumed by `ai` and `billing-wallet`)
  billing-wallet/           # BigInt-kopecks ledger, reserve→commit/release, Tochka top-up driver, scoped tokens. Active v0.6 metering wiring
  search/                   # Typesense client, versioned collections + alias swap, ingest-buffer worker (DB-first ingest, partial-fail handling)
  search-client/            # Browser-safe SDK (`@repo/search-client`). Only `ss_search_*` / `ss_scoped_*` tokens
  widget/                   # ✅ Vanilla JS storefront search widget (Shadow DOM, 14KB IIFE+ESM, served at `/api/widget/widget.js`). Hand-rolled — NOT InstantSearch.js + adapter
  i18n/                     # 5 locales × 4 scopes (en/de/es/fr/**ru** × marketing/saas/mail/shared)
  logs/                     # Logger
  mail/                     # React Email templates + provider drivers
  notifications/            # createNotification, list, mark-read, preferences, catalog
  payments/                 # Stripe / Lemonsqueezy / Polar / Creem / DodoPayments / **Tochka** (RU). Per-plan limits in config.ts (incl. `searchLimits`); `lib/entitlements.ts` (`checkQuota` / `checkHardLimit` / `resolveOrgPlan` / `invalidatePlanCache`); `wallet-webhook.ts`
  storage/                  # S3-compatible (MinIO local)
  ui/                       # Shadcn UI primitives — 27 of them (catalog: skill `ui-component-catalog.md`)
  utils/                    # Generic helpers (incl. `getBaseUrl`)
                            # Future packages (vision, ❌):
                            # connectors/  — shared TS contracts + signing helpers consumed by CMS modules (currently they hit Connector API directly)

modules/                    # ❗ NOT a Node workspace — PHP CMS modules (skeleton untracked WIP)
  prestashop/aacsearch/     # PrestaShop 8.x: Aacsearch.php class + config.xml + classes/{AacSearchClient,AacSearchProductExporter,AacSearchSyncQueue}.php + controllers/admin + views/templates
  bitrix/aac.search/        # 1C-Bitrix self-hosted: install/{index,version}.php + lib/Client.php (namespace AAC\Search, Bitrix\Main\Web\HttpClient + Option::get)

tooling/                    # Build tooling, shared TS configs, Tailwind v4 theme tokens
```

### Hard rule on new packages

Adding a new workspace package needs:

- ≥ 2 internal consumers, **OR**
- a stated external consumer (e.g. `@repo/search-client` is consumed by customer browsers).

Otherwise a new folder under an existing package suffices. We do **not** create one-consumer packages "for cleanliness".

## 2.2 Product areas (16)

These are the ownership boundaries used in the backlog (see [05-roadmap-sprints.md §5.4](05-roadmap-sprints.md#54-mvp-backlog)).

| #   | Product Area             | Covers                                                                                               |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| 1   | SaaS Foundation          | Supastarter setup, auth, organizations, protected dashboard, onboarding                              |
| 2   | Multi-tenancy            | Organization-as-workspace, role permissions, project switcher                                        |
| 3   | Projects / Stores        | AACsearch project model, store settings, allowed origins, locale, currency                           |
| 4   | Search Engine            | Typesense client, query builder, query parameters, relevance defaults                                |
| 5   | Typesense Infrastructure | Hosting, alias-swap reindex, schema migrations, health checks                                        |
| 6   | Indexing / Sync          | Full sync, delta sync, retries, sync-job state, ingest buffer                                        |
| 7   | PrestaShop Connector     | Module skeleton, settings, full + delta sync, widget injection, diagnostics                          |
| 8   | Bitrix Connector         | Module skeleton, settings, catalog/iblock selector, full + delta sync, widget component, diagnostics |
| 9   | Widget                   | Embeddable JS widget, modes (inline/modal), tracking, theme                                          |
| 10  | Relevance                | Ranking weights, synonyms, curations, presets, stopwords                                             |
| 11  | Analytics                | search/click/zero-results events, dashboard cards, retention                                         |
| 12  | Billing / Usage          | Plans, usage counters, limits, paywalls                                                              |
| 13  | API / Developer Platform | Public Connector API, public Search API, scoped tokens, OpenAPI                                      |
| 14  | Admin / Support          | Internal admin tools, debug views, replay tools                                                      |
| 15  | Documentation            | Install guides, troubleshooting, API reference                                                       |
| 16  | Distribution             | Module packaging, marketplace readiness, release artifacts                                           |

## 2.3 Layered backend principle (CRITICAL)

External modules and storefront browsers **never** talk to Typesense directly. Every request goes through AACsearch's API layer, which holds the only credentials with admin scope.

```
Correct flow ───────────────────────────────────────────────────
  PrestaShop / Bitrix module
    │  bearer(connector token)
    ▼
  AACsearch Connector API  (validate, auth, rate-limit)
    │
    ▼
  packages/search/lib/buffer.ts → enqueueManySearchIngest()
    │
    ▼
  Background worker  (drains buffer, batches by project + collection)
    │
    ▼
  Typesense admin client  (server-side only)
    │
    ▼
  Project collection / alias

Incorrect flow ──────────────────────────────────────────────────
  PrestaShop / Bitrix module ─────► Typesense admin API   ❌
  Storefront browser ─────────────► Typesense admin API   ❌
```

The reason this is non-negotiable: a Typesense admin key in customer's PHP module or in the storefront `<script>` tag is one leaked dev console away from arbitrary index manipulation across all our tenants.

This is **Hard Invariant #2** in `SKILL.md` ("DB-first ingest").

## 2.4 What we reuse from supastarter (never rebuild)

| Need                                         | Use from supastarter                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| SaaS shell (sidebar, settings, account)      | `apps/saas` + `apps/saas/modules/shared/components` (NavBar, PageHeader, SettingsList, …) |
| Marketing site shell (landing/pricing/legal) | `apps/marketing`                                                                          |
| Docs site shell (when v0.7 ships)            | `apps/docs`                                                                               |
| Auth — login/signup/roles/sessions           | `@repo/auth` (Better Auth)                                                                |
| Multi-tenancy / organizations                | `@repo/auth` org plugin + supastarter components                                          |
| API framework                                | Hono + oRPC (`packages/api`)                                                              |
| Frontend data fetching                       | TanStack Query via `@shared/lib/orpc-query-utils`                                         |
| Forms                                        | react-hook-form + zod, `@repo/ui/components/form`                                         |
| UI primitives                                | `@repo/ui/components/*` (27 shadcn-based, see ui-component-catalog)                       |
| Email                                        | `@repo/mail` (React Email templates + provider drivers)                                   |
| Payments                                     | `@repo/payments` (Stripe / Lemonsqueezy / Polar / Creem / DodoPayments)                   |
| Background jobs                              | trigger.dev (preferred for long sync jobs); QStash for serverless-only                    |
| Monitoring                                   | supastarter Sentry integration                                                            |
| Analytics (product/marketing)                | supastarter analytics providers                                                           |

## 2.5 What we add for AACsearch search

| Need                           | Library / approach                           |
| ------------------------------ | -------------------------------------------- |
| Typesense server client        | `typesense` (server-side only, admin key)    |
| Browser SDK                    | `@repo/search-client` (already shipped)      |
| InstantSearch adapter (widget) | `typesense-instantsearch-adapter`            |
| Widget UI                      | `instantsearch.js`                           |
| Optional dashboard preview     | `react-instantsearch`                        |
| Validation                     | `zod` (already used in API layer)            |
| Widget bundling                | `tsup`                                       |
| Widget CSS isolation           | Shadow DOM first; namespaced CSS as fallback |

> The `typesense-js` client supports both server-side and client-side use. In the browser we **only** allow search-only / scoped keys — never master/admin.

## 2.6 What we deliberately do not build

| Not building                      | Use instead                           |
| --------------------------------- | ------------------------------------- |
| Custom auth                       | Supastarter Better Auth               |
| Custom billing                    | Supastarter `@repo/payments`          |
| Custom search UI engine           | InstantSearch.js + Typesense adapter  |
| Custom queue engine               | trigger.dev / QStash                  |
| Custom CMS module injection hacks | PrestaShop hooks / Bitrix module APIs |
| Custom public docs engine         | Supastarter `apps/docs`               |
| Custom error tracking             | Supastarter / Sentry                  |

## 2.7 Reliability / ops contract

### Background-job catalog (target)

| Job                     | Trigger                        | Notes                                                 |
| ----------------------- | ------------------------------ | ----------------------------------------------------- |
| Full catalog sync       | Connector "Run sync" / install | Long; chunked; retryable                              |
| Delta sync processing   | Webhook from CMS module        | Short; retryable; ordered per product                 |
| Reindex (schema change) | Admin oRPC `reindex`           | Alias-swap; keep prev version                         |
| Schema migration        | One-shot, manual               | Admin only                                            |
| Usage aggregation       | Cron (daily / hourly)          | Rolls up `recordSearchUsage` rows into `UsageCounter` |
| Failed sync retry       | Cron / event                   | Exponential backoff                                   |
| Cleanup old events      | Cron (weekly)                  | Honor plan retention                                  |

### Retry policy

| Failure class             | Action                               |
| ------------------------- | ------------------------------------ |
| Network error             | Retry, exponential backoff           |
| 4xx validation            | **No retry**, surface in diagnostics |
| 429 / rate limit          | Retry later (jittered)               |
| Typesense temporary error | Retry                                |
| Schema error              | **Fail job**, require admin action   |

This matches the partial-fail handling already in `packages/search/lib/buffer.ts` (`markIngestRowsSuccess` / `markIngestRowsFailure`).

### Required diagnostics (per connector)

- API status / connectivity
- Module version
- Last heartbeat
- Last full sync timestamp + outcome
- Last delta sync timestamp + outcome
- Failed item count + last error
- Product count in current index
- Current index status (active version, alias target)

### Monitoring

- Sentry for exceptions (Supastarter integration).
- Job dashboard for sync / reindex visibility.
- Search latency metric (per project, p50/p95).
- Typesense health-check endpoint.
- Connector heartbeat alert.
- API error-rate alert (per route).

## 2.8 Anti-patterns observed in similar products (don't do these)

- Holding the Typesense admin key in the storefront `<script>` tag (some early Typesense demos do this — easy to leak).
- Storing API keys in plaintext "for debugging" — they leak through logs and admin tooling.
- Letting the CMS module write its own retry logic and bypass our API rate-limit — masks throttle signals.
- Treating "schema migration" as a Prisma-only concern when Typesense collection schema also has to change — leads to silent search failures after deploy.
- Indexing one document at a time from a webhook — N+1 round-trips to Typesense; always batch via the buffer.
