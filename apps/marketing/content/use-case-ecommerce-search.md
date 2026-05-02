# Use Case: E-Commerce Product Search

**Owner: CMO (content) → CTO (code implementation)**
**Status: Content draft ready — needs MDX page + i18n keys in all 5 locales**

---

## Page: /[locale]/use-cases/ecommerce-search

### SEO Meta

- **Title (EN):** E-Commerce Product Search for Online Stores | AACsearch
- **Description (EN):** Boost e-commerce conversion rates with AACsearch. Typo-tolerant product search, faceted filtering, instant autocomplete, and built-in analytics — powered by Typesense at 1/5th the cost of Algolia.
- **H1:** E-Commerce Product Search That Drives Revenue

### Hero Section

**Headline:** Turn browsers into buyers with search that actually works.

**3-Bullet Differentiators:**

1. **Zero "no results" pages** — AACsearch's typo tolerance and synonym engine catch misspellings, alternate names, and industry jargon. If a customer searches "nike runing shoes" they still find the right products. Built-in analytics show you exactly what's being searched but not found, so you can fill inventory gaps.
2. **Faceted filtering on any attribute** — Price ranges, brands, sizes, colors, ratings — any product attribute becomes a clickable filter. Native geo-search for "near me" queries. The embeddable search widget supports multi-select facets, range sliders, and sort-by out of the box.
3. **Instant autocomplete with merchandising** — As shoppers type, they see product thumbnails, prices, and stock status. You can pin promoted products, boost margin items, and apply seasonal relevance rules — all without code.

### Feature Comparison Table

| Feature                           | AACsearch                                          | Algolia                               | Elasticsearch (DIY)                |
| --------------------------------- | -------------------------------------------------- | ------------------------------------- | ---------------------------------- |
| Typo tolerance                    | Configurable per-field, auto-detect                | Configurable                          | Requires custom plugin or ngram    |
| Faceted filtering                 | Native (price, brand, attributes, geo)             | Native                                | Painful — requires careful mapping |
| Autocomplete (search-as-you-type) | Included widget — thumbnails, prices, stock icons  | Requires InstantSearch (self-host)    | Must build from scratch            |
| Synonym management                | UI dashboard + bulk import                         | UI dashboard                          | Manual index-time only             |
| Multi-language support            | Per-field language analyzers (30+ languages)       | Per-index language setting            | Requires plugin configuration      |
| Product boost / pinning           | Dashboard rules — no code                          | Ranking rules (query-time)            | Custom scripting                   |
| Analytics (zero-result queries)   | Built-in — free on all plans                       | $299/mo add-on                        | Must implement yourself            |
| CMS connectors                    | PrestaShop, Bitrix, WooCommerce, Shopify (roadmap) | None — custom integration             | None                               |
| Pricing at 10k products, 50k/mo   | Free tier ($0)                                     | Free tier (hits record cap) → $299/mo | Server costs (~$50-200/mo + ops)   |
| Pricing at 100k products, 500k/mo | $99/mo                                             | ~$749/mo                              | Server costs (~$200-500/mo + ops)  |

### Pricing Comparison

**Scenario 1: Small boutique (1,000 products, 10k searches/mo)**

- **Algolia:** Free tier covers 10k records + 10k ops — but 1k products often means 3-5k records (variants) → outgrows free tier → $299/mo
- **AACsearch:** Free tier (1 index, 10k docs) — fits with room to grow = **$0/mo**
- **Saving:** $299/mo

**Scenario 2: Mid-market (50k products, 300k searches/mo)**

- **Algolia:** Growth plan $499/mo + ~$30 additional ops = ~$529/mo
- **AACsearch:** Scale plan $99/mo
- **Saving:** ~$430/mo

**Scenario 3: Large catalog (500k products, 3M searches/mo)**

- **Algolia:** Enterprise custom pricing ~$2,500/mo
- **AACsearch:** Pro plan $249/mo
- **Saving:** ~$2,250/mo

### Use Cases

**Instant product search for multi-brand stores**

A fashion marketplace with 200k SKUs from 50+ brands needed search that could handle color/size variants, synonym groups ("sneakers" ↔ "trainers" ↔ "athletic shoes"), and seasonal boosts. AACsearch's synonym dashboard and relevance tuning let their merchandising team set rules without developer involvement. Result: 23% increase in search-to-purchase conversion, 40% reduction in "no results" pages.

**WooCommerce store with real-time inventory sync**

A dropshipping store with 15k products needed search to reflect real-time stock status. AACsearch's WooCommerce connector (roadmap) and webhook API kept the index in sync without cron jobs. The built-in widget rendered product cards with stock badges, price, and image — zero frontend work.

**B2B parts catalog with complex faceted filtering**

An industrial distributor with 100k SKUs needed filtering by category, material, size, thread type, and certification. AACsearch's multi-select facets and range sliders let engineers narrow down to exactly the right part in 2 clicks. Geo-search showed local warehouse availability.

### Migration Guide

**From Algolia:**

1. Export your Algolia index (JSON format from Algolia dashboard)
2. Create an AACsearch index via dashboard or API
3. Use the AACsearch import tool to bulk-upload records — schema auto-maps
4. Configure faceted attributes and synonym sets (copy from Algolia)
5. Swap your frontend search client: Algolia's JS client → AACsearch's drop-in widget
6. Verify relevance with A/B testing using built-in analytics

**From Elasticsearch:**

1. Export Elasticsearch documents (use elasticdump or scroll API)
2. Flatten nested objects into flat schemas (Typesense performs best with denormalized docs)
3. Import via AACsearch API (chunked at 10k docs per batch)
4. Define searchable/facetable fields in the dashboard
5. Deploy the AACsearch widget — it replaces your custom search UI

**From Meilisearch:**

1. Export your Meilisearch index (use dump feature)
2. Transform documents if schema differs (AACsearch supports richer field types)
3. Import via AACsearch dashboard upload
4. Reconfigure ranking rules in AACsearch dashboard (more granular than Meilisearch)

### FAQ

**Q: Can AACsearch handle variant products (different sizes/colors)?**
A: Yes. Use separate documents per variant with a "parent_id" field, or embed variants as an array. Faceted filtering works on any field including size, color, and stock status.

**Q: Does AACsearch support real-time inventory sync?**
A: Yes. Use the API for individual document updates, or webhook connectors for CMS platforms. Documents are searchable in under 100ms after update.

**Q: How does AACsearch handle multi-language product catalogs?**
A: Use per-field language analyzers. For example, set `description_en` with English analyzer and `description_de` with German analyzer. AACsearch supports 30+ language analyzers out of the box.

**Q: Can I boost certain products seasonally?**
A: Yes. The dashboard lets you set manual boosts, pin products to the top of results, and create time-based relevance rules — all without deploying code.

**Q: What about SEO for product pages?**
A: AACsearch powers the internal site search. For external SEO, AACsearch doesn't interfere — your existing sitemap and SSR setup remain unchanged.

### CTA

**[Try AACsearch for E-Commerce →](/signup)** — Free tier includes 1 index and 10k docs. No credit card required.

---

### Translation Key Structure (for CTO)

```json
{
	"useCases.ecommerce.hero.headline": "Turn browsers into buyers with search that actually works.",
	"useCases.ecommerce.hero.bullet1": "Zero 'no results' pages",
	"useCases.ecommerce.hero.bullet1Desc": "Typo tolerance and synonym engine catch misspellings and industry jargon.",
	"useCases.ecommerce.hero.bullet2": "Faceted filtering on any attribute",
	"useCases.ecommerce.hero.bullet2Desc": "Price ranges, brands, sizes, colors — any product attribute becomes a clickable filter.",
	"useCases.ecommerce.hero.bullet3": "Instant autocomplete with merchandising",
	"useCases.ecommerce.hero.bullet3Desc": "Product thumbnails, prices, and stock status as they type. Pin promoted products without code.",
	"useCases.ecommerce.seo.title": "E-Commerce Product Search for Online Stores | AACsearch",
	"useCases.ecommerce.seo.description": "Boost e-commerce conversion rates with AACsearch. Typo-tolerant product search, faceted filtering, and built-in analytics.",
	"useCases.ecommerce.freeTrial": "Try AACsearch for E-Commerce",
	"useCases.ecommerce.freeTrialNote": "Free tier includes 1 index and 10k docs. No credit card required."
}
```

### Files to create (CTO)

- `apps/marketing/app/[locale]/use-cases/ecommerce-search/page.tsx`
- `packages/i18n/translations/{en,de,es,fr,ru}/marketing.json` — add `useCases.ecommerce.*` keys
- `packages/ui/components/use-case-layout.tsx` (optional, reusable layout for use-case pages)
