# AACsearch — Status PRD

> **Read this first** for orientation. Full vision and execution plan: [`docs/plans/aacsearch/`](./aacsearch/index.md).

## What it is

AACsearch is a hosted **search-as-a-service** for e-commerce and CRM catalogs. Self-hostable on this supastarter monorepo; ships with a managed cloud option.

Merchants install a CMS module (PrestaShop, Bitrix), connect their AACsearch project, and get a fast typo-tolerant search endpoint plus a hosted widget — without running Typesense ops themselves.

## Hard project constraint right now

**DB is frozen** — no Prisma migrations / schema deltas without explicit approval. Any feature that requires new persistence (`Project`, `Connector`, `SyncJob`, `WidgetConfig`, `AnalyticsEvent`, `UsageCounter` rollups, …) must call out the DB change up front and wait. Until then, build on the 25 existing models.

## Where we are vs. where we're going

| Status | Concept |
|---|---|
| ✅ Shipped | Search-as-a-service core (`packages/search`, `packages/api/modules/search`, `@repo/search-client`) |
| ✅ Shipped | Org-scoped auth + organizations as workspaces (supastarter base) |
| ✅ Shipped | API keys (hashed, scoped, origin-restricted, rate-limited) + scoped tokens (HMAC) |
| ✅ Shipped | Per-org plan quota (`searchLimits` in `@repo/payments`) |
| ✅ Shipped | Zero-downtime alias-swap reindex |
| ✅ Shipped | DB-first ingest (`SearchIngestBuffer` → worker → Typesense, partial-fail handling) |
| ✅ Shipped | Browser SDK (`@repo/search-client`, multi-search, error catalog) |
| 🟡 In progress | Marketing site (`apps/marketing`) — **v0.5 current focus** |
| 🟡 Partial | `recordSearchUsage` writes raw rows; `UsageCounter` rollup is deferred |
| ⏳ Planned (v0.6) | Stripe billing wired to search-units + per-plan metering |
| ⏳ Planned (v0.7) | Public docs site (`apps/docs`) |
| ⏳ Planned (v1.0) | Self-host quickstart + Helm chart |
| ❌ Not started | `Project` as a first-class DB entity (today implicit in `SearchIndex`) |
| ❌ Not started | `Connector` / `ConnectorToken` / `SyncJob` |
| ❌ Not started | Hosted widget (`packages/widget` + `typesense-instantsearch-adapter`) |
| ❌ Not started | PrestaShop module (`modules/prestashop/aacsearch`) |
| ❌ Not started | Bitrix module (`modules/bitrix/aac.search`) |
| ❌ Not started | `AnalyticsEvent` capture (search/click/zero-results) |
| 🛑 Out of scope (v1) | Vector / semantic / NL search; image / audio search; auto-crawling; A/B tests; SSO; multi-region; analytics replay UI |

## Half-orphaned — keep, don't extend

`@repo/billing-wallet`, `@repo/ai-core`, kopecks ledger, Tochka top-up driver, oRPC `billing-wallet` module, settings UI. Code is intact but **not** wired to search-units billing yet (that's v0.6). Do not extend without an explicit task.

## Removed in last commit (`84481e3`) — do NOT recreate

- `apps/saas/app/api/cron/sync-subscriptions/route.ts`
- `packages/api/lib/wallet-sync.ts`

## Out of repo (parked, do not influence)

- `archive/cursor-rules/dslmrank.mdc` — legacy rules from a different project (DSLMRank).
- `docs/plans/archive/dslmrank-build-plan-v2.md` — same.

These are kept for reference only and **must not** influence current work.

## Pricing posture (draft, not committed)

- **Free** — 10K units/month, 1 index, community support, `aacsearch.com` subdomain only.
- **Pro** ($29/mo) — 1M units/month, 10 indexes, custom origin allow-list, email support.
- **Enterprise** (custom) — unmetered, dedicated cluster, SSO, SLA 99.95%, audit log.

(One **search-unit** = 1 search request OR 1 document indexed.)

## Roadmap signal (loose)

- v0.x (now) — Single-doc upsert ✅, multi-search ✅, browser SDK ✅, scoped tokens ✅, rate-limit ✅, quota ✅, reindex ✅
- v0.5 — Public marketing site ⬅ **current focus**
- v0.6 — Stripe billing wired to search-units
- v0.7 — Public docs site (`apps/docs`)
- v1.0 — Self-host quickstart + Helm chart
- v1.x — CMS connectors (PrestaShop, Bitrix), hosted widget, full vision per `docs/plans/aacsearch/`

## Read in this order

1. **This file** — for status & guard-rails.
2. [`docs/plans/aacsearch/index.md`](./aacsearch/index.md) — pointer / TOC.
3. [`docs/plans/aacsearch/01-vision-scope.md`](./aacsearch/01-vision-scope.md) — vision & MVP scope.
4. The file matching the current task.
5. `agents.md` — coding conventions.
6. `~/.claude/skills/supastarter-nextjs-skill/SKILL.md` — workflow contract (Hard Invariants / Decision Gates / Task Recipes).
