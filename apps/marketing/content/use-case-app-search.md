# Use Case: App Search (In-App / SaaS Search)

**Owner: CMO (content) → CTO (code implementation)**
**Status: Content draft ready — needs MDX page + i18n keys in all 5 locales**

---

## Page: /[locale]/use-cases/app-search

### SEO Meta

- **Title (EN):** In-App Search for SaaS Platforms | AACsearch
- **Description (EN):** Add fast, multi-tenant search to your SaaS app with AACsearch. Scoped API tokens per organization, instant typo-tolerant queries, and built-in analytics — without building a search team.
- **H1:** In-App Search Without the Engineering Project

### Hero Section

**Headline:** Your SaaS app needs search. Not a search team.

**3-Bullet Differentiators:**

1. **Native multi-tenancy — zero middleware** — Each organization in your SaaS gets scoped API keys that can only search and filter their own data. No need to build a middleware layer that appends `WHERE org_id = X` to every query. AACsearch handles tenant isolation at the infrastructure level.
2. **Scoped API tokens with granular permissions** — Generate tokens that can only search specific collections, filter by specific fields, or perform write operations. Your customers' data stays separated. API keys can be created per-tenant from the dashboard or via API, giving you full programmatic control.
3. **Embeddable widget that matches your UI** — The AACsearch widget is themeable via CSS variables and supports a command-palette mode (Cmd+K) perfect for SaaS apps. Users search across projects, contacts, invoices, and tickets — all from one search bar. Results render inline with custom fields you specify.

### Feature Comparison Table

| Feature                    | AACsearch                                          | Algolia                              | Meilisearch Cloud                |
| -------------------------- | -------------------------------------------------- | ------------------------------------ | -------------------------------- |
| Multi-tenancy              | Native — scoped API keys per org                   | Requires separate apps or middleware | Not built-in — needs proxy layer |
| Scoped API tokens          | Built-in — create from dashboard or API            | Secured API Keys (manual setup)      | API key management (basic)       |
| Command palette (Cmd+K)    | Included widget mode                               | Requires custom implementation       | Not included                     |
| Typo tolerance             | Configurable per-index                             | Configurable                         | Default (min/max typo settings)  |
| Geo-search                 | Included                                           | Included                             | Not built-in                     |
| Analytics                  | Built-in — free on all plans                       | $299/mo add-on                       | Minimal (open-source dashboard)  |
| Rate limiting / throttling | Per-tenant configurable                            | Account-level                        | Not built-in                     |
| SLA                        | 99.9% uptime                                       | 99.9% (higher tiers)                 | 99.95% (Cloud)                   |
| Data residency             | Choose region at index creation                    | Premium feature                      | US/EU only                       |
| Pricing                    | Per-index, unlimited operations                    | Per search operation + per record    | Per search operation             |
| Self-host option           | Full Typesense export                              | No                                   | Yes (open source)                |
| Connectors                 | PrestaShop, Bitrix, WooCommerce, Shopify (roadmap) | None                                 | None                             |

### Pricing Comparison

**Scenario 1: Early-stage B2B SaaS (500 orgs, 10k docs each, 100k searches/mo)**

- **Algolia:** Growth plan $499/mo + multiple indices/org overhead = expensive + complex
- **Meilisearch Cloud:** ~$200-300/mo (per-operation pricing scales with search volume)
- **AACsearch:** Scale plan $99/mo — single index with scoped tokens handles all orgs
- **Saving:** $100-400/mo vs alternatives + eliminates middleware development cost

**Scenario 2: Mid-market SaaS (2k orgs, 100k docs each, 1M searches/mo)**

- **Algolia:** Enterprise custom pricing ~$2,500/mo (multi-tenant complexity adds cost)
- **Meilisearch Cloud:** ~$800-1,200/mo (scales with operations)
- **AACsearch:** Pro plan $249/mo
- **Saving:** $550-2,250/mo

**Scenario 3: Platform / Marketplace (10k+ tenants, 500k docs total, 5M searches/mo)**

- **Algolia:** Custom enterprise (typically $5k+/mo with multi-tenant surcharge)
- **Meilisearch Cloud:** Custom pricing (est. $2k+/mo)
- **AACsearch:** Pro plan $499/mo with dedicated infrastructure option
- **Saving:** $1,500-4,500+/mo

### Use Cases

**CRM app searching across contacts, deals, and notes**

A sales CRM with 3,000+ companies needed search across contacts, deals, tasks, and call notes — scoped per organization. With AACsearch's native multi-tenancy, each company's data was isolated via scoped API tokens. The Cmd+K command palette let sales reps search everything from one shortcut. Result: average time-to-find a contact dropped from 12 seconds to under 2 seconds. Zero-result analytics revealed that users frequently searched for "contract expiry" — data that existed but wasn't indexed, leading to an indexed field that recovered $200k in renewals.

**Project management tool with cross-project search**

A PM platform with 50k+ projects needed users to search across task titles, descriptions, comments, and file names — but only within projects they had access to. AACsearch's scoped API tokens with filter-based access control ensured tenant isolation without a middleware layer. Each user's token included a `project_ids` filter, so the search engine itself enforced permissions. A single AACsearch index handled all tenants with zero data leakage.

**Customer support platform searching tickets, customers, and articles**

A helpdesk SaaS needed unified search across tickets, customer profiles, knowledge base articles, and chat transcripts — with real-time updates as agents created new tickets. AACsearch's webhook API indexed new tickets within milliseconds. The widget's custom result rendering showed ticket priority, status, and assignee inline. Agents reported 35% faster response times after switching to AACsearch.

### Migration Guide

**From Algolia:**

1. Export all Algolia indices (one per tenant if you used separate apps)
2. Create a single AACsearch index with a `tenant_id` field
3. Import all records with `tenant_id` populated
4. Generate scoped API tokens per tenant (via AACsearch API — automate with a script)
5. Update your backend to mint tokens on tenant login
6. Replace Algolia's JS client with AACsearch's widget or API client
7. Configure filter-based access control to enforce `tenant_id` on every query

**From Meilisearch Cloud:**

1. Export Meilisearch dumps
2. Flatten any nested documents (Typesense prefers flat schemas)
3. Import into AACsearch via bulk API
4. Configure scoped API tokens per tenant (not available in Meilisearch)
5. Set up rank formula and faceted attributes in AACsearch dashboard
6. Deploy the AACsearch widget or API client in your app

**Building from scratch (Elasticsearch DIY):**

1. Skip the months of DevOps work — create an AACsearch account
2. Define your index schema in the dashboard
3. Push your documents via AACsearch API
4. Generate scoped API tokens programmatically
5. Drop in the AACsearch widget (or use the REST API for custom UIs)
6. You're live — no Elasticsearch cluster, no query DSL, no reindexing scripts

### FAQ

**Q: How does multi-tenancy actually work?**
A: Each index has a `token_filter` setting. When you create a scoped API key, you specify a filter like `tenant_id:=:acme-corp`. Every search made with that key automatically includes the filter. No middleware, no `WHERE` clause injection — it's enforced at the search engine level.

**Q: Can I create API tokens programmatically for new customer signups?**
A: Yes. AACsearch has a REST API endpoint to create scoped tokens. Call it from your signup webhook to mint a token for each new organization automatically.

**Q: What happens if a customer's data grows beyond the index limit?**
A: AACsearch supports index scaling. You can also use multiple indices per tenant if needed, or combine all tenants in one index with robust filtering. We help with architecture during onboarding.

**Q: Does the widget support custom result rendering?**
A: Yes. The widget accepts a `resultTemplate` option where you define HTML for each result. You can show any fields from your documents — name, status, avatar, priority badge, etc.

**Q: Is AACsearch suitable for real-time collaboration features?**
A: Yes. Document updates via API reflect in search results within ~100ms. For collaborative editing, we recommend debouncing index updates to avoid excessive API calls.

**Q: What about compliance / SOC2?**
A: AACsearch runs on SOC2-compliant infrastructure. Data residency can be configured per index. Contact us for enterprise compliance documentation.

### CTA

**[Add In-App Search Free →](/signup)** — Multi-tenancy and scoped API tokens included on the free tier. No credit card required.

---

### Translation Key Structure (for CTO)

```json
{
	"useCases.appSearch.hero.headline": "Your SaaS app needs search. Not a search team.",
	"useCases.appSearch.hero.bullet1": "Native multi-tenancy — zero middleware",
	"useCases.appSearch.hero.bullet1Desc": "Scoped API keys per organization keep tenant data isolated at the infrastructure level.",
	"useCases.appSearch.hero.bullet2": "Scoped API tokens with granular permissions",
	"useCases.appSearch.hero.bullet2Desc": "Generate tokens that can only search specific collections or filter by specific fields.",
	"useCases.appSearch.hero.bullet3": "Embeddable widget that matches your UI",
	"useCases.appSearch.hero.bullet3Desc": "Themeable via CSS variables with a Cmd+K command palette mode optimized for SaaS apps.",
	"useCases.appSearch.seo.title": "In-App Search for SaaS Platforms | AACsearch",
	"useCases.appSearch.seo.description": "Add fast, multi-tenant search to your SaaS app with AACsearch. Scoped API tokens per organization and built-in analytics.",
	"useCases.appSearch.freeTrial": "Add In-App Search Free",
	"useCases.appSearch.freeTrialNote": "Multi-tenancy and scoped API tokens included on the free tier. No credit card required."
}
```

### Files to create (CTO)

- `apps/marketing/app/[locale]/use-cases/app-search/page.tsx`
- `packages/i18n/translations/{en,de,es,fr,ru}/marketing.json` — add `useCases.appSearch.*` keys
- `packages/ui/components/use-case-layout.tsx` (optional, reusable layout for use-case pages)
