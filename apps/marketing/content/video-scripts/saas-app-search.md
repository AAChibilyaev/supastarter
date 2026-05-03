# AACsearch SaaS App Search — Video Script

**Duration**: ~5:45
**Audience**: SaaS developers building multi-tenant applications (B2B, B2C, marketplace platforms)
**Format**: Screen recording + voiceover + captions
**CTA**: https://aacsearch.com → "Start for free"

---

## Scene 1: Hook — Multi-Tenant Search Challenge (0:00-0:45)

**Visual**: SaaS dashboard — two customer orgs side by side. "Acme Corp" searching for "invoices" gets their own data. "Globex Inc" searching "invoices" gets ONLY their data. Animation shows tenant isolation — search query hits a shared index but returns per-tenant results

**Narration**:

> "You're building a SaaS product. Every customer needs search — but they must never see each other's data. Elasticsearch doesn't handle this natively. Self-hosting Typesense? You'd need one cluster per tenant."
>
> "AACsearch is built for multi-tenant SaaS from day one. One index, per-tenant isolation, scoped API keys for your customers. Let me show you how it works."

**On-screen**: "Built for SaaS" badge, "One index → per-tenant isolation"

---

## Scene 2: Tenant Isolation via Scoped API Keys (0:45-2:00)

**Visual**:

1. Dashboard > API Keys > Create Scoped Key
2. Configure: Name "Acme Corp KEY", Organization filter "acme_corp_org_id"
3. Configure: Allowed actions: search, documents:read (no write)
4. Set rate limit: 100 req/min
5. Generate key → shows once: "ss_scoped_a1b2c3d4..."
6. Copy key, paste into Acme Corp's app config

**Narration**:

> "Go to API Keys in your dashboard and create a Scoped Key. Instead of giving every tenant the same master key, you create a key that can only search data belonging to a specific organization."
>
> "Select the organization filter — just paste your customer's organization ID. The key is automatically restricted: it can search and read documents, but can't write or delete."
>
> "AACsearch shows you the key exactly once. It's stored as a hash in our database — not even we can retrieve it later."

**On-screen**: "ss*scoped*..." key format shown once, then replaced with "••••••••••••"

---

## Scene 3: Integrating the Search API (2:00-3:30)

**Visual**:

1. Code editor showing integration:

    ```typescript
    import { SearchClient } from "@repo/search-client";

    const client = new SearchClient({
    	apiKey: process.env.AACSEARCH_KEY,
    	projectId: "your-project",
    });

    // Each request is automatically tenant-filtered
    const results = await client.search("invoices", {
    	tenantId: session.orgId, // ← scoped to this org only
    	page: 1,
    	perPage: 20,
    });
    ```

2. Terminal: `pnpm add @repo/search-client`
3. Show search results returning only Acme Corp's invoices

**Narration**:

> "Integration is straightforward. Install the AACsearch client — `pnpm add @repo/search-client`. Initialize with your scoped key and project ID."
>
> "Every search call passes a `tenantId` parameter. AACsearch combines this with the scoped key's org filter — double-locked. Even if someone gets hold of the key and changes the tenantId, the scoped key's filter takes precedence."

**On-screen**: Security diagram: API Key (scoped: org=acme) + request (tenantId=acme) → AND combined → returns only Acme Corp data

---

## Scene 4: Search-as-a-Service Benefits for SaaS (3:30-4:30)

**Visual**: Comparison table on screen:

| Feature          | Self-hosted Typesense | AACsearch          |
| ---------------- | --------------------- | ------------------ |
| Multi-tenant     | Manual sharding       | Built-in           |
| Scoped API keys  | Custom proxy needed   | Native             |
| Connectors       | Setup yourself        | 10+ pre-built      |
| Analytics        | None                  | Dashboard built-in |
| Managed upgrades | You handle it         | Automatic          |
| SLA              | Your ops              | 99.9% uptime       |

**Narration**:

> "Let's compare. Self-hosting Typesense means manual multi-tenant sharding — one cluster per customer, or complex proxy layers. Scoped API keys? You'd need to build a proxy server just to add per-tenant filtering."
>
> "With AACsearch, every SaaS feature is built-in: tenant isolation, scoped keys, usage analytics, managed upgrades, and pre-built connectors. Your team builds features, not search infrastructure."

**On-screen**: "Focus on your product, not your search infrastructure"

---

## Scene 5: Usage Analytics & Billing (4:30-5:15)

**Visual**: Dashboard > Analytics:

- Per-tenant query volume: "Acme Corp: 45K queries this month", "Globex Inc: 12K queries"
- Rate limit alerts: "Acme Corp approaching 100 req/min limit"
- Search Quality: 94% click-through rate, 2.1% null-result rate
- Usage trends chart over 30 days

**Narration**:

> "AACsearch gives you per-tenant analytics out of the box. See who's using search the most, who's approaching rate limits, and whether any tenants are getting poor results."
>
> "Track query volume for billing — charge per search query or include it in tiered pricing. Set rate limits per API key to prevent noisy tenants from affecting performance."

---

## Scene 6: Going Live — The Complete Package (5:15-5:45)

**Visual**: Final dashboard overview showing:

- 3 tenants connected
- 50K+ documents indexed
- 99.9% uptime badge
- Last connector sync: "30 seconds ago"
- Widget preview on a live SaaS app page

**Narration**:

> "One project. One index. Multi-tenant isolation. Scoped API keys. Automatic sync. Built-in analytics. That's what AACsearch gives your SaaS."
>
> "Your customers get instant, relevant search. You get zero infrastructure to manage. And your team ships faster because search is already solved."

**On-screen**: CTA overlay: "Start for free at aacsearch.com — no credit card required"
