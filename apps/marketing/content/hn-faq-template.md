# Show HN — FAQ Response Template

## Common Criticisms & Responses

**Q: "Yet another hosted search? What's the actual difference?"**
A: Two key differences: (1) We're built on Typesense, not our own proprietary engine — so you can self-host the same code if needed. (2) Zero-downtime reindexing is built-in from day one, not an enterprise add-on like at Algolia.

**Q: "How's the latency vs Algolia?"**
A: Typesense benchmarks at sub-10ms for most queries. Our hosted infrastructure adds ~5-10ms network latency. For context, most users report comparable or better perceived performance vs Algolia, especially on complex facet filters.

**Q: "What happens if you go out of business?"**
A: Valid concern! Since we're open-core, the Typesense schema and data format are portable. We also offer self-hosted deployment. Your search configuration lives in our database — we'll open-source migration tools if that day ever comes.

**Q: "Only Typesense? Why not Meilisearch or Elasticsearch?"**
A: Typesense won on three criteria: (1) best developer experience (typed API, simple config), (2) fastest query performance at our target scale, (3) easiest to multi-tenant. Meilisearch is great too — we may support it as an engine option in the future.

**Q: "The free tier only has 10K searches. That's tiny."**
A: Fair. For a side project or early-stage startup testing search, 10K/month is usually enough for the first month. It's intentionally a trial tier — upgrade to Pro ($29/mo, 100K) once you validate. We want you to pay when you're getting value.

**Q: "No WordPress or Shopify connector? That's where the market is."**
A: We started with the platforms our early users requested (Next.js, PrestaShop, Bitrix). WordPress and Shopify connectors are on the roadmap — upvote on our public roadmap to prioritize.
