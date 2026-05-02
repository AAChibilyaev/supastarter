# Comparison: AACsearch vs Self-Hosted Typesense

**Owner: CMO (content) → CTO (code implementation)**
**Status: Content draft ready — needs MDX page + i18n keys in all 5 locales**

---

## Page: /[locale]/compare/self-hosted

### SEO Meta

- **Title (EN):** AACsearch vs Self-Hosted Typesense: TCO Comparison | 2026
- **Description (EN):** When self-hosting Typesense costs you $2,000+/mo in hidden ops + infrastructure, AACsearch at $99/mo is the smarter choice. We did the math.
- **H1:** AACsearch vs Self-Hosted Typesense — The Real Cost

### Hero Section

**Headline:** Your time is worth more than your server bill.

**3-Bullet Differentiators:**

1. **TCO: $99/mo vs $2,100/mo** — Self-hosting Typesense on a production cluster costs ~$100/mo in infrastructure (2-node cloud VMs + storage + backups) + ~$2,000/mo in ops labor (monitoring, scaling, patching, incident response). AACsearch = $99/mo all-in.
2. **Zero DevOps overhead** — No Kubernetes, no Terraform, no Prometheus, no pager duty. We handle scaling, failover, backups, and TLS certificates. You handle your product.
3. **Everything included, no duct tape** — Analytics dashboard, API key management, rate limiting, scoped tokens, webhook connectors — all the things you'd build yourself on top of self-hosted Typesense. We estimate 3-6 months of engineering time saved.

### TCO Breakdown Table

| Cost Item                                      | Self-Hosted            | AACsearch          |
| ---------------------------------------------- | ---------------------- | ------------------ |
| **Infrastructure (monthly)**                   |                        |                    |
| 2-node Typesense cluster (cloud VMs, 4GB each) | $60-120/mo             | —                  |
| Load balancer                                  | $20/mo (managed)       | —                  |
| Block storage + snapshots                      | $20-40/mo              | —                  |
| Outbound data transfer                         | $10-30/mo              | —                  |
| Monitoring infra (Grafana, Prometheus)         | $10-30/mo              | —                  |
| Subtotal infra                                 | $120-240/mo            | Included in $99/mo |
| **Engineering time (monthly, amortized)**      |                        |                    |
| Initial setup & migration (40h one-time ÷ 12)  | $3,333/mo (at $1k/h)   | —                  |
| Ongoing maintenance (4h/week)                  | $1,600/mo              | —                  |
| Incident response (2h/month avg)               | $200/mo                | —                  |
| Feature building (analytics, keys, etc.)       | Already done one-time  | Included           |
| Subtotal engineering                           | $1,800-5,133/mo        | Included           |
| **Real total**                                 | **$1,920 - $5,373/mo** | **$99/mo**         |

### What You'd Need to Build Yourself

| Feature                                 | Effort to Build                |
| --------------------------------------- | ------------------------------ |
| Multi-tenant API key management         | 1-2 weeks                      |
| Scoped search tokens                    | 1-2 weeks                      |
| Rate limiting middleware                | 1 week                         |
| Search analytics pipeline + dashboard   | 3-4 weeks                      |
| Embeddable search widget (JS/React/Vue) | 2-3 weeks                      |
| Webhook connectors (PrestaShop, Bitrix) | 3-4 weeks per connector        |
| Admin user dashboard                    | 2-3 weeks                      |
| Usage metering and billing              | 2-3 weeks                      |
| **Total: 16-22 weeks of engineering**   | **$64,000 - $88,000 at $1k/h** |

### When to Self-Host

Self-hosting makes sense if:

- You have **dedicated DevOps team** (>1 FTE) already running orchestration
- You need **custom infrastructure** (air-gapped, on-premise, compliance-locked)
- You're at **very large scale** (>50M docs, >50M searches/mo) where managed pricing gets expensive
- You already have **monitoring, alerting, backup, and incident response** infrastructure

### When to Choose AACsearch

AACsearch is better if:

- You're a **team of 1-20 engineers** — your time is better spent on your product
- You want **search in hours, not weeks** — create an index, get API keys, embed the widget
- You need **analytics, connectors, and dashboard** — without building them
- You value **predictable pricing** — no surprise infrastructure bills
- You want **Typesense portability** — never locked in, export anytime

### CTA

**[Start Free Trial →](/signup)** — Get Typesense-powered search in 5 minutes. No DevOps needed.

---

### Translation Key Structure

```json
{
	"compare.selfHosted.hero.headline": "Your time is worth more than your server bill.",
	"compare.selfHosted.hero.bullet1": "TCO: $99/mo vs $2,100/mo",
	"compare.selfHosted.hero.bullet1Desc": "Self-hosting Typesense costs $2,100+/mo when you factor ops labor. AACsearch = $99/mo all-in.",
	"compare.selfHosted.hero.bullet2": "Zero DevOps overhead",
	"compare.selfHosted.hero.bullet2Desc": "No Kubernetes, no Terraform, no Prometheus, no pager duty. We handle everything.",
	"compare.selfHosted.hero.bullet3": "Everything included, no duct tape",
	"compare.selfHosted.hero.bullet3Desc": "Analytics, API keys, rate limiting, scoped tokens, connectors — 3-6 months of engineering saved.",
	"compare.selfHosted.seo.title": "AACsearch vs Self-Hosted Typesense: TCO Comparison | 2026",
	"compare.selfHosted.seo.description": "Self-hosting Typesense costs $2,000+/mo in hidden ops. AACsearch is $99/mo all-in with analytics, connectors, and multi-tenancy included.",
	"compare.selfHosted.freeTrial": "Start Free Trial"
}
```

### Files to create (CTO)

- `apps/marketing/app/[locale]/compare/self-hosted/page.tsx`
- `packages/i18n/translations/{en,de,es,fr,ru}/marketing.json` — add `compare.selfHosted.*` keys
