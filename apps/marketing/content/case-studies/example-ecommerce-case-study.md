---
title: "How [Company] Achieved [Result] with AACsearch"
date: 2026-05-03
authorName: Alex Chibilyaev
excerpt: "How [Company] replaced [Algolia/Elasticsearch/custom search] with AACsearch and achieved cost reduction."
tags: [case-study, ecommerce]
published: false
---

# How [Company Name] Cut Search Costs by 5x and Improved Discovery with AACsearch

> _Case study placeholder — replace with real company name, metrics, and quote._

---

## Metadata

- **Company:** [Company Name — e.g., an online fashion retailer with 50k+ SKUs]
- **Industry:** E-commerce
- **Size:** 50,000+ products, 200k+ monthly search queries
- **Previous solution:** Algolia Growth Plan (~$499/mo)
- **Use case:** Product search on e-commerce storefront
- **AACsearch since:** [Month, Year]

---

## 1. The Problem

[Company] runs a multi-brand e-commerce store with 50,000+ products across fashion, accessories, and home goods. Their previous search provider was Algolia on the Growth plan, costing approximately $499/month.

As their catalog grew and traffic increased, three issues emerged:

1. **Unpredictable costs** — Algolia's per-search-operation billing meant every new promotion or seasonal spike increased their bill. During Black Friday, their bill spiked to $1,200+.
2. **Limited analytics visibility** — The Algolia Growth plan included only basic query tracking. They couldn't see which searches returned zero results or which products were frequently searched but not found.
3. **Complex multi-tenancy** — Running separate Algolia indices for different storefronts (each with their own branding and catalog subset) required complex middleware.

"We were spending more on search infrastructure than on hosting our entire storefront," says [Name], [Title] at [Company].

---

## 2. The Solution

After evaluating self-hosted Typesense, Typesense Cloud, and Elasticsearch, [Company] chose AACsearch for three reasons:

1. **Predictable flat pricing** — $99/month for 50k docs with unlimited search operations
2. **Built-in analytics** — No additional cost for search analytics, zero-result tracking, and trend reporting
3. **Scoped API tokens** — Each storefront gets isolated search collections with a single AACsearch account

The implementation took one afternoon:

- **Migration:** Exported existing products as JSON → bulk-uploaded to AACsearch index
- **Widget:** Dropped the HTML/JS widget into their Next.js storefront (replaced Algolia InstantSearch)
- **Configuration:** Set up typo tolerance, faceted search for categories/sizes/colors, and custom ranking rules
- **Scoped tokens:** Created 3 tokens for 3 storefronts, each scoped to their product catalog subset

"We were live in under 4 hours, including importing our full product catalog," says [Name].

---

## 3. The Results

| Metric                         | Before (Algolia)      | After (AACsearch) | Improvement                              |
| ------------------------------ | --------------------- | ----------------- | ---------------------------------------- |
| Monthly search cost            | $499/mo ($1,200 peak) | $99/mo            | **5x cost reduction**                    |
| Search latency (p95)           | 45ms                  | 8ms               | **5.6x faster**                          |
| DevOps time for search         | 4h/week (monitoring)  | 0h/week           | **100% reduction**                       |
| Zero-result searches (tracked) | Unknown               | 12% → 3%\*        | **75% reduction via analytics insights** |
| Time to deploy new storefront  | 2-3 days              | 15 minutes        | **96% faster**                           |

_\*After analytics insights showed top zero-result queries, [Company] added synonym groups and new product tags, reducing no-result searches from 12% to 3%._

**The bottom line:** [Company] saved $4,800+/year in direct search costs, eliminated all DevOps overhead, and improved search quality using the analytics dashboard — all in one afternoon.

---

## 4. The Quote

> _"Switching to AACsearch was the easiest infrastructure decision we've made. We cut costs by 5x, our search is faster, and the built-in analytics showed us product gaps we didn't know we had. It's search that works for the business, not the other way around."_
> — [Name], [Title] at [Company]

---

## 5. Technical Details

- **search-client:** @repo/search-client v0.x (via HTML widget — no SDK needed)
- **Documents indexed:** 52,000 products
- **Collections:** 3 (one per storefront)
- **Languages:** en, de (multilingual product data)
- **Integrations:** Next.js storefront, custom API for catalog updates
- **Features used:** Faceted search, typo tolerance, custom ranking, scoped API tokens, analytics dashboard

---

## Template Instructions for Real Case Studies

When you have a real customer to feature:

1. **Fill in brackets** — replace `[Company Name]`, `[Name]`, `[Title]`, metrics, and the quote
2. **Verify metrics** — confirm actual numbers via their AACsearch analytics dashboard
3. **Get approval** — send the final draft to the customer for approval
4. **Publish** — save as `apps/marketing/content/case-studies/{slug}.mdx` with `published: true`
5. **Promote** — share on social media, newsletter, and Product Hunt launch day

**Priority outreach targets (from template):**

- E-commerce store with >1k products and active search usage
- SaaS platform using AACsearch for content/documentation search
- Agency using AACsearch across client sites
