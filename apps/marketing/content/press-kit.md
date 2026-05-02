# AACsearch Press Kit

> For journalists, bloggers, analysts, and partners.
>
> **Website:** https://aacsearch.com
> **Contact:** press@aacsearch.com (to be set up)
> **Last updated:** May 2026

---

## Company Bio

### Short (1 paragraph, ~100 words)

AACsearch is a hosted search-as-a-service built on Typesense. We make it easy for developers to add lightning-fast search to any application — with pre-built connectors, built-in analytics, and zero-downtime reindexing. Open-core from day one, we offer both cloud-hosted and self-hosted deployment. Pricing starts at 10x less than comparable Algolia plans.

### Medium (2 paragraphs, ~200 words)

AACsearch provides managed search infrastructure powered by Typesense, an open-source search engine. Developers can deploy production-grade search in minutes — without managing servers, configuring Elasticsearch, or paying enterprise prices for hosted solutions.

AACsearch is open-core, offering both cloud-hosted and self-hosted deployment options. Key differentiators include zero-downtime reindexing (swap index versions without taking search offline), pre-built connectors for Next.js, React, PrestaShop, and Bitrix, built-in search analytics with query monitoring and click tracking, and multi-tenant isolation. Pricing starts at a free tier (10K searches/month) with Pro at $29/mo and Enterprise from $299/mo.

### Long (3 paragraphs, ~350 words)

AACsearch is a hosted search-as-a-service that eliminates the operational complexity of running search infrastructure. Built on Typesense — a fast, typo-tolerant open-source search engine — AACsearch provides a complete search platform including indexing pipelines, analytics, and pre-built UI components.

The platform was created to address a clear gap in the market: Algolia is powerful but prohibitively expensive at scale, Elasticsearch requires significant operational expertise, and Typesense itself, while excellent, still requires self-hosting and management. AACsearch bridges this gap by offering managed Typesense infrastructure with zero-downtime reindexing, tenant-isolated API keys, and pre-built connectors for popular frameworks.

AACsearch is open-core. The core search client, connectors, and widget are open-source; the SaaS layer (billing, team management, analytics dashboard) is proprietary. The company serves developers and teams who want production-grade search without the cost or complexity of alternatives. Pricing starts at a free tier with no credit card required, scaling to enterprise with self-hosted options and dedicated support.

---

## Key Features & Differentiators

| Feature                      | Detail                                                                              | Why It Matters                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Zero-downtime reindexing** | Build index v2 in a shadow collection while v1 serves traffic, then atomically swap | No search downtime during index updates — critical for e-commerce during sales |
| **Pre-built connectors**     | Next.js, React, PrestaShop, Bitrix + widget embed                                   | 5-minute integration, not 5-hour implementation                                |
| **Built-in analytics**       | Query volume, popular searches, click tracking, latency                             | Understand what users search for without extra tooling                         |
| **Tenant isolation**         | Every customer's data fully isolated at the search-engine level                     | Enterprise security by default, no noisy-neighbor problems                     |
| **i18n search UI**           | 5 languages out of the box (en, de, es, fr, ru)                                     | Ship multi-lingual search without additional development                       |
| **Auth integrations**        | Better Auth: email/password, magic links, OAuth, passkeys, SSO                      | Flexible authentication that fits any stack                                    |
| **Knowledge RAG**            | Semantic search on your documents using embeddings                                  | Go beyond keyword matching to understand user intent                           |
| **Open-core**                | Cloud-hosted or self-hosted                                                         | No vendor lock-in, full data sovereignty option                                |

---

## Pricing Overview

| Plan           | Price   | Searches | Features                                                          |
| -------------- | ------- | -------- | ----------------------------------------------------------------- |
| **Free**       | $0      | 10K/mo   | 1 collection, basic analytics, community support                  |
| **Pro**        | $29/mo  | 100K/mo  | 5 collections, full analytics, connectors, email support          |
| **Enterprise** | $299/mo | Custom   | Unlimited collections, self-hosted option, SLA, dedicated support |

_All plans include tenant isolation, zero-downtime reindexing, and i18n. No credit card required for Free tier._

---

## Logo Assets

Logo assets are **in progress** and need a designer. Requirements:

| Format      | Variants                                    | Use Cases                                     |
| ----------- | ------------------------------------------- | --------------------------------------------- |
| **SVG**     | Full color (dark bg + light bg), monochrome | Website, docs, press materials                |
| **PNG**     | 256x256, 512x512, 1024x1024 (dark + light)  | Social media, presentations, email signatures |
| **Favicon** | 16x16, 32x32, 48x48                         | Browser tabs, bookmarks                       |

**TODO:** Create logo assets using the existing icon.png as reference.

---

## Screenshots (needed)

All screenshots need to be captured from the live app at 1600x900 resolution:

| #   | Screen                 | What to Show                                              | Notes                              |
| --- | ---------------------- | --------------------------------------------------------- | ---------------------------------- |
| 1   | **Dashboard Overview** | Collections list, search stats widget, API key management | Show sidebar + main content        |
| 2   | **Search Results**     | Real-time search with faceted filters, highlighting       | Use a populated collection         |
| 3   | **Analytics**          | Query volume chart, popular searches, latency, CTR        | Data should show some history      |
| 4   | **Connectors**         | Integration options: Next.js, React, PrestaShop, Bitrix   | Show the setup instructions        |
| 5   | **Widget Preview**     | Embedded search widget on a demo site                     | Demo storefront with live search   |
| 6   | **Pricing Page**       | Plan comparison table                                     | Show Free / Pro / Enterprise tiers |

**TODO:** Capture from logged-in session, 1600x900 viewport, PNG format.

---

## Tech Stack

| Layer          | Technology                                     |
| -------------- | ---------------------------------------------- |
| Search Engine  | Typesense                                      |
| Frontend       | Next.js 16 + React 19 + TypeScript             |
| Backend API    | Hono + oRPC                                    |
| Database       | PostgreSQL + Prisma                            |
| Auth           | Better Auth (email, OAuth, passkeys, SSO, 2FA) |
| Analytics      | Built-in (Recharts + PostHog)                  |
| Infrastructure | Coolify (self-hosted) / Docker                 |
| i18n           | next-intl (5 locales)                          |
| Styling        | Tailwind CSS v4 + Shadcn UI                    |

---

## Founder Bio

**Alexandr Chibilyaev** — Founder & CEO, AACsearch

Alexandr is a product manager and engineer with experience building developer tools and SaaS platforms. He created AACsearch to solve a problem he personally experienced: hosted search was either too expensive (Algolia) or too complex (Elasticsearch), and open-source options lacked a managed service with the features modern apps need.

---

## Recent Milestones

- **May 2026:** Product Launch Campaign (Product Hunt + HN + blog)
- **April 2026:** Analytics pipeline with real-time query monitoring
- **March 2026:** Connectors for Next.js, React, PrestaShop, Bitrix
- **February 2026:** Knowledge RAG with semantic search
- **January 2026:** Zero-downtime reindexing

---

## Media Contact

**Email:** press@aacsearch.com _(to be set up)_
**Website:** https://aacsearch.com
**Docs:** https://aacsearch.com/docs
**GitHub:** https://github.com/AAChibilyaev/supastarter

---

## Press & Media FAQ

**What is AACsearch?**
A hosted search-as-a-service built on Typesense. Deploy search in minutes with pre-built connectors, analytics, and zero-downtime reindexing.

**Who is it for?**
Developers and teams building e-commerce stores, SaaS products, content sites, or any application that needs search.

**How is it different from Algolia?**
Built on open-source Typesense. Same developer experience at 10x lower cost. Open-core — you can self-host.

**How is it different from Elasticsearch?**
Managed service — no ops needed. Typesense outperforms ES on typo tolerance, faceted filtering, and speed at comparable scale.

**Is it open source?**
Open-core. Core search client, connectors, and widget are open source. SaaS layer is proprietary.

**Where is data hosted?**
US (cloud). EU regions and self-hosted enterprise options available.
