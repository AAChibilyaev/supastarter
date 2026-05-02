# Launch Week Content Calendar — AACsearch

> Launch campaign: Product Hunt + HackerNews + Blog + Social + Email
> Status: Planned (gated on Stripe/billing AAC-105)
> Launch date: TBD (next available Wednesday)

---

## Schedule Overview

| Day     | Date    | Activity                                                  | Channel          | Owner   |
| ------- | ------- | --------------------------------------------------------- | ---------------- | ------- |
| D-7     | Mon     | Teaser tweet: "Building a search engine in 2026"          | X/Twitter        | CMO     |
| D-5     | Wed     | Blog: "Why we chose Typesense over Algolia/Elasticsearch" | Blog + X         | CMO     |
| D-3     | Fri     | Blog: "Zero-downtime reindexing: How it works"            | Blog + HN        | CMO     |
| D-2     | Sat     | Email: "Coming this week" to waitlist + newsletter        | Email            | CMO     |
| **D+0** | **Wed** | **LAUNCH DAY** (PH + HN + Blog)                           | **All channels** | **CMO** |
| D+1     | Thu     | Blog: "AACsearch vs Algolia: Side-by-side comparison"     | Blog + X         | CMO     |
| D+3     | Sat     | Blog: "How to add search to your PrestaShop store"        | Blog + X         | CMO     |
| D+7     | Wed     | Recap: "Week 1 metrics — launch transparency"             | Blog + X         | CMO     |

---

## Blog Post Status

| #   | Title                                 | Status                     | File           |
| --- | ------------------------------------- | -------------------------- | -------------- |
| 1   | "Introducing AACsearch" (launch day)  | Drafted                    | /content/blog/ |
| 2   | "Why we chose Typesense" (D-5)        | Drafted                    | /content/blog/ |
| 3   | "Zero-downtime reindexing" (D-3)      | Drafted                    | /content/blog/ |
| 4   | "AACsearch vs Algolia" (D+1)          | Drafted                    | /content/blog/ |
| 5   | "PrestaShop search integration" (D+3) | Drafted                    | /content/blog/ |
| 6   | "Week 1 metrics" (D+7)                | Needs writing after launch | /content/blog/ |

All blog posts need MDX files in all 5 locales (en, de, es, fr, ru).

---

## Launch D+0 Detailed Schedule

| Time (PST)   | Activity                                            | Notes                                     |
| ------------ | --------------------------------------------------- | ----------------------------------------- |
| **8:00 AM**  | Team standup: final checks, divide monitoring       | Verify API status, demo env, all accounts |
| **8:30 AM**  | Smoke test: signup flow, search, analytics, pricing | Last-chance bug catch                     |
| **9:00 AM**  | **Product Hunt goes live**                          | PH listings auto-publish at set time      |
| **9:05 AM**  | Tweet PH link + first tweet in thread               | Include PH badge GIF if available         |
| **9:15 AM**  | **Show HN post** (staggered 15 min)                 | Link to PH in first HN comment            |
| **9:30 AM**  | Blog: "Introducing AACsearch" published             | Cross-link to PH + HN                     |
| **10:00 AM** | LinkedIn post by founder                            | Professional angle, link to blog          |
| **12:00 PM** | Mid-day check: reply to all PH/HN comments          | Track upvotes, signups, traffic           |
| **3:00 PM**  | Afternoon push: second wave of replies              | HN second-chance front page               |
| **6:00 PM**  | Evening recap: metrics screenshot + tweet           | Share early KPIs                          |
| **9:00 PM**  | Final check: reply to late comments                 | Don't leave anyone hanging                |

---

## Social Media Content

### D-7: Teaser Tweet Thread (X/Twitter)

**Tweet 1:**
"I spent 6 months building a search engine.
Yes, in 2026.
Here's why, and what I learned along the way. 🧵"

**Tweet 2:**
"Every SaaS needs search.
Algolia = $500/mo at 1M queries.
Elasticsearch = ops nightmare.
Typesense = amazing but you manage it yourself.
So I built a hosted version that's 10x cheaper than Algolia."

**Tweet 3:**
"Zero-downtime reindexing.
Pre-built connectors.
Built-in analytics.
Tenant isolation.
All on open-source Typesense.
Launching next week. Stay tuned."

**Tweet 4:**
"Sign up for early access → aacsearch.com
No credit card needed.
Free tier: 10K searches/month.
Prolly don't need more if you're just testing. 😄"

---

### D-5: Why Typesense (Tweet)

"Why Typesense?

- 10x faster than Elasticsearch on benchmarks
- Typo tolerance by default
- Faceted filtering built-in
- Open source (Apache 2.0)
  We run it as a managed service so you don't have to.
  Blog post: [link]"

---

### D-3: Zero-downtime Reindexing (Tweet)

"The scariest thing about search? Updating your index while users are searching.
Most solutions: index goes down for 30s-5min.
AACsearch: build v2 in shadow → atomic swap → zero downtime.
How it works: [link]"

---

### D+0: Launch Day Thread

**Tweet 1:**
"We just launched on @ProductHunt! 🚀
AACsearch — hosted search as a service, 10x cheaper than Algolia.
Built on open-source Typesense.
Check it out and drop your feedback: [PH link]"

**Tweet 2:**
"What makes AACsearch different:
• Zero-downtime reindexing
• Pre-built connectors (Next.js, React, PrestaShop, Bitrix)
• Built-in analytics + click tracking
• Tenant isolation by design
• Open-core — cloud or self-hosted"

**Tweet 3:**
"Pricing that won't make you cry:
Free: 10K searches/mo (no credit card)
Pro: $29/mo (100K)
Enterprise: $299/mo (custom)
vs Algolia: about 10x cheaper at every tier."

**Tweet 4:**
"Tech stack for the curious:
• Next.js 16 + React 19 + TypeScript
• Typesense search engine
• Hono + oRPC API layer
• Prisma + PostgreSQL
• Tailwind CSS v4 + Shadcn UI
• Coolify deployment
All open-core. GitHub linked in bio."

---

## Email Sequence

### D-2: "Something big is coming" (to waitlist)

**Subject:** Something big is coming this week
**Preview:** AACsearch launches on Product Hunt

Body:
"Hey {{name}},

You signed up for AACsearch early access — thank you! 🎉

This Wednesday we're launching on Product Hunt and HackerNews. We'd love your support.

**Here's what's coming:**

- Zero-downtime reindexing (finally, search that doesn't go down when you update it)
- Pre-built connectors for Next.js, React, PrestaShop, Bitrix
- Analytics with query monitoring and click tracking
- Pricing that's about 10x cheaper than Algolia

**How you can help:**

1. Upvote us on Product Hunt on Wednesday [link will be sent]
2. Share your feedback — we read every comment
3. Refer a friend who needs better search

See you Wednesday!
Alexandr & the AACsearch team"

---

### D+0: "We're live on Product Hunt!"

**Subject:** We're live on Product Hunt! 🚀
**Preview:** Upvote AACsearch and get early access

Body:
"Hey {{name}},

We're live! AACsearch just launched on Product Hunt.

**👉 [Upvote on Product Hunt]**

Your early access is active. You can:

- Create your first collection in under 2 minutes
- Embed the search widget on your site
- Invite your team

If you have a moment, drop a comment on PH — we read every single one and respond personally.

Thank you for being part of this journey!

Alexandr & the AACsearch team"

---

### D+2: "Early results are in"

**Subject:** 500+ upvotes and counting 🎉
**Preview:** Launch week numbers

Body:
"Hey {{name}},

Our first 48 hours have been incredible:

- {{X}} upvotes on Product Hunt
- {{Y}} comments across PH and HN
- {{Z}} new signups

Thank you to everyone who upvoted, commented, and signed up!

**What's next:**

- {{Feature 1}} — coming in June
- {{Feature 2}} — in development
- We're building based on your feedback

If you haven't tried AACsearch yet, now's the time:
**👉 [Go to Dashboard]**

Alexandr & the AACsearch team"

---

### D+7: "Our first week"

**Subject:** Our first week: {{X}} signups, {{Y}} learnings
**Preview:** Launch transparency post

Body:
"Hey {{name}},

One week in. Here's what happened:

**The numbers:**

- PH upvotes: {{X}}
- HN points: {{Y}}
- New signups: {{Z}}
- Active collections created: {{W}}
- Paid conversions: {{V}}

**What we learned:**

- {{Key insight 1}}
- {{Key insight 2}}
- {{Key insight 3}}

**What's next on the roadmap:**

- {{Feature}}
- {{Feature}}
- {{Feature}}

Read the full transparency post: [blog link]

Thank you for being part of this. The best is yet to come.

Alexandr & the AACsearch team"

---

## Social Media Assets Needed

| Asset                   | Format | Size     | Status                 |
| ----------------------- | ------ | -------- | ---------------------- |
| PH launch graphic       | PNG    | 1200x630 | Drafted (needs design) |
| Launch day tweet images | PNG    | 1200x675 | Needed                 |
| LinkedIn post image     | PNG    | 1200x627 | Needed                 |
| Email banner            | PNG    | 600x200  | Needed                 |
| Metrics screenshot      | PNG    | 1600x900 | After launch           |

---

## Reporting & Tracking

**Track these metrics every 2 hours on launch day:**

| Metric                                        | Source               | Target                  |
| --------------------------------------------- | -------------------- | ----------------------- |
| PH upvotes                                    | producthunt.com      | 300+ in 24h             |
| HN points                                     | news.ycombinator.com | 50+                     |
| PH + HN comments                              | Manually count       | 50+                     |
| New signups                                   | PostHog / dashboard  | 100+                    |
| Signup source attribution                     | UTM params           | PH > HN > Direct > Blog |
| Blog traffic                                  | PostHog              | 1,000+ visits in 24h    |
| Conversion rate (signup → collection created) | PostHog              | >40%                    |
| Server uptime                                 | Status check         | 99.9%                   |

---

## Cross-Post Linking Strategy

- **PH listing** → Links to: Blog post, aacsearch.com, Twitter thread
- **HN post** → Links to: aacsearch.com, docs, GitHub (NO direct PH link — HN mods may flag)
- **First HN comment** → Links to: PH listing for upvotes ("if you found this interesting, we're also on PH")
- **Blog posts** → Links to: Sign up CTA, related posts
- **Tweets** → Links to: PH listing (launch day), Blog posts (other days)
- **LinkedIn** → Links to: Blog post (not PH — LinkedIn audience ≠ PH audience)
- **Email** → Links to: PH (D+0), Dashboard (D+2, D+7)

---

## Launch Day Operations Checklist

### Pre-launch (D-1)

- [ ] All blog posts scheduled (or ready to publish manually)
- [ ] Email sequence queued in email provider
- [ ] PH listing submitted with all gallery images
- [ ] HN account ready (karma > 10, exists > 1 year ideal)
- [ ] Twitter thread drafted in TweetDeck / compose window
- [ ] LinkedIn post drafted
- [ ] Team has link to shared launch dashboard
- [ ] API monitoring alerts configured
- [ ] Status page ready (if applicable)
- [ ] Customer support auto-reply set up ("we'll respond within 2h")

### Launch Day (D+0)

- [ ] 8:00 AM — Team standup
- [ ] 8:30 AM — Smoke tests pass
- [ ] 9:00 AM — PH goes live
- [ ] 9:05 AM — Tweet 1 (PH link)
- [ ] 9:15 AM — Show HN post
- [ ] 9:30 AM — Blog published
- [ ] 10:00 AM — LinkedIn post
- [ ] Continuous — Reply to every comment within 2h
- [ ] 12:00 PM — Metrics check-in
- [ ] 3:00 PM — Second wave responses
- [ ] 6:00 PM — End-of-day recap

### Post-launch (D+1 to D+7)

- [ ] D+1 — Publish "AACsearch vs Algolia" blog
- [ ] D+2 — Send "Early results" email
- [ ] D+3 — Publish PrestaShop integration blog
- [ ] D+7 — Write and publish "Week 1 metrics" transparency post
- [ ] D+7 — Send "Week 1 recap" email
