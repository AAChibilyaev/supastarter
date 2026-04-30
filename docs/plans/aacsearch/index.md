# AACsearch — Plan Index

> Master vision and execution plan for AACsearch on the supastarter monorepo.
> Single source of truth for **what we're building, in what order, and why**.

## Status legend (used across these files)

- ✅ **Shipped** — present in code, callable today.
- 🟡 **In progress** — partially landed; gaps documented inline.
- ⏳ **Planned** — committed for an upcoming release; not yet in code.
- ❌ **Not started** — vision-stage; no code, no DB, may be re-scoped.
- 🛑 **Out of scope** — explicitly deferred or dropped.

## Hard constraints (apply across all files)

1. **DB is frozen.** No Prisma migrations / schema deltas while this constraint stands. Logical domain entities below (`Project`, `Connector`, `SyncJob`, …) describe shape, not persistence. When a feature needs storage, the implementation task **must** call out the DB change and get explicit approval first.
2. **No fork of supastarter.** We layer on top: `apps/marketing`, `apps/saas`, `apps/docs`, `apps/mail-preview` plus `packages/*`. We don't rename, restructure, or hide the supastarter base.
3. **No vendoring of Typesense.** We use the upstream `typesense` JS client server-side; admin keys never leave server. The browser SDK (`@repo/search-client`) talks only to our public-handler.
4. **No CMS-side database writes.** PrestaShop / Bitrix modules **never** call Typesense directly — they always go through the AACsearch Connector API. Reason: admin keys must never live in customer's storefront environment.

## Files in this folder

| #   | File                                               | Covers                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | [01-vision-scope.md](01-vision-scope.md)           | Product vision, target users, MVP scope, non-goals, North Star metric, OKRs                                                                                                                                                                                     |
| 02  | [02-architecture.md](02-architecture.md)           | Monorepo layout (apps + packages), product areas, layered backend principle, reliability/ops contract                                                                                                                                                           |
| 03  | [03-domain-api.md](03-domain-api.md)               | Logical domain model (DB-free), `ProductDocument` schema v1, Connector / Search / Dashboard API contracts, security model                                                                                                                                       |
| 04  | [04-connectors-widget.md](04-connectors-widget.md) | PrestaShop module spec, Bitrix module spec, hosted search widget spec, Typesense MVP relevance, analytics event schema                                                                                                                                          |
| 05  | [05-roadmap-sprints.md](05-roadmap-sprints.md)     | Release plan R0–R5, MVP backlog, sprints 1–4, billing/usage plans, docs site structure, acceptance criteria, "what to do first"                                                                                                                                 |
| 06  | [06-ui-pages.md](06-ui-pages.md)                   | SaaS dashboard sitemap & UX blueprints — 9 nav items (Start / Overview / Search / Analytics / Relevance / Connectors / Org settings / Account / Admin), block compositions from existing UI catalog, DB-frozen workarounds, implementation sequence Sprints A–E |
| 07  | [07-knowledge.md](07-knowledge.md)                 | **Knowledge module** (RAG / GraphRAG) — separate product surface from Search. Schema (KnowledgeSpace/Document/Chunk/Graph), 9 oRPC procedures, UI, hard invariants (owner isolation, no public-handler, cite-or-refuse), open questions (vector index, embedding provider, chunking), proposed §1.7 OUT list amendment |

## Companion docs

- `docs/plans/aacsearch-prd.md` — **Status PRD** (what is shipped vs. what is vision). Read this first for orientation.
- `agents.md` — coding conventions for this repo.
- `~/.claude/skills/supastarter-nextjs-skill/SKILL.md` — workflow contract (Hard Invariants / Decision Gates / Task Recipes).

## Reading order

1. `aacsearch-prd.md` — **5 min** — what's the current state.
2. `01-vision-scope.md` — **10 min** — what we're aiming for and what we explicitly don't build.
3. The file matching your current task domain.
4. `05-roadmap-sprints.md` — only when planning a new release or picking up a sprint.

Don't load all five at once into a session — they total ~2000 lines.

## Source notes

- DSLMRank artifacts in `archive/cursor-rules/` and `docs/plans/archive/` are from a **different, unrelated project**. Do not read or apply.
- The "wallet-sync" subscription cron (`packages/api/lib/wallet-sync.ts`, `apps/saas/app/api/cron/sync-subscriptions/route.ts`) was removed in `84481e3`. Do not recreate.
