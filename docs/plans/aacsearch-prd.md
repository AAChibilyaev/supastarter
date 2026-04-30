# AACsearch — Status PRD

> **Read this first** for orientation. Full vision and execution plan: [`docs/plans/aacsearch/`](./aacsearch/index.md).

## What it is

AACsearch is a hosted **search-as-a-service** for e-commerce and CRM catalogs. Self-hostable on this supastarter monorepo; ships with a managed cloud option.

Merchants install a CMS module (PrestaShop, Bitrix), connect their AACsearch project, and get a fast typo-tolerant search endpoint plus a hosted widget — without running Typesense ops themselves.

## Hard project constraint right now

**DB is frozen** — no Prisma migrations / schema deltas without explicit approval. When a feature needs persistence, prefer one of the patterns we've been using:

- **(a) Additive `scopes` / columns on existing rows.** Connector tokens reused `SearchApiKey` rows with a new `connector_write` scope and `ss_connector_*` prefix — no separate `ConnectorToken` table.
- **(b) In-memory ephemeral state.** Connector sync-job tracking lives in-memory in `connector-public.ts` (lost on restart, acceptable for MVP).
- **(c) Config-only.** Plan quotas live in `@repo/payments/lib/entitlements` (config + cache); no `UsageCounter` rollup table yet.

Anything that _cannot_ fit (a)/(b)/(c) — `Project` first-class entity, `WidgetConfig`, `AnalyticsEvent` — must call out the DB change and wait. Until then, `Project` is implicit (1 SearchIndex = 1 logical project), `WidgetConfig` is the inline `data-*` attributes on the `<script>` tag, `AnalyticsEvent` capture is **not yet implemented**.

## Where we are vs. where we're going

| Status                | Concept                                                                                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ Shipped            | Search-as-a-service core (`packages/search`, `packages/api/modules/search`, `@repo/search-client`)                                                                                                                |
| ✅ Shipped            | Org-scoped auth + organizations as workspaces (supastarter base)                                                                                                                                                  |
| ✅ Shipped            | API keys (hashed, scoped, origin-restricted, rate-limited) + scoped tokens (HMAC over `BETTER_AUTH_SECRET`)                                                                                                       |
| ✅ Shipped            | Per-org plan quota — via `quotaCheck` middleware (`packages/api/modules/entitlements/middleware/quota-check.ts`) backed by `@repo/payments/lib/entitlements` (`checkQuota` / `checkHardLimit` / `resolveOrgPlan`) |
| ✅ Shipped            | Zero-downtime alias-swap reindex (`reindexCollection` in `packages/search/lib/reindex.ts`)                                                                                                                        |
| ✅ Shipped            | DB-first ingest (`SearchIngestBuffer` → worker → Typesense; partial-fail handling via `markIngestRowsSuccess` / `markIngestRowsFailure`)                                                                          |
| ✅ Shipped            | Browser SDK (`@repo/search-client`, multi-search, error catalog)                                                                                                                                                  |
| ✅ Shipped            | **Hosted widget** (`packages/widget` — Vanilla JS + Shadow DOM, 14KB IIFE+ESM, served at `/api/widget/widget.js`) + `WidgetPanel` install-snippet UI (commit `e72c082`)                                           |
| ✅ Shipped            | **Connector API** (`packages/api/modules/search/connector-public.ts` — handshake / heartbeat / sync.full / sync.delta / delete / diagnostics; `ss_connector_*` Bearer tokens) — commit `fa6cffe`                  |
| ✅ Shipped            | **Entitlements oRPC module** (`packages/api/modules/entitlements/`) — `getPlanInfo` procedure + `quotaCheck` / `feature-gate` middleware                                                                          |
| ✅ Shipped            | AACsearch rebrand across `apps/saas` + `apps/marketing` in **5 locales** (en/de/es/fr/**ru**) — commits `3566063`/`ce0574d`/`e0c8d04`/`c1463d3`                                                                   |
| ✅ Shipped            | Single search-dashboard route at `apps/saas/.../[organizationSlug]/search/page.tsx` with 5 panels (`SearchIndexesList`, `SearchApiKeysPanel`, `SearchUsageCard`, `CreateSearchIndexDialog`, `WidgetPanel`)        |
| 🟡 Active WIP         | **v0.6 metering** — Tochka top-up driver (`packages/payments/provider/tochka-wallet/*`), `wallet-webhook.ts`, `wallet-reconcile.ts`, `AiWalletCard` UI, `TopUpDialog`, `format-kopecks`, ai-credits page          |
| 🟡 Skeleton untracked | **PrestaShop module** at `modules/prestashop/aacsearch/` — `Aacsearch.php` + `config.xml` + `index.php` + `classes/` + `controllers/` + `views/` (PrestaShop 8.x compliant scaffolding)                           |
| 🟡 Skeleton untracked | **Bitrix module** at `modules/bitrix/aac.search/` — `install/index.php` + `install/version.php` + `lib/Client.php` (namespace `AAC\Search`, `Bitrix\Main\Web\HttpClient`)                                         |
| 🟡 Partial            | `recordSearchUsage` writes raw rows; `UsageCounter` rollup is deferred (config-only quota in the meantime)                                                                                                        |
| ⏳ Planned (v0.7)     | Public docs site (`apps/docs`)                                                                                                                                                                                    |
| ⏳ Planned (v1.0)     | Self-host quickstart + Helm chart                                                                                                                                                                                 |
| ❌ Not started        | `Project` as a first-class DB entity (today implicit in `SearchIndex`)                                                                                                                                            |
| ❌ Not started        | `Connector` / `ConnectorToken` / `SyncJob` as DB models (today: `SearchApiKey.scopes=connector_write` + in-memory job map)                                                                                        |
| ❌ Not started        | `WidgetConfig` DB model (today: inline `data-*` attrs only — no draft/published versioning)                                                                                                                       |
| ❌ Not started        | `AnalyticsEvent` capture (search/click/zero-results widget events)                                                                                                                                                |
| ❌ Not started        | Saas dashboard split: dedicated routes for Connectors hub, Sync Jobs, Search Playground, Analytics, Reindex Center, Schema Manager (today: 1 page with 5 panels)                                                  |
| 🛑 Out of scope (v1)  | Visual builder (drag-and-drop canvas, multi-framework codegen, plugin system, real-time collab) — see [`docs/plans/aacsearch/01-vision-scope.md §1.7`](./aacsearch/01-vision-scope.md)                            |
| 🛑 Out of scope (v1)  | Vector / semantic / NL search; image / audio search; auto-crawling; A/B tests; full personalization; SSO; multi-region; analytics replay UI                                                                       |

## Active wallet/billing surface (v0.6 in progress)

`@repo/billing-wallet`, `@repo/ai-core`, kopecks ledger, Tochka top-up driver, oRPC `billing-wallet` module, settings UI. **Status: actively wired** as v0.6 metering during this session — env vars `WALLET_CRON_SECRET` + `TOCHKA_*` added; wallet-webhook + wallet-reconcile + UI being iterated. If your task references billing/Tochka/topup, proceed; otherwise confirm scope before extending.

## Removed in commit `84481e3` — do NOT recreate

- `apps/saas/app/api/cron/sync-subscriptions/route.ts`
- `packages/api/lib/wallet-sync.ts`

## Out of repo (parked, do not influence)

- `archive/cursor-rules/dslmrank.mdc` — legacy rules from a different project (DSLMRank).
- `docs/plans/archive/dslmrank-build-plan-v2.md` — same.

## Pricing posture (draft, not committed)

- **Free** — 10K units/month, 1 index, community support, `aacsearch.com` subdomain only.
- **Pro** ($29/mo) — 1M units/month, 10 indexes, custom origin allow-list, email support.
- **Enterprise** (custom) — unmetered, dedicated cluster, SSO, SLA 99.95%, audit log.

(One **search-unit** = 1 search request OR 1 document indexed. Quota enforcement lives in `@repo/payments/lib/entitlements`.)

## Roadmap signal (loose)

- v0.x — Single-doc upsert ✅, multi-search ✅, browser SDK ✅, scoped tokens ✅, rate-limit ✅, quota ✅, reindex ✅
- v0.5 — AACsearch rebrand + marketing site ✅ **shipped**
- v0.6 — Search-units metering wired into payment provider (Tochka active for RU; Stripe path is parallel option) — **🟡 active WIP**
- R2 (overlapping with v0.6) — Connector API ✅ + Hosted widget ✅; PrestaShop & Bitrix modules **🟡 skeleton, finish wiring**
- v0.7 — Public docs site (`apps/docs`)
- v1.0 — Self-host quickstart + Helm chart
- v1.x — Search Playground, Analytics dashboard, Reindex Center, Schema Manager, Widget Config UI (DB unfreeze required for some)

## Read in this order

1. **This file** — for status & guard-rails.
2. [`docs/plans/aacsearch/index.md`](./aacsearch/index.md) — pointer / TOC.
3. [`docs/plans/aacsearch/01-vision-scope.md`](./aacsearch/01-vision-scope.md) — vision & MVP scope.
4. The file matching the current task.
5. `agents.md` — coding conventions.
6. `~/.claude/skills/supastarter-nextjs-skill/SKILL.md` — workflow contract (Hard Invariants / Decision Gates / Task Recipes).
