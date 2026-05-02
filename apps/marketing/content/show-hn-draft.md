# Show HN: AACsearch — Typesense-powered search as a service, open-core

## Title Recommendation

**Final title:**
"Show HN: AACsearch – Hosted search as a service, 10x cheaper than Algolia"

**Backup title:**
"Show HN: AACsearch – Typesense-powered search infrastructure, open-core"

**Why this title:**

- "10x cheaper than Algolia" drives curiosity + comparison clicks
- "Hosted search as a service" is clear value proposition
- Under 80 chars for clean display on HN

---

## Post Body (what goes in the text area)

Hi HN! I built AACsearch to make hosted search actually affordable.

**The problem:** Every SaaS needs search. Algolia is great but expensive at scale. Elasticsearch is powerful but a pain to operate. Typesense is amazing open-source software, but you still need to host and manage it yourself.

**AACsearch** is a hosted search-as-a-service built on Typesense. Think of it as "managed search infrastructure" — deploy in minutes, no ops, pay per search.

**What you get:**

- Zero-downtime reindexing (index v2 while v1 serves traffic, swap atomically)
- Pre-built connectors for Next.js, React, PrestaShop, Bitrix
- Analytics dashboard: query monitoring, popular searches, click tracking
- i18n search UI in 5 languages (en, de, es, fr, ru)
- Tenant isolation by design (multi-tenant from day one)
- Open-core model — cloud hosted + self-hosted enterprise option
- Knowledge RAG for semantic search (optional)

**Tech stack:** Next.js 16, Typesense, Hono, Prisma, oRPC. ~40% search core, 30% marketing/saas app, 30% connectors and tooling.

**Pricing:** Free tier at 10K searches/month, no credit card. Pro at $29/mo (100K searches). Enterprise at $299/mo. About 10x cheaper than comparable Algolia plans.

**Demo:** aacsearch.com — create an account, index your first collection in under 2 minutes.

---

## First Comment Strategy

HN shows the first comment above the post if the post itself is a link (not text). Since Show HN is a text post, the post body IS the first thing people see. But I should still post a follow-up comment immediately:

```
Hey HN! I'm the founder. Happy to answer any questions about:

- Why Typesense vs Elasticsearch vs Algolia
- How zero-downtime reindexing works under the hood
- Self-hosting vs cloud pricing
- What connectors we're building next (WordPress? Shopify?)

Some quick technical details:
- We run Typesense 26.x clusters per tenant
- Reindexing works by building v2 in a shadow collection, then atomic swap
- Analytics pipeline processes ~50ms per query for real-time dashboards
- Entire stack is TypeScript, Prisma on Postgres, deployed via Coolify

Would love your honest feedback — especially what's missing!
```

---

## FAQ Template (for anticipated HN questions)

**Q: How is this different from just using Typesense Cloud?**
A: AACsearch adds zero-downtime reindexing, pre-built connectors, analytics dashboards, and tenant-isolated search API keys on top of Typesense. Think of it as Typesense + the SaaS infrastructure you'd otherwise build yourself.

**Q: Why not just use Meilisearch?**
A: Typesense has stronger faceted filtering, more mature multi-tenant support, and better performance at scale. Both are great — Typesense fit our architecture better for B2B search use cases.

**Q: Can I see the code?**
A: It's open-core. The core search infrastructure, connectors, and widget are open source. The SaaS layer (billing, team management, analytics) is proprietary. Check the GitHub.

**Q: How does pricing compare at 1M searches/month?**
A: At 1M searches: Algolia ~$500/mo (pay-as-you-go), AACsearch ~$299/mo (enterprise plan). At 10M: Algolia ~$4,500/mo, AACsearch enterprise negotiable. Roughly 10-15x savings at mid scale.

**Q: What about hosting in EU for GDPR?**
A: Self-hosted option covers EU data residency. Cloud is currently US-based; EU regions are on the roadmap (Q3 2026).

**Q: Is there a managed WordPress plugin?**
A: Not yet — Next.js, React, PrestaShop, and Bitrix are supported today. WordPress connector is in development. If you need it, upvote on our public roadmap.

---

## Timing Recommendations

**Optimal post time:** Tuesday or Wednesday, 9:00–10:00 AM EST (1:00–2:00 PM UTC)
**Why:** Hits the US morning + EU afternoon crossover. Maximum eyeballs.

**If posting same day as Product Hunt launch:**

- PH goes live at 9:00 AM PST (12:00 PM EST)
- Show HN post at ~9:15 AM PST (12:15 PM EST) — staggered by 15 min so link to PH in comment
- Don't post both at exactly the same time — HN front page competition is fierce

**Fallback:** Thursday same time, if Wednesday is oversaturated.

---

## Success Criteria

- [ ] Front page of HN for ≥ 2 hours
- [ ] 50+ points
- [ ] 30+ comments (respond to every one within 2h)
- [ ] 50+ signups attributed to HN referral
- [ ] No negative sentiment dominating the thread

---

## Pre-Post Checklist

- [ ] Verify all links work (aacsearch.com, docs, GitHub, pricing)
- [ ] Demo account ready to showcase in under 2 min
- [ ] First comment ready to paste immediately after posting
- [ ] Team member monitoring for first 3 hours
- [ ] Draft saved, ready to copy-paste (no formatting to lose)
- [ ] No "email in profile" or "check out my startup" — HN hates that
- [ ] Avoid superlatives ("best", "revolutionary") — HN community is technical and skeptical
