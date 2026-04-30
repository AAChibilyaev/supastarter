# AACsearch — Product Spec (v0.1)

> Hosted search-as-a-service. Self-hostable on supastarter monorepo, ships with managed cloud option.

## What it is

A drop-in search API for product teams. You push documents, you get a search endpoint with auth, scoped tokens, origin allow-list, rate-limit and quota — all without running Typesense/Elastic yourself.

## Who it's for

- **Indie SaaS teams** that need search but don't want to run Typesense/Elasticsearch ops.
- **Frontend devs** at small B2B companies that need fast typo-tolerant search on their public catalog/docs/help-center.
- **Not** for enterprise vector-search use cases (different category — Pinecone, Weaviate).

## Why it exists (vs Algolia / Typesense Cloud)

- **Org-scoped auth out of the box**: Better Auth + organizations, multi-tenant from day one.
- **Scoped tokens**: per-user, per-filter, per-TTL — no need to mint your own JWTs.
- **Origin allow-list per key**: stop key abuse from random domains.
- **Quota & rate-limit dashboard** built into the user SaaS, not a separate Grafana you have to set up.
- **One self-host path**: same code as managed cloud — no fork, no surprises.

## Non-goals (v1)

- No vector search (separate product later).
- No automatic crawling — users push documents via API.
- No image search, no audio.
- No analytics replay UI in v1 — just usage counters.

## Surfaces

| Surface | Scope | Where |
|---------|-------|-------|
| Public marketing site | What/why/pricing/docs links | `apps/marketing` (`aacsearch.com`) |
| User dashboard | Indexes, keys, scoped tokens, usage | `apps/saas` (`app.aacsearch.com`) |
| Public search API | `/api/v1/search`, `/api/v1/multi-search` | `packages/api/modules/search/public-handler.ts` |
| Admin oRPC | CRUD indexes/keys/tokens, reindex | `packages/api/modules/search/procedures/*` |
| Browser SDK | `@repo/search-client` (published as `aacsearch-js` later) | `packages/search-client/` |

## Pricing model (draft)

Search-units (1 unit = 1 search request OR 1 document indexed). 3 plans:

- **Free** — 10K units/month, 1 index, community support, `aacsearch.com` subdomain only.
- **Pro** ($29/mo) — 1M units/month, 10 indexes, custom origin allow-list, email support.
- **Enterprise** (custom) — unmetered, dedicated cluster, SSO, SLA 99.95%, audit log.

## Roadmap signal (loose, not committed)

- v0.x (now) — Single-doc upsert ✅, multi-search ✅, browser SDK ✅, scoped tokens ✅, rate-limit ✅, quota ✅, reindex ✅
- v0.5 — Public marketing site ⬅ **current focus**
- v0.6 — Stripe billing wired to search-units
- v0.7 — Public docs site (apps/docs)
- v1.0 — Self-host quickstart + Helm chart

## Out of repo (parked)

- `archive/cursor-rules/dslmrank.mdc` — legacy rules from a different project (DSLMRank).
- `docs/plans/archive/dslmrank-build-plan-v2.md` — same.

These are kept for reference only and **must not** influence current work.
