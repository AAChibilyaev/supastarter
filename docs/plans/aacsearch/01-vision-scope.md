# 01 — Vision & Scope

> **Read first.** Defines what AACsearch is, who it's for, and — equally important — what it is **not**.

## 1.1 Product vision

AACsearch is a hosted **search-as-a-service** for e-commerce and CRM catalogs, self-hostable on a supastarter monorepo and shipping with a managed cloud option.

A merchant installs one of our CMS modules (PrestaShop, Bitrix), connects their AACsearch project, and gets:

- a fast, typo-tolerant product search endpoint;
- a hosted widget that drops into the storefront with one `<script>` tag;
- facets, autocomplete, sorting, synonyms, curations, basic relevance controls;
- usage / zero-results / top-queries analytics;
- org-scoped auth, scoped tokens, origin allow-list, rate-limit, quota — all without running Typesense / Elasticsearch ops themselves.

The longer game is to be the default "search backend" small B2B SaaS reaches for instead of self-hosting Typesense or paying Algolia rates.

## 1.2 Target users (MVP)

In rank order of acquisition priority:

1. **Small / mid PrestaShop shops** that find their built-in search inadequate.
2. **1C-Bitrix self-hosted catalogs** with the same problem (Russian-speaking market, large segment).
3. **Indie SaaS / B2B teams** that want a search API without Typesense ops.
4. **Agencies** servicing the above — they install once, customers benefit.

**Not the target (v1):**

- Enterprise vector-search use cases (Pinecone / Weaviate territory).
- Image / audio search.
- Legal / medical / scientific document search (different relevance model).
- Internal-only enterprise search behind SSO.

## 1.3 Why exists vs. Algolia / Typesense Cloud / built-in CMS search

| Differentiator               | What we ship out of the box                                             |
| ---------------------------- | ----------------------------------------------------------------------- |
| Org-scoped auth              | Better Auth + organizations from day one (multi-tenant native).         |
| Scoped tokens                | Per-user, per-filter, per-TTL — no DIY JWTs.                            |
| Origin allow-list per key    | Stops key abuse from random domains.                                    |
| Quota & rate-limit dashboard | Built into the user SaaS, not a separate Grafana to set up.             |
| One self-host path           | Same code as managed cloud — no fork, no surprise.                      |
| CMS modules                  | PrestaShop + Bitrix shipped as modules, not as "integrate it yourself". |

## 1.4 North Star metric

```
Successful Search Sessions per Connected Store per Week
```

A **Successful Search Session** = a session where the user issues at least one query that returns ≥ 1 result and clicks one of them. Tracks both relevance quality (results returned) and product-market fit (worth clicking).

## 1.5 OKRs

### Objective 1 — Ship a usable MVP

```
KR1  User can create account, organization, project.
KR2  User can connect at least one PrestaShop or Bitrix store.
KR3  1k–10k products index without manual intervention.
KR4  Widget embeds on a real storefront with one script tag.
KR5  Search query returns results within project p95 latency target.
KR6  Dashboard shows searches, zero-results, clicks.
```

### Objective 2 — Make search a commercial product

```
KR1  Free / Starter / Pro / Business / Enterprise plans configured.
KR2  Usage counters track documents, searches, sync jobs, projects.
KR3  Limits enforce hard / soft per plan with upgrade CTA.
KR4  Stripe (or chosen provider) handles upgrades/downgrades.
KR5  Self-serve upgrade flow tested end-to-end.
```

### Objective 3 — Marketplace-ready CMS modules

```
KR1  Install flow ≤ 10–15 min for non-developer admin.
KR2  Module has admin settings page + diagnostics.
KR3  Full + delta sync work without merchant intervention.
KR4  Uninstall / disconnect flow leaves no orphaned state.
KR5  Docs cover installation + troubleshooting per module.
```

## 1.6 MVP scope — IN

### SaaS shell

| Area           | Scope                                                            |
| -------------- | ---------------------------------------------------------------- |
| Auth           | Supastarter Better Auth (login / signup / session)               |
| Organizations  | Supastarter organizations as workspaces                          |
| Projects       | New `Project` concept inside organization (logical, no DB yet)   |
| API            | Hono + oRPC (`packages/api`)                                     |
| Billing        | Free + Starter + Pro plan **config** (enforcement is next phase) |
| Usage counters | Searches, documents, sync jobs                                   |
| Onboarding     | Setup checklist on dashboard                                     |

### Search core

| Capability                            | Scope                                |
| ------------------------------------- | ------------------------------------ |
| Product collection                    | ✅                                   |
| Document upsert / import / delete     | ✅ single-doc, ✅ bulk via DB-buffer |
| Search API                            | ✅                                   |
| Multi-search (autocomplete + results) | ✅                                   |
| Facets                                | category, brand, price, availability |
| Sorting                               | relevance, price asc/desc, newest    |
| Highlighting                          | ✅                                   |
| Typo tolerance                        | basic Typesense defaults             |
| Zero-downtime reindex                 | ✅ alias-swap                        |
| Synonyms                              | beta after core lands                |
| Curations                             | beta after core lands                |
| Semantic / hybrid / NL search         | 🛑 not MVP                           |

### Connectors (CMS modules)

| Connector           | Status                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| PrestaShop          | ❌ planned for R2 — install, settings, full + delta sync, widget injection, diagnostics        |
| Bitrix self-hosted  | ❌ planned for R2 — install, settings, catalog sync, delta sync, widget/component, diagnostics |
| Bitrix24 cloud REST | 🛑 not MVP — split track after self-hosted Bitrix                                              |

### Widget

| Feature            | MVP        |
| ------------------ | ---------- |
| Hosted JS snippet  | ❌ planned |
| Inline search box  | ❌ planned |
| Search modal       | ❌ planned |
| Result grid / list | ❌ planned |
| Facets             | ❌ planned |
| Sorting            | ❌ planned |
| No-results state   | ❌ planned |
| Click tracking     | ❌ planned |
| Theme config       | basic only |

### Analytics

| Event          | Priority          |
| -------------- | ----------------- |
| `search_query` | P0                |
| `zero_results` | P0                |
| `result_click` | P0                |
| `widget_open`  | P1                |
| `filter_used`  | P1                |
| `add_to_cart`  | P1 (CMS-supplied) |
| `conversion`   | P1 (CMS-supplied) |

## 1.7 MVP scope — OUT (explicitly)

These exist as common asks and the answer is "no, not now":

- AI chat search.
- Full personalization profiles per visitor.
- Recommendations engine ("you may also like").
- A/B testing framework for relevance.
- Enterprise SSO (SAML / OIDC) — Better Auth org login is enough.
- Multi-region Typesense replication.
- Dedicated single-tenant clusters.
- Marketplace approval as MVP blocker — can ship outside marketplace first.
- Universal schema builder for arbitrary document types — products only.
- Connectors to "all CMSes" — PrestaShop + Bitrix only.
- Deep BI dashboard — only the dashboard cards in section 14.
- Full CRM analytics for Bitrix24 — separate scope.

If a request cites one of the above, surface it explicitly and ask whether scope should grow before writing code.

## 1.8 Definition of "MVP done"

```
User signs up → creates org → creates project →
generates connector token → installs PrestaShop or Bitrix module →
connects module → runs full sync → products are indexed →
tests search in dashboard → enables widget → storefront search works →
basic search / click / zero-results analytics appear in dashboard.
```

Plus the "Technical" and "Business" rows in [05-roadmap-sprints.md §5.5 — MVP acceptance criteria](05-roadmap-sprints.md#55-mvp-acceptance-criteria).

## 1.9 Current state vs. this vision

| Concept in vision                                          | State in code today                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search-as-a-service core                                   | ✅ shipped (`packages/search`, `packages/api/modules/search`, `@repo/search-client`)                                                                                                                                                                                                                  |
| Org-scoped auth + org workspaces                           | ✅ shipped (supastarter base)                                                                                                                                                                                                                                                                         |
| API keys (hashed, scoped, origin-restricted, rate-limited) | ✅ shipped                                                                                                                                                                                                                                                                                            |
| Scoped tokens                                              | ✅ shipped (`packages/api/modules/search/lib/scoped-token.ts`)                                                                                                                                                                                                                                        |
| Quota per plan                                             | ✅ shipped — `quotaCheck` middleware (`packages/api/modules/entitlements/middleware/quota-check.ts`) backed by `@repo/payments/lib/entitlements` (`checkQuota` / `checkHardLimit` / `resolveOrgPlan`); wired into `public-handler.ts` returning 429 `search_quota_exceeded` / `ingest_quota_exceeded` |
| Zero-downtime reindex                                      | ✅ shipped (`packages/search/lib/reindex.ts`)                                                                                                                                                                                                                                                         |
| DB-first ingest pipeline                                   | ✅ shipped (`SearchIngestBuffer` → worker → Typesense; partial-fail via `markIngestRowsSuccess` / `markIngestRowsFailure`)                                                                                                                                                                            |
| Browser SDK                                                | ✅ shipped (`@repo/search-client`)                                                                                                                                                                                                                                                                    |
| Hosted widget                                              | ✅ shipped — `packages/widget/` (Vanilla JS + Shadow DOM, 14KB IIFE+ESM, served at `/api/widget/widget.js`). Hand-rolled — **not** InstantSearch.js. Bootstrap via `<script data-*>` + `widget-config` oRPC                                                                                           |
| Connector API                                              | ✅ shipped — `packages/api/modules/search/connector-public.ts` (handshake / heartbeat / sync.full / sync.delta / delete / diagnostics). `ss_connector_*` Bearer tokens via `SearchApiKey.scopes=connector_write`                                                                                      |
| Entitlements oRPC module                                   | ✅ shipped — `packages/api/modules/entitlements/{router,procedures/plan,middleware/quota-check,middleware/feature-gate,plan}.ts`                                                                                                                                                                      |
| AACsearch rebrand (saas + marketing)                       | ✅ shipped in 5 locales (en/de/es/fr/**ru**) — commits `3566063`/`ce0574d`/`e0c8d04`/`c1463d3`                                                                                                                                                                                                        |
| `Project` as separate entity inside org                    | ❌ not yet — DB-frozen workaround: 1 `SearchIndex` = 1 implicit project                                                                                                                                                                                                                               |
| `Connector` / `SyncJob` / `ConnectorToken` (as DB models)  | 🟡 partial via DB-frozen workarounds — connector tokens reuse `SearchApiKey.scopes`, sync-jobs are **in-memory ephemeral** in `connector-public.ts`                                                                                                                                                   |
| `WidgetConfig` (DB model with draft/published)             | ❌ not yet — current widget config = inline `data-*` on `<script>`                                                                                                                                                                                                                                    |
| `AnalyticsEvent` (search / click / zero-results capture)   | ❌ not yet — widget can emit events client-side but no capture endpoint                                                                                                                                                                                                                               |
| `UsageCounter` per-period rollups                          | 🟡 partial — `recordSearchUsage` writes raw rows; rollup deferred (config-only quota in the meantime)                                                                                                                                                                                                 |
| PrestaShop module (`modules/prestashop/aacsearch/`)        | 🟡 skeleton untracked (`Aacsearch.php` + `config.xml` + `index.php` + `classes/` + `controllers/` + `views/`) — PS 8.x compliant                                                                                                                                                                      |
| Bitrix module (`modules/bitrix/aac.search/`)               | 🟡 skeleton untracked (`install/index.php` + `install/version.php` + `lib/Client.php`, namespace `AAC\Search`, `Bitrix\Main\Web\HttpClient`)                                                                                                                                                          |
| Marketing site                                             | ✅ shipped (rebrand complete in 5 locales — was v0.5 focus)                                                                                                                                                                                                                                           |
| v0.6 metering wiring (wallet/Tochka)                       | 🟡 active WIP this session — `packages/billing-wallet/*`, `wallet-webhook.ts`, `wallet-reconcile.ts`, Tochka driver, AiWalletCard / TopUpDialog UI, env `WALLET_CRON_SECRET` + `TOCHKA_*`                                                                                                             |
| Public docs site                                           | ❌ deferred to v0.7                                                                                                                                                                                                                                                                                   |

### Pattern: how DB-frozen features ship anyway

Three workarounds are used by current code to deliver functionality without new tables:

- **Additive scopes/columns on existing rows** — connector tokens reuse `SearchApiKey` with new `connector_write` scope and `ss_connector_*` prefix.
- **In-memory ephemeral state** — sync-job tracking in `connector-public.ts` (lost on restart, acceptable for MVP since CMS modules retry on heartbeat fail).
- **Config-only** — quota lives in `@repo/payments/lib/entitlements` (cached resolver), no `UsageCounter` rollup table yet.

When the gap above (`Project` as DB entity / `WidgetConfig` / `AnalyticsEvent` capture) becomes blocking, request a DB-unfreeze with explicit migration plan.

This gap is what the roadmap in [05-roadmap-sprints.md](05-roadmap-sprints.md) closes.
