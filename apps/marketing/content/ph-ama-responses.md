# Product Hunt AMA — Anticipated Questions & Prepared Responses

## Q1: How is AACSearch different from Algolia?

AACSearch uses Typesense (open-source C++ engine) under the hood, not a proprietary engine. This means significantly lower costs — typically 10x cheaper at the same scale. We still have the developer-friendly API, zero-downtime reindexing (included on ALL paid plans, not just enterprise), and full data portability since the schema is standard Typesense.

## Q2: Can I self-host?

Yes! AACSearch is open-core. The cloud version is the fastest way to start, but we offer self-hosted deployment for teams that need data residency or air-gapped environments. Your schema and data are portable Typesense formats — no lock-in.

## Q3: How's the search quality compared to Elasticsearch?

Typesense is C++ native, so query latency is consistently sub-10ms — significantly faster than Elasticsearch's JVM-based stack for most workloads. We add semantic search (knowledge RAG with embeddings), configurable typo tolerance, faceted filtering, and field-specific relevance tuning on top. For standard product/site/app search, quality is comparable or better.

## Q4: What about Meilisearch?

Meilisearch has great DX too. We chose Typesense because of better multi-tenancy support (native collection-per-org model), which is essential for SaaS. We may support additional engine backends in the future if users request it.

## Q5: Who is this for?

Three main segments: (1) SaaS teams outgrowing Algolia pricing, (2) developers who don't want to operate Elasticsearch, (3) e-commerce platforms (PrestaShop, WooCommerce, Bitrix) that need plug-and-play search with connectors.

## Q6: How does the pricing work?

Free tier: 10K searches/mo (trial). Pro: $29/mo (100K searches). Enterprise: $299/mo (1M searches, custom limits, self-hosted option). No hidden fees — zero-downtime reindexing is included on all paid plans.

## Q7: What connectors do you offer?

Next.js (React components + @repo/search-client), PrestaShop module, Bitrix module. WordPress and Shopify are next. Custom API for anything else.

## Q8: What's the tech stack?

Next.js 16 + Typesense + Hono + oRPC + Prisma/PostgreSQL. Deployed on Coolify-managed Docker. About 40% search core, 30% SaaS/marketing apps, 30% connectors and tooling.

## Q9: What happens if AACSearch goes under?

Since we're built on Typesense (open-source), your data and schema are portable. We'll open-source migration tools if that day ever comes. The self-hosted option is always available.

## Q10: How fast is it really?

Sub-10ms p50 for standard keyword search on our hosted infrastructure. See our benchmarks in this post: /blog/typesense-deep-dive
