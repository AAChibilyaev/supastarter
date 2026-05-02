# Use Case: Site Search (Documentation & Content)

**Owner: CMO (content) → CTO (code implementation)**
**Status: Content draft ready — needs MDX page + i18n keys in all 5 locales**

---

## Page: /[locale]/use-cases/site-search

### SEO Meta

- **Title (EN):** Site Search for Documentation, Blogs & Knowledge Bases | AACsearch
- **Description (EN):** Give users instant answers with AACsearch site search. Full-text search across docs, blogs, and help centers — with autocomplete, snippets, and built-in analytics. Typesense-powered, drops in with one script tag.
- **H1:** Site Search That Keeps Users on Your Site

### Hero Section

**Headline:** Don't let visitors hunt. Give them answers in milliseconds.

**3-Bullet Differentiators:**

1. **One-script-tag embed** — Drop `<script src="https://cdn.aacsearch.com/widget.js">` into your site header and get a full-featured search bar with autocomplete, keyboard navigation, and results overlay. No React, no build step, no NPM install. Works on any static site, SPA, or traditional CMS.
2. **Full-text search with smart ranking** — AACsearch indexes pages, headings, body text, and metadata. The Typesense ranking engine uses TF-IDF + customizable boost fields, so documentation "Getting Started" pages rank above peripheral blog posts. Customizable result snippets show the most relevant passage.
3. **Analytics that close feedback loops** — See exactly what users search for, what they click, and — most importantly — what returns zero results. If 50 visitors searched "billing" and found nothing, you know your billing docs need an update. All analytics included on every plan, no add-on cost.

### Feature Comparison Table

| Feature                          | AACsearch                                            | Algolia                                   | Google Programmable Search         |
| -------------------------------- | ---------------------------------------------------- | ----------------------------------------- | ---------------------------------- |
| Setup time                       | 5 minutes (one script tag)                           | 30-60 minutes (InstantSearch integration) | 10 minutes (but limited)           |
| Search scope                     | Your content only (specified index)                  | Your content only (specified index)       | Site-wide web crawl                |
| Typo tolerance                   | Configurable per-index                               | Configurable                              | Basic — based on Google web search |
| Result snippets                  | Customizable (number of chars, highlight tags)       | Built-in (highlighted)                    | Auto-generated from crawl          |
| Keyboard navigation              | Included (arrow keys, Enter, Escape)                 | Requires custom implementation            | Basic                              |
| Dark mode / theming              | CSS variables — match your brand in 2 minutes        | Custom CSS required                       | Limited theming                    |
| Analytics (zero-query tracking)  | Built-in — free on all plans                         | $299/mo add-on                            | Google Analytics (separate)        |
| Multi-language                   | 30+ language analyzers                               | Per-index language setting                | Automatic (Google detection)       |
| Content freshness                | Webhook API — update documents in real-time          | API update                                | Crawl-dependent (days/weeks)       |
| Pricing at 5k docs, 50k searches | Free tier                                            | Free tier (10k ops, 10k records)          | Free (up to 100 queries/day)       |
| No ads in results                | Yes — 100% your content                              | Yes                                       | No (Google branding optional)      |
| Data privacy / GDPR              | Fully compliant — choose EU region at index creation | Compliant                                 | Google processes queries           |

### Pricing Comparison

**Scenario 1: Developer docs (1k pages, 20k searches/mo)**

- **Algolia:** Free tier (10k ops) — at 20k searches you need Community plan at $49/mo
- **AACsearch:** Free tier (1 index, 10k docs) covers this = **$0/mo**
- **Google Programmable Search:** Free — but serves Google ads, limited customization
- **Saving:** $49/mo vs Algolia

**Scenario 2: Knowledge base + blog (10k articles, 200k searches/mo)**

- **Algolia:** Growth plan $499/mo minimal
- **AACsearch:** Scale plan $99/mo
- **Saving:** ~$400/mo

**Scenario 3: Enterprise help center (50k articles, 1M searches/mo, 5 languages)**

- **Algolia:** Enterprise custom pricing ~$1,500/mo (with multi-language index overhead)
- **AACsearch:** Pro plan $249/mo
- **Saving:** ~$1,250/mo

### Use Cases

**Developer documentation for a SaaS platform**

A B2B SaaS company with 800+ documentation pages needed search that could handle code blocks, API references, and versioned docs. AACsearch indexed headings with higher boost weights so "Installation" and "API Reference" surfaced first. The script-tag widget rendered results in an overlay with keyboard navigation — users could type, arrow down, and hit Enter to jump to the right page. Zero-result analytics showed that "webhook retries" was a top unfound query, leading to a new guide that reduced support tickets by 18%.

**Multi-language help center**

An e-commerce platform serving 5 European markets needed search across translated help articles. AACsearch's per-field language analyzers let them index `title_en`, `title_de`, `title_fr` with the correct stemmer for each language. Users searching in their own language got relevant results because the analyzer matched the content language — not just keyword overlap. The dashboard showed which language versions had the most zero-result queries, revealing untranslated articles.

**Blog with 3,000+ technical posts**

A content-heavy site with 3k+ blog posts needed search that could handle long-form content, code snippets, and technical terminology. AACsearch's full-text indexing with customizable snippet length showed the most relevant paragraph from each post. Tags, categories, and author metadata were added as filterable fields. Built-in analytics revealed that "Docker compose" and "migration script" were the most common searches — informing their content roadmap for the next quarter.

### Migration Guide

**From Algolia (DocSearch / InstantSearch):**

1. Export your Algolia index records
2. Create an AACsearch index via dashboard
3. Import records — schema auto-maps string, number, and array fields
4. Configure searchable fields (title, headings, body, tags) and boost weights
5. Replace InstantSearch initialization with AACsearch widget script tag
6. Migrate any custom ranking rules (AACsearch supports dynamic ranking in dashboard)

**From Google Programmable Search:**

1. Export your content index (or start fresh from your CMS)
2. Push documents to AACsearch via API or CSV import
3. Replace the Google Programmable Search embed code with the AACsearch script tag
4. Map your content schema (AACsearch uses flat documents — title, url, content, excerpt, etc.)
5. Configure multi-language analyzers if serving international content

**From self-hosted Elasticsearch:**

1. Export documents using elasticdump
2. Flatten nested structures into flat schemas
3. Map Elasticsearch analyzers to AACsearch language analyzers
4. Import via AACsearch API (batch of 10k docs recommended)
5. Deploy the AACsearch widget to replace your custom search frontend

### FAQ

**Q: Does AACsearch work with static site generators (Hugo, Jekyll, Astro)?**
A: Yes. Export your content as JSON during the build step, then push to AACsearch via API. The widget is a plain script tag — it works with any HTML page regardless of framework.

**Q: Can I search across multiple content types (docs + blog + forum)?**
A: Yes. Either index everything in one index with a "type" field for filtering, or create separate indices and use multi-index search via API.

**Q: How fresh is the search index?**
A: As fresh as you make it. Push document updates via API or webhook — they're searchable in under 100ms. No crawl delay.

**Q: Can I customize the search widget to match my brand?**
A: Yes. The widget uses CSS variables for colors, fonts, border radius, and spacing. You can override everything in your stylesheet. Full customization guide is in the docs.

**Q: Does AACsearch index PDFs or other binary files?**
A: Not directly. Extract text from PDFs and push it as a document field. Most static site generators and CMS platforms already extract content from files before output.

**Q: Is there a limit on document size?**
A: Individual documents can be up to 100KB. For large content like blog posts or documentation pages, this is more than sufficient.

### CTA

**[Add Site Search in 5 Minutes →](/signup)** — Drop in the script tag, index your content, and go live. Free tier available.

---

### Translation Key Structure (for CTO)

```json
{
	"useCases.siteSearch.hero.headline": "Don't let visitors hunt. Give them answers in milliseconds.",
	"useCases.siteSearch.hero.bullet1": "One-script-tag embed",
	"useCases.siteSearch.hero.bullet1Desc": "Drop a script tag into your site header — full-featured search bar, no build step required.",
	"useCases.siteSearch.hero.bullet2": "Full-text search with smart ranking",
	"useCases.siteSearch.hero.bullet2Desc": "TF-IDF ranking with customizable boost fields so the most relevant content surfaces first.",
	"useCases.siteSearch.hero.bullet3": "Analytics that close feedback loops",
	"useCases.siteSearch.hero.bullet3Desc": "See what users search for and what returns zero results. Improve your content based on real queries.",
	"useCases.siteSearch.seo.title": "Site Search for Documentation, Blogs & Knowledge Bases | AACsearch",
	"useCases.siteSearch.seo.description": "Give users instant answers with AACsearch site search. Full-text search across docs, blogs, and help centers.",
	"useCases.siteSearch.freeTrial": "Add Site Search in 5 Minutes",
	"useCases.siteSearch.freeTrialNote": "Free tier includes 1 index and 10k docs. No credit card required."
}
```

### Files to create (CTO)

- `apps/marketing/app/[locale]/use-cases/site-search/page.tsx`
- `packages/i18n/translations/{en,de,es,fr,ru}/marketing.json` — add `useCases.siteSearch.*` keys
- `packages/ui/components/use-case-layout.tsx` (optional, reusable layout for use-case pages)
