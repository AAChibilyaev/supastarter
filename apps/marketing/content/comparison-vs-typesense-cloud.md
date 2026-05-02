# Comparison: AACsearch vs Typesense Cloud

**Owner: CMO (content) → CTO (code implementation)**
**Status: Content draft ready — needs MDX page + i18n keys in all 5 locales**

---

## Page: /[locale]/compare/typesense-cloud

### SEO Meta

- **Title (EN):** AACsearch vs Typesense Cloud: Why We're Better for Your Business | 2026
- **Description (EN):** AACsearch is built on Typesense but adds managed infrastructure, multi-tenant analytics, connectors, a search widget, and a developer dashboard — all included.
- **H1:** AACsearch vs Typesense Cloud — What You Actually Get

### Hero Section

**Headline:** Typesense is the engine. AACsearch is the product.

**3-Bullet Differentiators:**

1. **Full product, not just infrastructure** — Typesense Cloud gives you a database cluster. AACsearch gives you search-as-a-service: API keys, multi-tenancy, analytics, dashboard, widget, connectors, rate limiting — everything your SaaS needs out of the box.
2. **Multi-tenancy without the boilerplate** — Each organization gets isolated search collections with scoped API tokens. Typesense Cloud requires you to build your own tenant isolation layer.
3. **Analytics you'd otherwise build yourself** — Search analytics dashboard with top queries, click-through rates, no-results tracking, and daily/weekly trends. On Typesense Cloud, you'd need to instrument and store this yourself.

### Feature Comparison Table

| Feature                         | AACsearch                          | Typesense Cloud                                  |
| ------------------------------- | ---------------------------------- | ------------------------------------------------ |
| Core search engine              | Typesense (same engine)            | Typesense (same engine)                          |
| Managed hosting                 | ✅ Included                        | ✅ Included                                      |
| Multi-tenant (orgs)             | ✅ Native, per-org API keys        | ❌ Must build yourself                           |
| Scoped API tokens               | ✅ Built-in                        | ❌ Must build yourself                           |
| Analytics dashboard             | ✅ Trend, CTR, no-results tracking | ❌ Not available                                 |
| Search widget (embeddable)      | ✅ Vanilla JS, React, Vue          | ❌ Not available                                 |
| Connectors (PrestaShop, Bitrix) | ✅ Real-time sync modules          | ❌ Not available                                 |
| Rate limiting                   | ✅ Per-key, configurable           | ❌ Must build yourself                           |
| API key management UI           | ✅ Dashboard                       | ❌ Cloud console only                            |
| Public API (search)             | ✅ REST + gRPC                     | ✅ REST                                          |
| User management                 | ✅ Built-in auth                   | ❌ Must build yourself                           |
| Webhook notifications           | ✅ Coming Q2 2026                  | ❌ Not available                                 |
| Pricing                         | Per-index, unlimited operations    | Per node/hour + per-GB storage                   |
| Entry price                     | Free (1 index, 10k docs)           | ~$49/mo (1-node, 4GB)                            |
| At 100k docs + 500k search/mo   | $99/mo                             | ~$99/mo (2-node cluster) + self-built middleware |
| SLA                             | 99.9%                              | 99.9%                                            |
| Support                         | Email + chat (all plans)           | Community + paid support                         |
| Self-host fallback              | Full Typesense export              | Same engine — portable                           |

### When to Choose Typesense Cloud

Typesense Cloud is better if:

- You need **raw Typesense API access** and plan to build your own infrastructure
- You already have a custom multi-tenancy solution
- You don't need analytics, widgets, or connectors

### When to Choose AACsearch

AACsearch is better if:

- You want **search-as-a-service** — not just a database
- You need **multi-tenant search** for your SaaS product
- You want **analytics, widget, and connectors** without building them
- You're migrating from Algolia, Elasticsearch, or Meilisearch
- You value **per-index pricing** over per-node + per-GB billing

### Pricing Comparison

| Scenario                                | Typesense Cloud                                              | AACsearch                    |
| --------------------------------------- | ------------------------------------------------------------ | ---------------------------- |
| Launch (10k docs, basic search)         | $49/mo (1-node, no analytics, no multi-tenant)               | Free (all features, 1 index) |
| Growth (100k docs, multi-tenant)        | $99/mo (2-node cluster) + custom dev time ($5k-20k one-time) | $99/mo (all built-in)        |
| Scale (1M docs, analytics + connectors) | ~$299/mo (4-node cluster) + custom dev ongoing               | $499/mo (all built-in)       |

### Analogy

> Typesense Cloud is like renting a server from AWS.
> AACsearch is like Heroku for search — you get the platform, the tooling, and the dashboard.

### CTA

**[Start Free Trial →](/signup)** — Powered by Typesense. No lock-in. Export anytime.

---

### Translation Key Structure

```json
{
	"compare.typesenseCloud.hero.headline": "Typesense is the engine. AACsearch is the product.",
	"compare.typesenseCloud.hero.bullet1": "Full product, not just infrastructure",
	"compare.typesenseCloud.hero.bullet1Desc": "AACsearch gives you search-as-a-service: API keys, multi-tenancy, analytics, dashboard, widget.",
	"compare.typesenseCloud.hero.bullet2": "Multi-tenancy without the boilerplate",
	"compare.typesenseCloud.hero.bullet2Desc": "Each organization gets isolated search collections with scoped API tokens — built into every plan.",
	"compare.typesenseCloud.hero.bullet3": "Analytics you'd otherwise build yourself",
	"compare.typesenseCloud.hero.bullet3Desc": "Search analytics dashboard with CTR, no-results tracking, and daily trends — included.",
	"compare.typesenseCloud.seo.title": "AACsearch vs Typesense Cloud: Why AACsearch is Better for Business",
	"compare.typesenseCloud.seo.description": "AACsearch adds multi-tenancy, analytics, connectors, and a search widget on top of Typesense — all included in every plan.",
	"compare.typesenseCloud.analogy.heading": "The Simple Difference",
	"compare.typesenseCloud.analogy.line1": "Typesense Cloud is like renting a server from AWS.",
	"compare.typesenseCloud.analogy.line2": "AACsearch is like Heroku for search.",
	"compare.typesenseCloud.freeTrial": "Start Free Trial"
}
```

### Files to create (CTO)

- `apps/marketing/app/[locale]/compare/typesense-cloud/page.tsx`
- `packages/i18n/translations/{en,de,es,fr,ru}/marketing.json` — add `compare.typesenseCloud.*` keys
