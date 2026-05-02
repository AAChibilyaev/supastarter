# Comparison: AACsearch vs Elasticsearch

**Owner: CMO (content) → CTO (code implementation)**
**Status: Content draft ready — page skeleton exists at /compare/elasticsearch, needs all sections implemented**

> Note: The Elasticsearch compare page already exists at `apps/marketing/app/[locale]/compare/elasticsearch/page.tsx`
> with a CompareElasticsearchGrid component and full English i18n keys. This document provides the
> content direction for the remaining sections (table, scenarios, decision matrix, migration guide,
> testimonial, code example) which need to be added to the page.

---

## Page: /[locale]/compare/elasticsearch

## Redirect: /[locale]/vs/elasticsearch → /compare/elasticsearch

### SEO Meta

- **Title (EN):** AACsearch vs Elasticsearch: The Honest Alternative (2026)
- **Description (EN):** Detailed AACsearch vs Elasticsearch comparison. AACsearch delivers zero-ops search, automatic scaling, built-in analytics, and predictable flat pricing — without Elasticsearch cluster management overhead. The true elasticsearch alternative for modern applications.
- **H1:** AACsearch vs Elasticsearch — The Honest Comparison
- **Target Keywords:** elasticsearch alternative, elasticsearch vs aacsearch, elasticsearch pricing comparison, migrate from elasticsearch

### Hero Section

**Headline:** Elasticsearch is powerful. AACsearch is simple. Choose wisely.

**3-Bullet Differentiators:**

1. **Zero-ops search, not cluster management** — Elasticsearch requires JVM tuning, shard optimization, and dedicated SRE time. AACsearch is a hosted API — provision in seconds, not days.
2. **Predictable pricing, no node-hour surprises** — Elastic Cloud bills by node-hour + storage. AACsearch charges flat per-index pricing with unlimited operations. For 100k docs + 500k searches/month, Elastic Cloud is ~$350-600/mo; AACsearch is $99/mo.
3. **Purpose-built for application search** — Elasticsearch is a general-purpose data platform (logs, observability, analytics). AACsearch is purpose-built for product search, help center search, and SaaS application search — with built-in analytics, widget, and connectors.

### Feature Comparison Table (16 rows)

| Feature                     | AACsearch                              | Elasticsearch                                        |
| --------------------------- | -------------------------------------- | ---------------------------------------------------- |
| Pricing model               | Per-index, unlimited operations        | Per node-hour + storage (cloud) or self-hosted       |
| Entry price                 | Free tier (1 index, 10k docs)          | Free (self-hosted) / ~$95/mo Elastic Cloud (2 nodes) |
| 100k docs, 500k searches/mo | $99/mo                                 | ~$350-600/mo (3-node cluster, 120GB)                 |
| 1M docs, 5M searches/mo     | $499/mo                                | ~$1,200-2,500/mo (5-10 node cluster)                 |
| Multi-tenancy               | Native (org-scoped API keys)           | Requires separate indices or cross-cluster setup     |
| Analytics dashboard         | Built-in (all plans)                   | Requires Kibana setup and maintenance                |
| Widget (embeddable UI)      | Included                               | Requires custom UI with ES JS client                 |
| CMS Connectors              | PrestaShop, Bitrix — native sync       | None — custom integration needed                     |
| Scoped API tokens           | Built-in HMAC tokens                   | Requires API key setup with RBAC                     |
| Geo-search                  | Included                               | Yes (geo_shape, geo_point)                           |
| Typo tolerance              | Configurable per-index                 | Requires custom analyzer (fuzzy queries)             |
| Relevance tuning            | Rank formula, synonyms, custom ranking | BM25 scoring, function_score, custom similarity      |
| Self-host option            | Full Typesense export, migrate anytime | Fully self-hostable — Elastic's main strength        |
| Search engine               | Typesense (open-source, C++)           | Apache Lucene (open-source, Java)                    |
| SLA                         | 99.9% uptime                           | 99.9% (Elastic Cloud, higher tiers available)        |
| Log retention               | 30 days (all plans)                    | Configurable / varies by Elastic Cloud plan          |

### Pricing Comparison Scenarios

**Scenario 1: Small e-commerce (10k products, 50k searches/mo)**

- **Elasticsearch:** Self-hosted (free) or Elastic Cloud ~$95/mo (2-node cluster)
- **AACsearch:** Free tier (1 index, 10k docs) fits perfectly — $0/mo
- **Saving:** Up to $95/mo vs Elastic Cloud. Plus zero DevOps time.

**Scenario 2: Mid-market (100k products, 500k searches/mo)**

- **Elasticsearch:** Elastic Cloud ~$350-600/mo (3-node, 120GB) + DevOps time for cluster management
- **AACsearch:** Scale plan $99/mo — zero ops, automatic scaling
- **Saving:** ~$250-500/mo plus no DevOps overhead

**Scenario 3: Enterprise (1M products, 5M searches/mo)**

- **Elasticsearch:** Elastic Cloud ~$1,200-2,500/mo (5-10 nodes) + dedicated SRE team
- **AACsearch:** Pro plan $499/mo
- **Saving:** ~$700-2,000/mo plus full SRE cost elimination

### Decision Matrix

**Choose AACsearch if you:**

1. Want zero-ops search — no cluster provisioning or JVM tuning
2. Need automatic scaling without capacity planning
3. Want search analytics, widget, and connectors included
4. Are paying Elastic Cloud bills and want predictable pricing
5. Build product search, help center, or SaaS application search

**Choose Elasticsearch if you:**

1. Need log analytics / observability pipelines (ELK stack)
2. Require complex aggregations and data analytics queries
3. Need on-prem control with full self-hosting flexibility
4. Have an existing Elasticsearch infrastructure with committed investment
5. Require advanced ES features (machine learning, graph exploration)

### Why Teams Migrate to AACsearch

1. **Zero-ops** — No cluster provisioning, JVM tuning, or shard management. AACsearch is fully managed.
2. **Automatic scaling** — AACsearch handles traffic spikes without capacity planning or cluster resizing.
3. **Predictable pricing** — Flat per-index cost vs unpredictable node-hour + storage bills from Elastic Cloud.
4. **Built-in analytics** — Search analytics out of the box. No Kibana setup, no dashboard maintenance.

### Testimonial

> "We spent more time managing our Elasticsearch cluster than actually building search features. Migrated to AACsearch in a weekend — zero ops, lower latency, and the dashboard showed us search gaps we had no visibility into before."
> — CTO, B2B SaaS company (migrated from Elasticsearch Cloud)

### Code Example

```typescript
// Before: Elasticsearch — cluster setup, mapping, query
const { Client } = require("@elastic/elasticsearch");
const client = new Client({ node: "https://localhost:9200" });

// After: AACsearch — one API call
const results = await client.search({
	q: "query",
	filter_by: combineFilters(userFilter, scopedToken),
});
```

### FAQ (Schema.org FAQPage)

1. **Why switch from Elasticsearch to AACsearch?**
   AACsearch offers native multi-tenancy, scoped API tokens, simpler flat pricing, and zero vendor lock-in with full Typesense data export.

2. **How does AACsearch pricing compare to Elasticsearch?**
   AACsearch uses flat per-index pricing with unlimited search operations — no per-record or per-query charges. Elasticsearch Cloud bills by node-hour — you pay for compute you may not need for pure search.

3. **Is migration from Elasticsearch to AACsearch difficult?**
   Migration is straightforward — AACsearch provides full Typesense data export, and the Typesense-compatible API means minimal code changes. Most teams complete migration in a weekend.

4. **Can I use AACsearch if I need Elasticsearch-specific features?**
   AACsearch covers core search, geo-search, typo tolerance, faceted search, relevance tuning, synonyms, and curations. For log analytics or ELK stack — Elasticsearch remains the right choice.

### CTA

**[Start Free Trial →](/signup)** — No credit card required. Migrate from Elasticsearch in a weekend.

---

### Translation Key Structure (for CTO)

```json
{
  "compareElasticsearchPage": {
    "title": "AACsearch vs Elasticsearch: The Honest Alternative (2026)",
    "description": "Detailed AACsearch vs Elasticsearch comparison..."
  },
  "compareElasticsearch": {
    "title": "AACsearch vs Elasticsearch — The Honest Comparison",
    "subtitle": "Elasticsearch is a powerful general-purpose data platform. AACsearch is a purpose-built search API.",
    "items": { "complexity": { ... }, "latency": { ... }, "useCase": { ... }, "cost": { ... }, "schema": { ... }, "verdict": { ... } },
    "codeTitle": "Zero-ops search, not cluster management",
    "codeSubtitle": "AACsearch is a managed search API. Elasticsearch requires cluster provisioning and JVM tuning.",
    "table": { ... 16 features ... },
    "scenarios": { ... 3 scenarios ... },
    "whyMigrate": { ... 4 reasons ... },
    "testimonial": { ... quote + author ... },
    "decisionMatrix": { ... 2 columns x 5 items ... },
    "cta": { ... heading, description, button ... }
  }
}
```

All keys are already defined in English at packages/i18n/translations/en/marketing.json.
Need to translate to de, es, fr, ru.
