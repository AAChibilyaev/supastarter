# Product Hunt Launch — AACsearch

## Tagline (≤60 chars)

**Final: "Hosted search as a service — 10x cheaper than Algolia"** (56 chars)

**Subtitle (≤160 chars):**
"Typesense-powered. Zero-downtime reindexing. Pre-built connectors for Next.js, React, PrestaShop, Bitrix. Open-core, developer-first, and a fraction of the cost."

## Gallery Screenshots (5 images, 1600x900)

Screenshots need to be captured from the live app. Instructions for whoever captures:

1. **Dashboard Overview** — /en/dashboard: collections list, search stats widget, API key management card
    - Dark theme, show the sidebar + main content area
2. **Search Results Page** — Search results with faceted filters, highlighting, typo tolerance
    - Show a real query result with filters sidebar
3. **Analytics Dashboard** — /en/analytics: query volume chart, popular searches table, latency, CTR
    - Show the analytics page with data populated
4. **Connectors View** — Connectors page showing Next.js, PrestaShop, Bitrix options
5. **Widget Preview** — Embedded search widget on a demo storefront
    - Can mock this by embedding the widget on a test page

**TODO:** Take screenshots from live app once logged in. Use 1600x900 viewport.

## Maker Comment Draft

Hi Product Hunt! 👋

I built AACsearch because I was tired of paying Algolia enterprise prices and managing Elasticsearch clusters.

AACsearch is **hosted search as a service** powered by [Typesense](https://typesense.org) — the open-source engine that's fast, developer-friendly, and won't break the bank.

**What makes AACsearch different:**

- 🚀 **Zero-downtime reindexing** — deploy index v2 while v1 serves traffic, swap atomically
- 🔌 **Pre-built connectors** — Next.js, React, PrestaShop, Bitrix (WordPress and Shopify coming)
- 📊 **Built-in analytics** — see what users search for, what they click, what they miss
- 💰 **10x cheaper than Algolia** — same developer experience, fraction of the cost
- 🔒 **Tenant isolation** — every customer's data is fully isolated by design
- 🌐 **i18n out of the box** — search UI in 5 languages (en, de, es, fr, ru)

**Quick start in 2 minutes:**
Create an account → create a collection → index your data → embed the search widget.

```
npm install @aacsearch/client
const search = new AACSearchClient({ apiKey: 'ss_search_***' })
const results = await search.query('wireless headphones', {
  collection: 'products',
  filters: { inStock: true }
})
```

We're open-core — cloud at aacsearch.com, self-hosted for enterprise. Would love your feedback!

## Launch Schedule

**Recommended date:** Wednesday (next available), 9:00 AM PST
**Fallback date:** Thursday, 9:00 AM PST (if Wednesday is saturated)

- **8:30 AM** — Final checks: all accounts ready, API status green, demo environment verified
- **9:00 AM** — Product Hunt goes live → share link on Twitter/X immediately
- **9:15 AM** — Show HN post goes up (separate post, linked in first PH comment)
- **9:30 AM** — Blog: "Introducing AACsearch" published on marketing site
- **10:00 AM** — LinkedIn post by founder
- **12:00 PM** — Mid-day check: respond to every PH comment, track metrics
- **3:00 PM** — Afternoon push: reply to late PH comments, check HN thread
- **6:00 PM** — Evening recap tweet with initial metrics

## Anticipated Questions & Responses

**Q: How is this different from Algolia?**
A: Same developer-friendly API but built on open-source Typesense. Typical cost savings are 10x — we're not marking up proprietary infrastructure. You also get zero-downtime reindexing and full data sovereignty with our self-hosted option.

**Q: Can I self-host?**
A: Yes! AACsearch is open-core. Cloud is the fastest way to get started, but we offer self-hosted deployment for enterprise customers who need data residency. See our self-hosting docs.

**Q: How's the search quality compared to Elasticsearch?**
A: Typesense is production-proven — typo tolerance, faceted filtering, and relevance tuning built-in. We add semantic search (Knowledge RAG) on top. Our benchmarks show comparable relevance at 10x lower infrastructure cost.

**Q: What about WordPress / Shopify?**
A: Connectors for both are in active development. Currently we support Next.js, React, PrestaShop, and Bitrix. Drop us a comment with what you need — it helps us prioritize.

**Q: Is it really free to start?**
A: Free tier = 10K searches/month, no credit card required. Pro at $29/mo for 100K. Enterprise from $299/mo with custom limits and self-hosted option.

## Success Criteria

- [ ] 300+ upvotes in 24h
- [ ] 50+ comments (respond to every single one within 2h)
- [ ] 100+ signups attributed to PH
- [ ] Top 5 Product of the Day

## Launch Day Checklist

Pre-launch (day before):

- [ ] Verify all accounts ready (PH, HN, Twitter, LinkedIn)
- [ ] Screenshots captured and uploaded to PH gallery
- [ ] Draft posts saved (PH, HN, blog)
- [ ] Email to waitlist prepped (D-1 teaser)
- [ ] Team has launch-day calendar

Launch day:

- [ ] 8:30 AM — Final smoke test of app
- [ ] 8:45 AM — PH listing goes live
- [ ] 9:00 AM — Tweet thread + HN post
- [ ] 9:30 AM — Blog post published
- [ ] 10:00 AM — LinkedIn post
- [ ] Continuous — Reply to all comments
- [ ] 6:00 PM — End-of-day metrics
