# 07 — Knowledge module (RAG / GraphRAG)

> **Status**: ✅ shipped (commits `0ac1540` schema · `f8a36b9` API · `17b2d46` UI). This document records what was built, the tension with [01-vision-scope.md §1.7 OUT](01-vision-scope.md), and how Knowledge fits next to Search as a **separate product surface**.

## 7.1 Why this doc exists

The original AACsearch vision pack (files 01–06) explicitly called Vector / semantic / NL search **out of scope for v1** ([§1.7](01-vision-scope.md)). During this session a full **Knowledge module** landed in code: RAG over uploaded files, GraphRAG with explainable retrieval, ingestion pipeline, embeddings, Q&A surface. That's semantic search by definition — the OUT list contradicts what shipped.

Two ways to resolve:

- **(a) Revert.** Roll back the Knowledge module. Not recommended — it's already integrated, has a UI route, and represents real product value.
- **(b) Re-classify.** Knowledge becomes a **separate product surface** alongside Search. The §1.7 OUT clauses about vector / semantic / NL referred specifically to **storefront product search** (the e-commerce use case in 01–05). Knowledge is internal Q&A over docs / catalogs / runbooks — different surface, different audience, different pricing track.

This doc takes path **(b)** and clarifies the boundary.

## 7.2 The boundary — Search vs. Knowledge

| | **Search (Typesense)** | **Knowledge (RAG/GraphRAG)** |
|---|---|---|
| **Audience** | End-user on storefront (anonymous shopper) | Logged-in operator (support agent, sales, internal team) |
| **Backed by** | Typesense collections + alias swap | Prisma `KnowledgeChunk` table + `embedding: Json?` column + `KnowledgeGraph{Node,Edge}` |
| **Query mode** | Keyword + facet + sort + filter | Natural-language question → cited paragraphs |
| **Latency target** | < 100ms p95 | < 5s for `ask`, < 30s for `ingest-file` |
| **Cost model** | Free/Starter/Pro per search-units (`@repo/payments/lib/entitlements`) | Per-token model spend (uses `@repo/billing-wallet` kopecks ledger) |
| **Auth** | `ss_search_*` / `ss_scoped_*` Bearer (browser-safe) | Better Auth session cookie (oRPC), org or user owner |
| **Public-handler** | `packages/api/modules/search/public-handler.ts` (CORS open) | None — never public-handler. All access via authenticated oRPC |
| **Docs schema** | One canonical `ProductDocument` ([§3.3](03-domain-api.md)) | Free-form chunked text + metadata; sourceType-aware extraction |
| **Reindex path** | Alias swap, zero downtime ([R5 in SKILL](../../.claude/skills/supastarter-nextjs-skill/SKILL.md)) | Per-document reembed; chunks have stable `(documentId, chunkIndex)` |

**Hard rule**: Knowledge does **not** replace Search. A storefront customer browsing products still hits Typesense. Knowledge powers a separate "Ask" surface in the SaaS dashboard for the org's logged-in users.

## 7.3 What's shipped

### 7.3.1 Schema (commit `0ac1540`)

```
KnowledgeSpace
  id, ownerType, userId?, organizationId? (org-or-user, same pattern as SearchIndex)
  slug, name
  → dataSources, documents, chunks, graphNodes, graphEdges

KnowledgeDocument
  knowledgeSpaceId, dataSourceId?
  externalId, sourceType, title, mimeType, language, contentText, metadata, version, checksum

KnowledgeChunk
  knowledgeSpaceId, documentId
  chunkIndex, text, tokenCount, embedding (Json?), metadata
  unique(documentId, chunkIndex)

GraphNode / GraphEdge   ← GraphRAG layer
DataSource              ← upstream ingestion source (file / URL / etc.)
```

### 7.3.2 API surface (commit `f8a36b9`)

`packages/api/modules/knowledge/router.ts` exposes 9 procedures:

| Procedure | Type | Purpose |
|---|---|---|
| `createSpace` | mutation | Create a Knowledge space (org or user-owned) |
| `listSpaces` | query | List spaces caller can access |
| `createSource` | mutation | Register an upstream `DataSource` |
| `listSources` | query | List sources in a space |
| `ingestFile` | mutation | Ingest one file → chunks + embeddings + graph build |
| `listIngestionJobs` | query | Status of recent ingestion runs |
| `ask` | mutation | Q&A with citations |
| `graphragExplain` | query | Show retrieval path through GraphNodes/Edges |
| `usageMetrics` | query | Chunks indexed, queries asked, token spend |

Mounted in `packages/api/orpc/router.ts` as `knowledge`.

### 7.3.3 UI surface (commit `17b2d46`)

- **Org-scope route**: `apps/saas/app/(authenticated)/(main)/(organizations)/[organizationSlug]/knowledge/page.tsx`
- **Account-scope route**: `apps/saas/app/(authenticated)/(main)/(account)/knowledge/page.tsx`
- **Component**: `apps/saas/modules/search/components/KnowledgeWorkbench.tsx` *(co-located with search components for now; consider extracting to `apps/saas/modules/knowledge/` if surface grows)*

### 7.3.4 Sidebar IA

Knowledge appears as a top-level nav item alongside Search/Analytics/Relevance/Connectors per `06-ui-pages.md §6.1`. Visibility: per-user (account scope shows personal spaces) and per-org (org admin can see all).

## 7.4 Cost model — different track from search

Search-units (Free/Pro/Enterprise) **do not gate Knowledge**. Knowledge consumes:

- **Embedding tokens** — at ingest. Charged per provider rate (OpenAI, Cohere, etc. — exact provider via `@repo/ai` config).
- **Completion tokens** — per `ask`. Charged similarly.
- **Storage** — chunk count + size. Currently uncounted; metering candidate when scale demands.

All token spend goes through the same `@repo/billing-wallet` kopecks ledger as the AI Wallet. **Reuse**, not duplicate.

When v0.6 metering wraps up, Knowledge gets its own line in usage rollup (`usageMetrics` proc surface). No separate provider, just separate accounting.

## 7.5 Hard invariants — Knowledge edition

These complement [SKILL.md Hard Invariants](../../.claude/skills/supastarter-nextjs-skill/SKILL.md):

1. **Owner isolation.** Every `ask` / `ingestFile` / `listX` checks `ownerType + ownerId` matches caller (similar to `requireSearchOwner*` in `packages/api/modules/search/lib/access.ts`). No cross-org reads.
2. **No public-handler for Knowledge.** Search has a CORS-open public-handler; Knowledge **does not**. Always behind Better Auth session.
3. **Cite or refuse.** `ask` must return citations (`documentId`, `chunkIndex` references). If retrieval returns < N relevant chunks, refuse with "no confident answer" — never hallucinate.
4. **Ingest is async.** `ingestFile` returns `jobId` immediately; chunking + embedding + graph-build runs as a job. UI polls `listIngestionJobs`.
5. **No raw embedding values to client.** `KnowledgeChunk.embedding` is `Json?` server-side only; never returned over oRPC. Citations carry `documentId`/`chunkIndex`/`text`, not vectors.
6. **`embedding` field is provider-specific.** When changing embedding provider/model, all chunks need re-embedding. Track via `KnowledgeChunk.metadata.embeddingModel`. Mass re-embed = job, not synchronous.

## 7.6 Open questions / what's still needed

| # | Question | Current state |
|---|---|---|
| 1 | Vector index — Postgres pgvector? External (Pinecone/Qdrant)? Or in-Json scan? | Currently `embedding: Json?` — works at small scale, won't scale past ~10k chunks/space without a real ANN index |
| 2 | Embedding provider abstraction | Lives somewhere in `packages/ai` or `packages/ai-core`. Verify single source of truth before scale |
| 3 | Chunking strategy per `mimeType` | `ingestFile` exists; chunking logic location unknown — likely in `lib/connectors/` shared with search OR new `lib/knowledge/` |
| 4 | Knowledge graph build (GraphRAG) | `GraphNode`/`GraphEdge` tables exist; build step happens during `ingestFile`. Algorithm choice + edge-types schema TBD |
| 5 | Citation rendering in `ask` UI | UI must show "from doc X, chunk Y" with deep-link. Verify in `KnowledgeWorkbench.tsx` |
| 6 | Rate limit on `ask` | Public-search has per-key per-minute limit. Knowledge currently has only Better Auth + plan quota. Add per-user rate limit if abuse seen |
| 7 | File size / type allowlist | `ingestFile` MUST validate. Verify the implementation rejects > 50MB, non-text mime types, etc. |
| 8 | Retention | When user deletes a `KnowledgeSpace` or `DataSource`, all chunks/docs/graph cascade-delete via Prisma `onDelete: Cascade`. Confirm cron / soft-delete policy |
| 9 | Admin observability | `admin/knowledge` route doesn't exist yet. Cross-org listing for platform admin TBD |

## 7.7 Decision gates (when X, do Y)

Add to [SKILL.md Decision gates](../../.claude/skills/supastarter-nextjs-skill/SKILL.md) on next refresh:

| If the change touches… | Mandatory follow-ups |
|---|---|
| `packages/api/modules/knowledge/*` | Owner check via `ownerType + ownerId`; no public-handler exposure; cite-or-refuse on `ask`; embedding values stay server-side |
| `KnowledgeChunk.embedding` provider/model change | Re-embed job for ALL existing chunks (track `metadata.embeddingModel`); never silently mix models in one space |
| `KnowledgeWorkbench.tsx` | Citations rendered with deep-links to `KnowledgeDocument` view; ingestion progress polled via `listIngestionJobs` |
| Adding a new `KnowledgeSourceType` enum value | Schema migration (additive enum); ingestion logic in `ingestFile` extended; UI shows new source type in `createSource` form |
| Cross-org admin view of Knowledge | Add `admin/knowledge/page.tsx`; needs new query helper that bypasses owner check (admin-only) |

## 7.8 Out of scope (for the Knowledge surface specifically)

- **Multi-modal embeddings** (image/audio chunks) — text-only for v1
- **Cross-space search** — each `KnowledgeSpace` is isolated; federated `ask` across spaces is post-v1
- **Real-time collaboration** on Knowledge spaces — not a v1 feature
- **Public Knowledge spaces** (anonymous read access) — would need a public-handler with new auth model; not now
- **Custom embedding fine-tuning per tenant** — way out
- **Generative replies without citations** — refused by design (Hard Invariant #3 above)

## 7.9 Update §1.7 OUT list (proposed wording)

Replace the line in [01-vision-scope.md §1.7 OUT](01-vision-scope.md):

> ~~Vector / semantic / NL search; image / audio search; auto-crawling; A/B tests; full personalization; SSO; multi-region; analytics replay UI~~

with:

> Image / audio search; auto-crawling; A/B tests; full personalization; SSO; multi-region; analytics replay UI.
>
> **Vector / semantic / NL search** is OUT for the **storefront product Search surface** (Typesense remains keyword-first). It is IN as the separate **Knowledge surface** — see [07-knowledge.md](07-knowledge.md). The two surfaces share auth + billing (`@repo/billing-wallet`) but are distinct products.

(This edit is left for the next plan-refresh commit; not auto-applied here to keep §1.7 stable.)

## 7.10 Definition of "Knowledge MVP done"

A new customer journey:

```
Sign up → Create org → Sidebar → Knowledge → Create Space →
Upload PDF (drag-drop in KnowledgeWorkbench) → Ingest job runs →
Chunks visible in space → Ask "what is the return policy?" →
Cited answer with deep-link to source paragraph → done.
```

Plus:

- ✅ Owner isolation tested across 2 orgs.
- ✅ Citations always present (no answer without ≥1 citation).
- ✅ Ingest job retries on transient failure, surfaces error in UI on hard failure.
- ✅ Token spend visible in `usageMetrics` and AI Wallet.
- ✅ All 5 locales for user-visible strings.
- ✅ Mobile usable (KnowledgeWorkbench composes shadcn primitives).

## 7.11 Read order when working on Knowledge

1. **This file** — boundary + invariants + open questions.
2. `packages/api/modules/knowledge/router.ts` + procedures — current API surface.
3. `packages/database/prisma/schema.prisma` (search for `Knowledge`) — DB shape.
4. `apps/saas/modules/search/components/KnowledgeWorkbench.tsx` — UI entry.
5. `06-ui-pages.md §6.1` — sidebar placement.
6. `01-vision-scope.md §1.7` — original OUT list (and the §7.9 amendment proposal).
