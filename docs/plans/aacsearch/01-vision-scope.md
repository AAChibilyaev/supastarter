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

| Concept in vision                                          | State in code today                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Search-as-a-service core                                   | ✅ shipped (`packages/search`, `packages/api/modules/search`, `@repo/search-client`) |
| Org-scoped auth + org workspaces                           | ✅ shipped (supastarter base)                                                        |
| API keys (hashed, scoped, origin-restricted, rate-limited) | ✅ shipped                                                                           |
| Scoped tokens                                              | ✅ shipped (`packages/api/modules/search/lib/scoped-token.ts`)                       |
| Quota per plan                                             | ✅ shipped (`packages/payments/config.ts` → `searchLimits`)                          |
| Zero-downtime reindex                                      | ✅ shipped (`packages/search/lib/reindex.ts`)                                        |
| DB-first ingest pipeline                                   | ✅ shipped (`SearchIngestBuffer` → worker → Typesense)                               |
| Browser SDK                                                | ✅ shipped (`@repo/search-client`)                                                   |
| `Project` as separate entity inside org                    | ❌ not yet — currently 1 org = 1 implicit project, indexes hang directly off org     |
| `Connector` / `SyncJob` / `ConnectorToken`                 | ❌ not yet — no DB models                                                            |
| `WidgetConfig`                                             | ❌ not yet                                                                           |
| `AnalyticsEvent` (search / click / zero-results)           | ❌ not yet                                                                           |
| `UsageCounter` per-period rollups                          | 🟡 partial — `recordSearchUsage` writes raw rows, no rollup yet                      |
| Hosted widget package                                      | ❌ no `packages/widget`                                                              |
| PrestaShop module                                          | ❌ no module skeleton                                                                |
| Bitrix module                                              | ❌ no module skeleton                                                                |
| Marketing site                                             | 🟡 in progress (`apps/marketing`, v0.5 current focus)                                |
| Public docs site                                           | ❌ deferred to v0.7                                                                  |

This gap is what the roadmap in [05-roadmap-sprints.md](05-roadmap-sprints.md) closes.
