# Case Study Template — AACSearch

## Structure (Problem → Solution → Results → Quote)

---

### Metadata

- **Company:** [Name]
- **Industry:** [e.g., E-commerce / SaaS / Media]
- **Size:** [Revenue / Employees / Products indexed]
- **Previous solution:** [Elasticsearch / Algolia / Custom / None]
- **Use case:** [Site search / Product search / Content search]
- **AACSearch since:** [Month, Year]

---

### 1. The Problem (2-3 paragraphs)

**What was the customer struggling with before AACSearch?**

Focus on the pain points that drove them to search for an alternative. Typical angles:

- _Cost:_ "Our Algolia bill was growing 3x faster than revenue"
- _Complexity:_ "Elasticsearch was eating 20 hours of DevOps time per week"
- _Limitations:_ "We couldn't get good search results for our international catalog"
- _Speed:_ "Search latency was killing our conversion rate"

**Template:**

> [Company] was [description of the problem]. Their [previous solution] was [specific pain: too expensive / too slow / too complex]. With [metric] products and [metric] monthly searches, the issue was becoming critical.

---

### 2. The Solution (2-3 paragraphs)

**Why AACSearch, and how did they implement it?**

- Discovery phase: how they found AACSearch (comparison, referral, blog post)
- Implementation: timeline, team size, key steps
- Technical details: connectors used, API integration, migration process

**Template:**

> After evaluating [alternatives], [Company] chose AACSearch because [key reasons]. The implementation took [timeframe] and involved [integration details — API, connector, custom build]. Key features they relied on: [feature 1], [feature 2], [feature 3].

---

### 3. The Results (bullet points with numbers)

**Measurable impact after switching to AACSearch.**

Quantify EVERYTHING:

| Metric               | Before | After     | Improvement   |
| -------------------- | ------ | --------- | ------------- |
| Monthly search cost  | $XXX   | $XX       | 10x reduction |
| Search latency (p95) | XXms   | XXms      | X% faster     |
| DevOps hours/week    | XXh    | Xh        | 90% reduction |
| Conversion rate      | X%     | X%        | +X%           |
| Time to deploy       | X days | X minutes | —             |

**Common result areas:**

- **Cost reduction:** 5-10x savings vs Algolia / self-hosted ES
- **Performance:** sub-10ms query times
- **DevOps savings:** zero maintenance, zero downtime
- **Search quality:** improved relevance, instant typo-tolerance

---

### 4. The Quote

> _"[Specific, quotable statement about the impact AACSearch had on their business]"_
> — Name, Title at Company

**Good quote formula:**

> "Switching to AACSearch saved us [amount] and [time/resource]. The search quality is better, our users find products faster, and we haven't touched a server in months. It's the easiest infrastructure decision we've made."

---

### 5. Technical Details (optional, sidebar format)

- **search-client:** @repo/search-client vX.Y
- **Documents indexed:** XXX,XXX
- **Collections:** [product / article / user]
- **Languages:** en, de, es, fr, ru
- **Integrations:** [Next.js / PrestaShop / Bitrix / Custom API]

---

## Candidate Companies to Approach

Priority order for case study outreach:

1. **[Early user 1 - e-commerce store]**
   - Contact method: in-app chat / email
   - Likely angle: "How [Store] increased product discovery by X% with AACSearch"
   - Their metrics: number of products, search queries/mo, conversion rate

2. **[Early user 2 - SaaS platform]**
   - Contact method: in-app chat / email
   - Likely angle: "How [SaaS] cut their search infrastructure costs by 10x"
   - Their metrics: docs/articles indexed, API calls/mo, team size

3. **[Early user 3 - agency / web dev]**
   - Contact method: in-app chat / email
   - Likely angle: "How [Agency] delivers enterprise search for clients at startup prices"
   - Their metrics: client sites, total searches, integration methods

---

## Outreach Email Template

```markdown
Subject: Would you be open to sharing your AACSearch experience?

Hi [Name],

I noticed you've been using AACSearch for [X weeks/months], and I'd love to feature your experience in a case study.

The goal is to highlight how [Company Name] uses AACSearch — the problem you solved, how you implemented it, and the results you've seen. It takes about 30 minutes of your time, and we handle the writing.

In return: a featured spot on our website, social media promotion to our audience, and a lifetime discount on your current plan.

Would you be open to a quick call next week?

Best,
Alex Chibilyaev
Founder, AACSearch
```

---

## Format for Publication

Case studies go in: `apps/marketing/content/case-studies/{slug}.mdx`

Frontmatter:

```yaml
---
title: "How [Company] Achieved [Result] with AACSearch"
date: YYYY-MM-DD
authorName: Alex Chibilyaev
excerpt: "[1-sentence summary]"
tags: [case-study, ecommerce/saas/dev]
published: true
---
```

The full case study MDX should mirror the 5-section structure above.
