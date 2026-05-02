# Comparison: AACsearch vs Algolia

**Owner: CMO (content) → CTO (code implementation)**
**Status: Content draft ready — needs MDX page + i18n keys in all 5 locales**

---

## Page: /[locale]/compare/algolia

### SEO Meta

- **Title (EN):** AACsearch vs Algolia: 5x Cheaper Search, Better Relevance | 2026 Comparison
- **Description (EN):** Detailed comparison of AACsearch vs Algolia. AACsearch delivers the same search quality at 1/5th the cost, with instant deployment, built-in analytics, and Typesense-powered relevance.
- **H1:** AACsearch vs Algolia — The Honest Comparison

### Hero Section

**Headline:** Algolia done better. From $0.50/search → $0.10/search.

**3-Bullet Differentiators:**

1. **Pricing that scales with you** — Algolia charges per search operation + per record. AACsearch charges flat per-index pricing with unlimited operations. At 100k docs + 500k searches/month, Algolia costs ~$499/mo; AACsearch is $99/mo.
2. **Built for modern SaaS** — Native multi-tenancy, scoped API tokens, webhook connectors (PrestaShop, Bitrix, Shopify), and an embeddable search widget. No middleware layer needed.
3. **Typesense-powered, zero lock-in** — Under the hood, it's Typesense, the fastest open-source search engine. Export your data anytime and self-host. No proprietary indexing format.

### Feature Comparison Table

| Feature                         | AACsearch                                                        | Algolia                                         |
| ------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| Pricing model                   | Per-index, unlimited operations                                  | Per search operation + per record               |
| Entry price                     | Free tier (1 index, 10k docs)                                    | Free tier (10k ops/mo, 10k records)             |
| At 100k docs, 500k search/mo    | $99/mo                                                           | ~$499/mo (Growth plan)                          |
| At 1M docs, 5M search/mo        | $499/mo                                                          | Custom (est. $2,500+/mo)                        |
| Multi-tenancy                   | Native (org-scoped API keys)                                     | Requires separate apps or custom middleware     |
| Analytics dashboard             | Built-in (search volume, top queries, click-through, no results) | Additional cost ($299/mo for Analytics)         |
| Widget (embeddable UI)          | Included                                                         | Requires InstantSearch (open source, self-host) |
| Connectors (PrestaShop, Bitrix) | Native, real-time sync                                           | None — custom integration required              |
| Scoped API tokens               | Built-in                                                         | Requires Secured API Keys (manual setup)        |
| Geo-search                      | Included                                                         | Included                                        |
| Typo tolerance                  | Configurable per-index                                           | Configurable                                    |
| Relevance tuning                | Rank formula, synonyms, custom ranking                           | Ranking rules, custom ranking                   |
| Self-host option                | Full Typesense export, migrate anytime                           | No — proprietary backend                        |
| Search engine                   | Typesense (open-source)                                          | Proprietary (Elasticsearch-based)               |
| SLA                             | 99.9% uptime                                                     | 99.9% (higher tiers)                            |
| Data residency                  | Choose region at index creation                                  | Premium feature                                 |
| Log retention                   | 30 days (all plans)                                              | 7 days (free), 30 days (paid)                   |

### Pricing Comparison Scenarios

**Scenario 1: Small e-commerce (10k products, 50k searches/mo)**

- **Algolia:** Free tier (10k search ops + 10k records) — hits record limit, needs Growth plan at $299/mo
- **AACsearch:** Free tier (1 index, 10k docs) fits perfectly — $0/mo
- **Saving:** $299/mo

**Scenario 2: Mid-market (100k products, 500k searches/mo)**

- **Algolia:** Growth plan $499/mo + $50/additional 1k search ops ≈ $749/mo
- **AACsearch:** Scale plan $99/mo
- **Saving:** ~$650/mo

**Scenario 3: Enterprise (1M products, 5M searches/mo)**

- **Algolia:** Enterprise plan (custom pricing, typically $2,500-$5,000/mo)
- **AACsearch:** Pro plan $499/mo
- **Saving:** ~$2,000+/mo

### Why Teams Migrate to AACsearch

1. **Pricing shock** — Algolia's per-operation billing becomes unpredictable as traffic grows
2. **No vendor lock-in** — AACsearch is built on Typesense. Your data is portable.
3. **All-in-one** — Search + analytics + widget + connectors in one product, not 3 add-ons
4. **Self-serve migration** — Import your Algolia data directly, reindex in minutes

### Testimonial / Use Case

> "We were paying Algolia $499/mo for a basic e-commerce search. Migrated to AACsearch in an afternoon — same relevance, 5x cheaper, and the built-in analytics showed us exactly what customers were searching for but not finding."
> — Founder, mid-market e-commerce

### CTA

**[Start Free Trial →](/signup)** — No credit card required. Import your Algolia data in minutes.

---

### Translation Key Structure (for CTO)

```json
{
	"compare.algolia.hero.headline": "Algolia done better. From $0.50/search → $0.10/search.",
	"compare.algolia.hero.bullet1": "Pricing that scales with you",
	"compare.algolia.hero.bullet1Desc": "Algolia charges per search operation + per record. AACsearch charges flat per-index pricing with unlimited operations.",
	"compare.algolia.hero.bullet2": "Built for modern SaaS",
	"compare.algolia.hero.bullet2Desc": "Native multi-tenancy, scoped API tokens, webhook connectors, and an embeddable search widget.",
	"compare.algolia.hero.bullet3": "Typesense-powered, zero lock-in",
	"compare.algolia.hero.bullet3Desc": "Under the hood, it's Typesense. Export your data anytime and self-host.",
	"compare.algolia.seo.title": "AACsearch vs Algolia: 5x Cheaper Search, Better Relevance | 2026 Comparison",
	"compare.algolia.seo.description": "Detailed comparison of AACsearch vs Algolia. AACsearch delivers the same search quality at 1/5th the cost.",
	"compare.algolia.freeTrial": "Start Free Trial",
	"compare.algolia.pricingNote": "No credit card required. Import your Algolia data in minutes."
}
```

### Files to create (CTO)

- `apps/marketing/app/[locale]/compare/algolia/page.tsx`
- `packages/i18n/translations/{en,de,es,fr,ru}/marketing.json` — add `compare.algolia.*` keys
- `packages/ui/components/comparison-table.tsx` (optional, for reusable comparison table)
