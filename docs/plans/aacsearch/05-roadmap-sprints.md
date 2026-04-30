# 05 — Roadmap, Sprints, Billing, Acceptance

> **Read after [04-connectors-widget.md](04-connectors-widget.md), or jump straight here when planning a release.** Defines the release plan R0–R5, the MVP backlog, sprints 1–4, billing/usage plans, docs site structure, MVP acceptance, and execution order.

## 5.1 Roadmap hierarchy (used in trackers)

```
Workspace / Product
└── Product Area                         ← see [02-architecture.md §2.2]
    └── Objective / OKR                  ← see [01-vision-scope.md §1.5]
        └── Initiative
            └── Epic
                └── Feature
                    └── User Story
                        └── Task
                            └── Subtask
```

Practical (Notion / Linear / Jira) collapsing:

```
Objective → Initiative → Epic → Feature/Story → Task → Subtask
```

Priority is a separate **field**, never a tree level:

| Priority | Meaning                                |
| -------- | -------------------------------------- |
| P0       | Critical / blocker for current release |
| P1       | Must-have for next release             |
| P2       | Nice-to-have                           |
| P3       | Idea / discovery                       |

## 5.2 Release plan R0 → R5

### R0 — Foundation (✅ done)

```
Goal: Supastarter prepared for AACsearch.

Exit criteria:
  ✓ Supastarter runs locally + staging.
  ✓ SaaS app has AACsearch dashboard area (apps/saas/modules/search).
  ✓ Marketing app has AACsearch landing scaffold.
  ✓ Docs app placeholder (apps/docs).
  ✓ Protected dashboard route exists.
  ✓ Project / Index creation flow exists.
  ✓ Typesense dev instance available (Docker).
```

### R1 — Vertical Slice (✅ done)

```
Goal: search works end-to-end without an external CMS.

Exit criteria:
  ✓ Demo / hand-pushed products indexed.
  ✓ Search API returns results.
  ✓ Dashboard search preview works.
  ✓ Browser SDK (@repo/search-client) talks to public-handler.
  ✓ Search-only key strategy in place (origin allow-list, rate-limit, hashed storage).
  ✓ Scoped tokens land.
  ✓ Quota enforcement against per-org plan (`searchLimits`).
  ✓ Zero-downtime alias-swap reindex.
  ✓ DB-first ingest pipeline (buffer → worker).
```

### R2 — Connector Alpha (🟡 partially shipped)

```
Goal: real shops start syncing.

Exit criteria:
  ✅ Connector API stable (handshake / sync.full / sync.delta / delete / diagnostics) — commit fa6cffe
  ✅ Connector tokens generated, hashed, scoped — `ss_connector_*` via SearchApiKey.scopes=connector_write
  ✅ Hosted widget shipped — packages/widget/ (Vanilla JS, Shadow DOM, 14KB) — commit e72c082
  🟡 PrestaShop module installs; full sync works — Aacsearch.php skeleton in modules/prestashop/aacsearch/ (untracked)
  🟡 Bitrix module installs; full sync works — lib/Client.php skeleton in modules/bitrix/aac.search/ (untracked)
  ❌ Sync job status visible in dashboard — currently in-memory only, no UI
```

### R3 — Private Beta (❌)

```
Goal: 3–5 test shops on real product.

Exit criteria:
  ─ Delta sync works for create/update/delete + price/stock/category.
  ─ Retries work (exponential backoff; partial-fail handling).
  ─ Diagnostics page exists per connector.
  ─ Zero-results analytics visible.
  ─ Synonyms / curations beta.
  ─ Docs cover installation + troubleshooting.
```

### R4 — Paid Beta (❌)

```
Goal: monetize.

Exit criteria:
  ─ Plans configured.
  ─ Usage counters visible in dashboard.
  ─ Plan limits enforce (warn → block).
  ─ Upgrade CTA works at limit boundaries.
  ─ Payment provider (Stripe via @repo/payments) wired to upgrades/downgrades.
  ─ Support / admin debug flow exists.
```

### R5 — Public v1 (❌)

```
Goal: public launch.

Exit criteria:
  ─ Landing, pricing, docs, changelog complete.
  ─ Stable connector versions packaged for marketplaces.
  ─ Monitoring + error tracking enabled.
  ─ Security checklist complete (see [03-domain-api.md §3.5]).
  ─ Legal pages ready (terms, privacy, data deletion).
```

## 5.3 MVP backlog (R1–R3 horizon)

| Name                             | Type       | Area         | Priority | Release |
| -------------------------------- | ---------- | ------------ | -------- | ------- |
| Launch AACsearch MVP             | Objective  | Product      | P0       | R1–R3   |
| Supastarter AACsearch Foundation | Initiative | SaaS         | P0       | R0 ✅   |
| Project model + dashboard shell  | Epic       | SaaS         | P0       | R0 ✅   |
| Typesense Search Core            | Initiative | Search       | P0       | R1 ✅   |
| ProductDocument schema v1        | Epic       | Search       | P0       | R1      |
| Indexing API v1                  | Epic       | API          | P0       | R1 ✅   |
| Search API v1                    | Epic       | API          | P0       | R1 ✅   |
| Hosted Search Widget             | Initiative | Widget       | P0       | R1 ❌   |
| Connector API contract           | Epic       | Connectors   | P0       | R2 ❌   |
| PrestaShop Connector MVP         | Initiative | PrestaShop   | P0       | R2 ❌   |
| Bitrix Connector MVP             | Initiative | Bitrix       | P0       | R2 ❌   |
| Sync Jobs and Retries            | Epic       | Reliability  | P0       | R2 ❌   |
| Search Analytics MVP             | Initiative | Analytics    | P1       | R3 ❌   |
| Usage Limits                     | Epic       | Billing      | P1       | R3 ❌   |
| Synonyms Beta                    | Epic       | Relevance    | P1       | R3 ❌   |
| Curations Beta                   | Epic       | Relevance    | P1       | R3 ❌   |
| Docs and Onboarding              | Initiative | Docs         | P1       | R3 ❌   |
| Marketplace Packaging            | Epic       | Distribution | P2       | R4 ❌   |
| Semantic / Hybrid Search         | Epic       | AI Search    | P2       | v1+     |
| Recommendations                  | Epic       | Growth       | P3       | v1+     |

## 5.4 Sprints 1–4

### Sprint 1 — Foundation + Search Core (✅ DONE)

| Task                                | Pri | Status | Evidence                                                                     |
| ----------------------------------- | --- | ------ | ---------------------------------------------------------------------------- |
| AACsearch dashboard area            | P0  | ✅     | `apps/saas/.../[organizationSlug]/search/page.tsx` + `SearchDashboard`       |
| Project concept in app layer        | P0  | 🟡     | Implicit via `SearchIndex` (DB-frozen workaround); first-class entity is ❌  |
| Typesense server client             | P0  | ✅     | `packages/search/lib/client.ts`                                              |
| `ProductDocument` schema v1         | P0  | ✅     | `packages/search/lib/collections.ts`                                         |
| Collection create / upsert / delete | P0  | ✅     | `packages/api/modules/search/procedures/{create-index,upsert-document}.ts`   |
| Search API v1                       | P0  | ✅     | `packages/api/modules/search/public-handler.ts` (+quotaCheck middleware)     |
| Dashboard search preview            | P0  | ✅     | `SearchIndexesList` + `WidgetPanel` install snippet                          |
| Widget prototype                    | P0  | ✅     | `packages/widget/` — Vanilla JS + Shadow DOM, 14KB IIFE+ESM (commit e72c082) |

### Sprint 2 — Connector Contract + PrestaShop (🟡 partial — contract DONE, module skeleton WIP)

| Task                          | Pri | Status | Evidence                                                                         |
| ----------------------------- | --- | ------ | -------------------------------------------------------------------------------- |
| Define Connector API contract | P0  | ✅     | `packages/api/modules/search/connector-public.ts` (commit fa6cffe)               |
| Connector token generation    | P0  | ✅     | `ss_connector_*` via `SearchApiKey.scopes=connector_write` (no separate table)   |
| PrestaShop module skeleton    | P0  | 🟡     | `modules/prestashop/aacsearch/Aacsearch.php` (PS 8.x) + `config.xml` — untracked |
| PrestaShop settings page      | P0  | ❌     | `controllers/admin/AdminAacSearchController.php` referenced but not present      |
| PrestaShop full sync          | P0  | ❌     | `classes/AacSearchProductExporter.php` referenced but not present                |
| Sync job status page          | P0  | ❌     | Sync-job tracking is **in-memory ephemeral**; no dashboard surface yet           |
| Widget install snippet        | P0  | ✅     | `apps/saas/modules/search/components/WidgetPanel.tsx` (copy snippet + 3 steps)   |

### Sprint 3 — Bitrix + Delta Sync

| Task                      | Pri | DoD                             |
| ------------------------- | --- | ------------------------------- |
| Bitrix module skeleton    | P0  | Module installs                 |
| Bitrix settings page      | P0  | API URL / project / token saved |
| Catalog / iblock selector | P0  | Admin selects catalog           |
| Bitrix full sync          | P0  | Products sync                   |
| Delta sync endpoint       | P0  | Update / delete works           |
| PrestaShop delta hooks    | P0  | product update / delete handled |
| Diagnostics contract      | P0  | Modules report status / errors  |

### Sprint 4 — Analytics + Hardening

| Task                        | Pri | DoD                        |
| --------------------------- | --- | -------------------------- |
| Track `search_query`        | P1  | Queries visible            |
| Track `result_click`        | P1  | Clicks visible             |
| Track `zero_results`        | P1  | Empty queries visible      |
| Failed sync retries         | P0  | Failed jobs retry safely   |
| Usage counters design       | P1  | Usage visible in dashboard |
| Plan limit checks           | P1  | Limits warn / block        |
| Installation docs           | P1  | Test merchant can install  |
| Monitoring / error tracking | P0  | Production errors visible  |

## 5.5 Billing — plans and usage

Supastarter's `@repo/payments` already supports multi-provider (Stripe / Lemonsqueezy / Polar / Creem / DodoPayments), subscriptions, upgrades / downgrades, billing portal, paywalls. We layer **usage limits** on top — billing is built around usage gates, not just access gates.

### MVP plans

| Plan                 | Limits                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Free**             | 1 project · 500 products · 1k searches/mo · AACsearch branding · `aacsearch.com` subdomain only · community support |
| **Starter** ($29/mo) | 3 projects · 10k products · 50k searches/mo · custom origin allow-list · email support                              |
| **Pro** ($99/mo)     | 10 projects · 100k products · 500k searches/mo · curations · advanced analytics · priority sync · no branding       |
| **Business**         | Custom limits · multi-user teams · SLA · custom onboarding · advanced relevance · API access                        |
| **Enterprise**       | Dedicated cluster · custom contract · SSO · audit logs · custom connector                                           |

### Metered counters

```
indexed_documents
monthly_searches
sync_jobs
api_requests
projects
connectors
team_members
analytics_retention_days
```

### Enforcement (MVP)

```
Free:
  ─ HARD limit on products (block over-quota indexing).
  ─ SOFT warning on searches (toast + email) before HARD block at threshold.

Starter / Pro:
  ─ HARD product limit.
  ─ SOFT search warning, then HARD search limit after grace threshold (e.g. 110%).
```

### Acceptance

```
✓ Plan config exists.
✓ Usage counters tracked per period.
✓ Dashboard shows usage.
✓ API checks quota before indexing / searching.
✓ Upgrade CTA appears near limits.
```

## 5.6 Documentation site (apps/docs) — structure

Deferred to **v0.7**, but the structure is fixed so connector + widget specs can link forward:

```
docs/
  getting-started/
    what-is-aacsearch
    create-project
    quickstart

  prestashop/
    install-module
    configure-module
    full-sync
    widget-installation
    troubleshooting

  bitrix/
    install-module
    configure-module
    catalog-sync
    widget-component
    troubleshooting

  widget/
    installation
    configuration
    theming
    events
    security

  api/
    connector-api
    search-api
    events-api
    authentication
    errors

  relevance/
    product-schema
    facets
    sorting
    synonyms
    curations

  billing/
    plans
    usage-limits
    overages

  operations/
    diagnostics
    reindexing
    common-errors
```

## 5.7 MVP acceptance criteria

### User flow

```
User signs up.
User creates organization.
User creates AACsearch project.
User generates connector token.
User installs PrestaShop or Bitrix module.
User connects module to project.
User runs full sync.
Products are indexed.
User tests search in dashboard.
User enables widget.
Storefront search works.
Search / click / zero-results analytics appear.
```

### Technical

```
Search API never exposes admin key.
Connector tokens are scoped + hashed.
Product sync is retryable.
Project data is isolated per tenant.
Typesense alias-swap strategy in place.
Failed sync visible in diagnostics.
Basic rate limits exist.
Errors logged.
Docs explain installation.
```

### Business

```
3 test stores connected.
1 real merchant validates usefulness.
Search quality is good for common product queries.
Onboarding completes without custom development.
Pricing / limits are clear enough for paid beta.
```

## 5.8 Execution order — what to do first

```
1.  Supastarter AACsearch dashboard shell        ✅ done
2.  Project model at application level           🟡 partial (Project ↔ Index)
3.  Typesense dev integration                    ✅ done
4.  ProductDocument schema v1                    ✅ done
5.  Demo product import path                     ✅ done (single-doc + bulk via buffer)
6.  Search API                                   ✅ done
7.  Dashboard search preview                     ✅ done
8.  Widget prototype                              ✅ done — packages/widget/ Vanilla JS (NOT InstantSearch — see §4.3)
9.  Connector API contract                        ✅ done — packages/api/modules/search/connector-public.ts
10. PrestaShop module full sync                   🟡 NEXT — skeleton in modules/prestashop/aacsearch/ (untracked); needs Client/Exporter/SyncQueue classes + AdminController + sync wiring
11. Bitrix module full sync                       🟡 in flight — skeleton in modules/bitrix/aac.search/ (untracked); needs ProductExporter + SyncAgent + EventHandlers + admin pages
12. Delta sync                                     ❌ — endpoint exists (`/sync/delta`); CMS-side hooks (PrestaShop `actionProductUpdate` / Bitrix iblock events) wire-up not done
13. Analytics capture                              ❌ — widget has client emit hooks but no `POST /api/events` capture endpoint yet
14. Billing limits                                 🟡 active WIP — quotaCheck middleware shipped; Tochka top-up driver + wallet-webhook in `git status` uncommitted
15. Docs                                           ❌ (v0.7)
16. Private beta                                   ❌ (R3)
```

### Hard rule on order

#10 + #11 are the **current bottleneck** — Connector API contract (#9) is stable, so PrestaShop/Bitrix module classes can be filled in. Don't start #12 (delta sync wiring) until #10/#11 full sync round-trip works against a real shop.

## 5.9 What this roadmap deliberately does not say

- It does not commit dates. R2 starts when R1 is shippable, not by the calendar.
- It does not commit which CMS module ships first. PrestaShop and Bitrix are sequenced as Sprint 2 / Sprint 3 above, but if a real merchant pulls one earlier, swap them.
- It does not commit a free-tier search-unit number. The 1k/mo number above is a placeholder until Sprint 4 picks a real metering model.
- It does not commit Bitrix24 cloud REST. That's a separate connector track post-MVP.
