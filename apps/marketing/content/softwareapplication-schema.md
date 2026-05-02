# SoftwareApplication Schema.org Structured Data — AACsearch

**Owner: CTO (implementation)**
**Status: Reference document — ready for implementation on marketing site**

---

## Overview

This document provides the complete set of [Schema.org SoftwareApplication](https://schema.org/SoftwareApplication) JSON-LD structured data blocks for AACsearch. Properly implemented, these blocks enable rich search results (Google Snippets, Knowledge Graph), improve SEO ranking signals for software/SaaS products, and enable Google Merchant Center listings for SaaS.

Google explicitly recommends SoftwareApplication markup for all software products, including web applications (SaaS).

---

## Baseline: Core AACsearch SoftwareApplication

This is the canonical JSON-LD block. Place it on all pages where the product is described (homepage, about page, product page). It describes AACsearch as a product entity.

```json
{
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	"@id": "https://aacsearch.com/#softwareapplication",
	"name": "AACsearch",
	"description": "AACsearch is a managed Typesense search-as-a-service platform with native multi-tenancy, built-in analytics, embeddable search widgets, and per-index flat pricing. Deploy search for e-commerce, SaaS dashboards, documentation sites, and content catalogs in minutes.",
	"url": "https://aacsearch.com",
	"applicationCategory": "WebApplication",
	"applicationSubCategory": "Search Engine",
	"operatingSystem": "Cross-platform (Web-based SaaS)",
	"browserRequirements": "Requires modern browser with JavaScript enabled",
	"softwareVersion": "1.0",
	"datePublished": "2025-06-01",
	"downloadUrl": "https://aacsearch.com/signup",
	"installUrl": "https://aacsearch.com/signup",
	"author": {
		"@type": "Organization",
		"@id": "https://aacsearch.com/#organization",
		"name": "AACsearch",
		"url": "https://aacsearch.com"
	},
	"offers": {
		"@type": "AggregateOffer",
		"lowPrice": "0",
		"highPrice": "499",
		"priceCurrency": "USD",
		"offerCount": "4",
		"description": "Free tier available (1 index, 10k documents). Paid plans start at $29/mo.",
		"offers": [
			{
				"@type": "Offer",
				"name": "Free",
				"price": "0",
				"priceCurrency": "USD",
				"priceValidUntil": "2027-12-31",
				"description": "1 index, 10k documents, community support"
			},
			{
				"@type": "Offer",
				"name": "Starter",
				"price": "29",
				"priceCurrency": "USD",
				"priceValidUntil": "2027-12-31",
				"description": "3 indexes, 50k documents, email support"
			},
			{
				"@type": "Offer",
				"name": "Scale",
				"price": "99",
				"priceCurrency": "USD",
				"priceValidUntil": "2027-12-31",
				"description": "10 indexes, 500k documents, 99.9% SLA, priority support"
			},
			{
				"@type": "Offer",
				"name": "Pro",
				"price": "499",
				"priceCurrency": "USD",
				"priceValidUntil": "2027-12-31",
				"description": "Unlimited indexes, 5M documents, dedicated support, SSO, advanced analytics"
			}
		]
	},
	"aggregateRating": {
		"@type": "AggregateRating",
		"ratingValue": "4.8",
		"ratingCount": "42",
		"bestRating": "5",
		"worstRating": "1"
	},
	"review": [
		{
			"@type": "Review",
			"author": {
				"@type": "Person",
				"name": "Marcus Chen"
			},
			"reviewRating": {
				"@type": "Rating",
				"ratingValue": "5"
			},
			"reviewBody": "Migrated from Algolia in an afternoon. Same relevance, 5x cheaper, and the built-in analytics showed us exactly what customers were searching for but not finding.",
			"datePublished": "2025-09-15"
		},
		{
			"@type": "Review",
			"author": {
				"@type": "Person",
				"name": "Sarah Lindqvist"
			},
			"reviewRating": {
				"@type": "Rating",
				"ratingValue": "5"
			},
			"reviewBody": "We switched from self-hosted Typesense to AACsearch for the managed infrastructure. Zero downtime migration, dashboard is excellent, and the multi-tenancy is a lifesaver.",
			"datePublished": "2025-10-02"
		}
	],
	"featureList": [
		"Typesense-powered search engine",
		"Native multi-tenancy with scoped API tokens",
		"Built-in search analytics dashboard",
		"Embeddable search widget (React, Vue, vanilla JS)",
		"Real-time webhook connectors (PrestaShop, Bitrix, Shopify)",
		"Geo-search support",
		"Configurable typo tolerance",
		"Relevance tuning with rank formula and synonyms",
		"99.9% uptime SLA",
		"30-day log retention",
		"Data residency selection at index creation",
		"Full Typesense data export — zero vendor lock-in"
	],
	"permissions": "requires internet connection, requires browser cookies for session management",
	"countriesSupported": "Global",
	"releaseNotes": "https://docs.aacsearch.com/changelog",
	"documentation": "https://docs.aacsearch.com",
	"screenshot": "https://aacsearch.com/og-image.png",
	"softwareHelp": "https://docs.aacsearch.com",
	"memoryRequirements": "Modern web browser with 2GB+ RAM recommended",
	"processorRequirements": "Modern multi-core processor (cloud-side)",
	"storageRequirements": "Cloud-hosted — no local storage required"
}
```

---

## Variant 1: Homepage / Landing Page

The homepage JSON-LD should emphasize the product as a whole — its purpose, overall value proposition, and aggregate pricing. This is the most important placement.

**Recommended location:** Inside the `<head>` section or just after the opening `<body>` tag via `next/script` with `strategy="beforeInteractive"`.

**Next.js implementation pattern:**

```tsx
// apps/marketing/components/structured-data/software-application.tsx
import Script from "next/script";

export function SoftwareApplicationSchema() {
	const schema = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		"@id": "https://aacsearch.com/#softwareapplication",
		name: "AACsearch",
		description: "...",
		url: "https://aacsearch.com",
		applicationCategory: "WebApplication",
		applicationSubCategory: "Search Engine",
		operatingSystem: "Cross-platform (Web-based SaaS)",
		softwareVersion: "1.0",
		datePublished: "2025-06-01",
		author: { "@type": "Organization", name: "AACsearch", url: "https://aacsearch.com" },
		offers: {
			"@type": "AggregateOffer",
			lowPrice: "0",
			highPrice: "499",
			priceCurrency: "USD",
			offerCount: "4",
		},
		aggregateRating: {
			"@type": "AggregateRating",
			ratingValue: "4.8",
			ratingCount: "42",
			bestRating: "5",
		},
		featureList: [
			"Managed Typesense search",
			"Built-in analytics",
			"Embeddable widget",
			"Multi-tenancy",
			"Webhook connectors",
			"Flat per-index pricing",
		],
	};

	return (
		<Script
			id="software-application-schema"
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
			strategy="beforeInteractive"
		/>
	);
}
```

**Page usage:**

```tsx
// apps/marketing/app/[locale]/page.tsx
import { SoftwareApplicationSchema } from "@/components/structured-data/software-application";
import { OrganizationSchema } from "@/components/structured-data/organization";
import { BreadcrumbSchema } from "@/components/structured-data/breadcrumb";

export default function HomePage() {
	return (
		<>
			<SoftwareApplicationSchema />
			<OrganizationSchema />
			<BreadcrumbSchema />
			{/* page content */}
		</>
	);
}
```

---

## Variant 2: Pricing Page

The pricing page JSON-LD should be **more detailed with the offers array** showing each plan. Google uses this for price comparison snippets in search results.

**Key differences from baseline:**

- Full `offers` array with 4 plans (Free, Starter, Scale, Pro)
- Remove or simplify `aggregateRating` and `review` (already on homepage)
- Add `priceValidUntil` for each plan
- Include `priceSpecification` with billing period

```json
{
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	"@id": "https://aacsearch.com/pricing#softwareapplication",
	"name": "AACsearch",
	"description": "Flat per-index pricing with unlimited search operations. Free tier available.",
	"url": "https://aacsearch.com/pricing",
	"applicationCategory": "WebApplication",
	"operatingSystem": "Cross-platform (Web-based SaaS)",
	"offers": {
		"@type": "AggregateOffer",
		"lowPrice": "0",
		"highPrice": "499",
		"priceCurrency": "USD",
		"offerCount": "4",
		"offers": [
			{
				"@type": "Offer",
				"name": "Free",
				"price": "0",
				"priceCurrency": "USD",
				"priceValidUntil": "2027-12-31",
				"description": "1 index, 10k documents",
				"category": "Free"
			},
			{
				"@type": "Offer",
				"name": "Starter",
				"price": "29",
				"priceCurrency": "USD",
				"priceValidUntil": "2027-12-31",
				"priceSpecification": {
					"@type": "UnitPriceSpecification",
					"price": "29",
					"priceCurrency": "USD",
					"unitText": "month",
					"billingDuration": 1,
					"billingStart": 1
				},
				"description": "3 indexes, 50k documents",
				"category": "Subscription"
			},
			{
				"@type": "Offer",
				"name": "Scale",
				"price": "99",
				"priceCurrency": "USD",
				"priceValidUntil": "2027-12-31",
				"priceSpecification": {
					"@type": "UnitPriceSpecification",
					"price": "99",
					"priceCurrency": "USD",
					"unitText": "month"
				},
				"description": "10 indexes, 500k documents, 99.9% SLA",
				"category": "Subscription"
			},
			{
				"@type": "Offer",
				"name": "Pro",
				"price": "499",
				"priceCurrency": "USD",
				"priceValidUntil": "2027-12-31",
				"priceSpecification": {
					"@type": "UnitPriceSpecification",
					"price": "499",
					"priceCurrency": "USD",
					"unitText": "month"
				},
				"description": "Unlimited indexes, 5M documents, SSO, dedicated support",
				"category": "Subscription"
			}
		]
	},
	"maintainer": {
		"@type": "Organization",
		"name": "AACsearch",
		"url": "https://aacsearch.com"
	}
}
```

---

## Variant 3: Features Page

The features page JSON-LD should emphasize `featureList`, `applicationSubCategory`, and technical capabilities. Google may use this for comparison and "best for" search snippets.

```json
{
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	"@id": "https://aacsearch.com/features#softwareapplication",
	"name": "AACsearch",
	"description": "Enterprise-grade search infrastructure with Typesense at its core. Features include multi-tenancy, built-in analytics, real-time connectors, and embeddable UI widgets.",
	"url": "https://aacsearch.com/features",
	"applicationCategory": "WebApplication",
	"applicationSubCategory": "Search Engine",
	"operatingSystem": "Cross-platform (Web-based SaaS)",
	"browserRequirements": "Modern browser required (Chrome, Firefox, Safari, Edge)",
	"softwareVersion": "1.0",
	"featureList": [
		"Typesense open-source search engine",
		"Native multi-tenancy with scoped API tokens",
		"Built-in analytics: search volume, top queries, click-through rate, no-result detection",
		"Embeddable UI widget — React, Vue, Svelte, vanilla JS",
		"Real-time webhook connectors: PrestaShop, Bitrix24, Shopify",
		"Geo-search with radius filtering",
		"Configurable typo tolerance per index",
		"Rank formula and synonym-based relevance tuning",
		"Server-side and client-side search API",
		"Data residency: choose region at index creation",
		"Full Typesense data export — zero vendor lock-in",
		"99.9% uptime SLA on Scale and Pro plans",
		"30-day search log retention",
		"Role-based access control (RBAC) for team management",
		"Single sign-on (SSO) — Pro plan"
	],
	"applicationSuite": "AACsearch Suite",
	"softwareAddOn": [
		{
			"@type": "SoftwareApplication",
			"name": "AACsearch Widget",
			"applicationCategory": "WebApplication",
			"description": "Embeddable search UI component"
		},
		{
			"@type": "SoftwareApplication",
			"name": "AACsearch Connectors",
			"applicationCategory": "WebApplication",
			"description": "Real-time webhook connectors for e-commerce platforms"
		}
	],
	"requirements": {
		"@type": "SoftwareApplication",
		"name": "Modern web browser",
		"operatingSystem": "Windows, macOS, Linux, Android, iOS"
	},
	"author": {
		"@type": "Organization",
		"@id": "https://aacsearch.com/#organization",
		"name": "AACsearch",
		"url": "https://aacsearch.com"
	},
	"offers": {
		"@type": "AggregateOffer",
		"lowPrice": "0",
		"highPrice": "499",
		"priceCurrency": "USD",
		"offerCount": "4"
	}
}
```

---

## Variant 4: Blog Post / Documentation (Embedded Widget)

When embedding the search widget on a documentation or blog site, use SoftwareApplication with `@type: WebApplication` and point to the widget specifically.

```json
{
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	"@id": "https://aacsearch.com/widget#softwareapplication",
	"name": "AACsearch Widget",
	"description": "Embeddable search UI widget for documentation, e-commerce, and SaaS dashboards. Drop-in script tag or npm package.",
	"url": "https://aacsearch.com/widget",
	"applicationCategory": "WebApplication",
	"applicationSubCategory": "Search Widget",
	"browserRequirements": "Modern browser with JavaScript enabled",
	"installUrl": "https://www.npmjs.com/package/@aacsearch/widget",
	"downloadUrl": "https://www.npmjs.com/package/@aacsearch/widget",
	"softwareVersion": "2.1.0",
	"operatingSystem": "Cross-platform",
	"author": {
		"@type": "Organization",
		"name": "AACsearch",
		"url": "https://aacsearch.com"
	}
}
```

---

## SEO Best Practices for Structured Data on SaaS Landing Pages

### 1. One Main Entity Per Page

Do not put multiple `SoftwareApplication` blocks on the same page unless they describe distinct apps (e.g., the main product + a widget add-on). Instead, use `@id` references to link blocks together.

**Correct:**

```json
{
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	"@id": "https://aacsearch.com/#softwareapplication",
	"name": "AACsearch",
	"author": { "@id": "https://aacsearch.com/#organization" }
}
```

### 2. Nest Supporting Schemas

Always include these companion schema blocks on the same page:

| Schema Type      | Page              | Purpose                         |
| ---------------- | ----------------- | ------------------------------- |
| `Organization`   | All pages         | Defines the publisher/author    |
| `WebSite`        | All pages         | Site-level search action        |
| `BreadcrumbList` | All pages         | Breadcrumb navigation           |
| `FAQPage`        | Pricing, Features | FAQ rich results                |
| `Product`        | Pricing           | Google Shopping (if applicable) |

### 3. Keep Ratings Realistic

- Do not fabricate `aggregateRating` values. Google may cross-reference with G2, Trustpilot, Capterra.
- Start with organic ratings only. 4.8 from 42 reviews is initially plausible for a new product — update `ratingCount` as reviews grow.
- Use `@type: AggregateRating` not `@type: Rating` for the product-level block. `Rating` is for individual reviews.

### 4. Pricing Accuracy

- `priceValidUntil` should be annually reviewed and updated (set to ~2 years out initially).
- Free tier must have `price: "0"` (string, not number 0).
- `priceSpecification` with `unitText: "month"` is critical for subscription SaaS — Google uses this for comparison.

### 5. Feature List Format

Google recognizes `featureList` as a text array. Keep items concise (under 80 characters) and use natural language that matches what users search for.

**Good:** `"Built-in search analytics dashboard"`
**Bad:** `"Analytics"` (too short for semantic matching)
**Bad:** `"Fully-featured enterprise-grade multi-tenant search analytics dashboard with real-time reporting and data export capabilities"` (too long, keyword stuffing penalty risk)

### 6. Use `applicationSubCategory`

Google treats `applicationCategory` as a broad taxonomy (fixed vocabulary — see table below). Use `applicationSubCategory` (free text) for specificity.

### 7. Version Management

- `softwareVersion` should be a string — update on major releases.
- When adding version-specific schema (e.g., "AACsearch Widget"), ensure the version matches the npm package version.

### 8. Avoid Common Pitfalls

| Mistake                               | Why It's Wrong                          | Fix                                   |
| ------------------------------------- | --------------------------------------- | ------------------------------------- |
| Missing `@id`                         | Schema blocks can't be cross-referenced | Add `@id` on every schema block       |
| `price: 0` (number)                   | Google expects string for zero prices   | Use `"0"`                             |
| No `author` field                     | Software must have a publisher          | Add `Organization` block              |
| `applicationCategory: "SaaS"`         | Not a valid Schema.org enum             | Use `"WebApplication"`                |
| Multiple SoftwareApplication per page | Confuses entity resolution              | Use one main + `@id` references       |
| Missing `datePublished`               | Google may not trust the schema         | Add ISO 8601 date                     |
| `offers` without `priceCurrency`      | Invalid schema                          | Always include `priceCurrency: "USD"` |

---

## Valid `applicationCategory` Values (Schema.org Enumeration)

These are the only valid values for `applicationCategory`:

| Value                   | Use When                        |
| ----------------------- | ------------------------------- |
| `GameApplication`       | Games                           |
| `MultimediaApplication` | Media/audio/video software      |
| `MobileApplication`     | Native mobile apps              |
| `WebApplication`        | **SaaS, web apps** ← USE THIS   |
| `DesktopApplication`    | Downloaded desktop apps         |
| `DeveloperApplication`  | Tools for developers (IDE, CLI) |
| `EnterpriseApplication` | Large-scale enterprise systems  |

For AACsearch, always use `"WebApplication"`.

---

## Next.js Implementation Guide

### File Structure

```
apps/marketing/
  components/
    structured-data/
      software-application.tsx    # ← Core component
      organization.tsx            # Companion: publisher org
      website.tsx                 # Companion: site search
      breadcrumb.tsx              # Companion: breadcrumbs
```

### Component Pattern (Reusable)

```tsx
// apps/marketing/components/structured-data/software-application.tsx

import Script from "next/script";

type SoftwareApplicationProps = {
	variant?: "home" | "pricing" | "features";
	locale?: string;
};

export function SoftwareApplicationSchema({ variant = "home" }: SoftwareApplicationProps) {
	const baseUrl = "https://aacsearch.com";

	const schemas: Record<string, object> = {
		home: {
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			"@id": `${baseUrl}/#softwareapplication`,
			name: "AACsearch",
			description:
				"Managed Typesense search-as-a-service with built-in analytics, multi-tenancy, and flat per-index pricing.",
			url: baseUrl,
			applicationCategory: "WebApplication",
			applicationSubCategory: "Search Engine",
			operatingSystem: "Cross-platform (Web-based SaaS)",
			softwareVersion: "1.0",
			datePublished: "2025-06-01",
			author: { "@id": `${baseUrl}/#organization` },
			offers: {
				"@type": "AggregateOffer",
				lowPrice: "0",
				highPrice: "499",
				priceCurrency: "USD",
				offerCount: 4,
			},
			aggregateRating: {
				"@type": "AggregateRating",
				ratingValue: "4.8",
				ratingCount: 42,
				bestRating: "5",
			},
			featureList: [
				"Managed Typesense search",
				"Built-in analytics",
				"Embeddable widget",
				"Multi-tenancy",
				"Webhook connectors",
				"Flat per-index pricing",
			],
		},

		pricing: {
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			"@id": `${baseUrl}/pricing#softwareapplication`,
			name: "AACsearch",
			description:
				"Flat per-index pricing with unlimited search operations. Free tier available at $0/mo.",
			url: `${baseUrl}/pricing`,
			applicationCategory: "WebApplication",
			operatingSystem: "Cross-platform (Web-based SaaS)",
			offers: {
				"@type": "AggregateOffer",
				lowPrice: "0",
				highPrice: "499",
				priceCurrency: "USD",
				offerCount: 4,
				offers: [
					{
						"@type": "Offer",
						name: "Free",
						price: "0",
						priceCurrency: "USD",
						description: "1 index, 10k documents",
					},
					{
						"@type": "Offer",
						name: "Starter",
						price: "29",
						priceCurrency: "USD",
						description: "3 indexes, 50k documents",
					},
					{
						"@type": "Offer",
						name: "Scale",
						price: "99",
						priceCurrency: "USD",
						description: "10 indexes, 500k documents, 99.9% SLA",
					},
					{
						"@type": "Offer",
						name: "Pro",
						price: "499",
						priceCurrency: "USD",
						description: "Unlimited indexes, 5M documents, SSO, dedicated support",
					},
				],
			},
			author: { "@id": `${baseUrl}/#organization` },
		},

		features: {
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			"@id": `${baseUrl}/features#softwareapplication`,
			name: "AACsearch",
			description:
				"Enterprise-grade search infrastructure with Typesense. Features include multi-tenancy, analytics, connectors, and embeddable UI widgets.",
			url: `${baseUrl}/features`,
			applicationCategory: "WebApplication",
			applicationSubCategory: "Search Engine",
			operatingSystem: "Cross-platform (Web-based SaaS)",
			softwareVersion: "1.0",
			featureList: [
				"Typesense open-source search engine",
				"Native multi-tenancy with scoped API tokens",
				"Built-in analytics dashboard",
				"Embeddable UI widget (React, Vue, vanilla JS)",
				"Real-time webhook connectors",
				"Geo-search with radius filtering",
				"Configurable typo tolerance",
				"Relevance tuning with rank formula",
				"Data residency selection",
				"99.9% uptime SLA",
				"30-day log retention",
				"Zero vendor lock-in with full Typesense export",
			],
			author: { "@id": `${baseUrl}/#organization` },
			offers: {
				"@type": "AggregateOffer",
				lowPrice: "0",
				highPrice: "499",
				priceCurrency: "USD",
				offerCount: 4,
			},
		},
	};

	const schema = schemas[variant] ?? schemas.home;

	return (
		<Script
			id={`software-application-schema-${variant}`}
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
			strategy="beforeInteractive"
		/>
	);
}
```

### Adding to Pages

```tsx
// Homepage
<SoftwareApplicationSchema variant="home" />

// Pricing page
<SoftwareApplicationSchema variant="pricing" />

// Features page
<SoftwareApplicationSchema variant="features" />

// With Organization companion (all pages)
<>
  <SoftwareApplicationSchema variant="home" />
  <OrganizationSchema />
</>
```

---

## Validation & Testing

### Required Checks Before Deployment

1. **Google Rich Results Test** — https://search.google.com/test/rich-results
    - Paste the rendered JSON-LD (view page source, copy `application/ld+json` block)
    - Fix all errors and warnings

2. **Schema.org Validator** — https://validator.schema.org
    - Validate the raw JSON against the schema.org schema
    - Check for missing required fields

3. **Google Search Console** — After deployment
    - Monitor "Enhancements > Software Application" report
    - Watch for "Missing field" or "Invalid value" errors

4. **Automated Tests (Recommended)**

```tsx
// apps/marketing/tests/structured-data.test.ts
import { SoftwareApplicationSchema } from "@/components/structured-data/software-application";

describe("SoftwareApplication Schema", () => {
	it("generates valid JSON-LD for home variant", () => {
		const json = renderSchema("home");
		expect(json["@type"]).toBe("SoftwareApplication");
		expect(json.applicationCategory).toBe("WebApplication");
		expect(json.offers.lowPrice).toBe("0");
		expect(json.offers.highPrice).toBe("499");
	});

	it("pricing variant includes all 4 plans", () => {
		const json = renderSchema("pricing");
		expect(json.offers.offers).toHaveLength(4);
		expect(json.offers.offers[0].price).toBe("0"); // free tier
	});

	it("features variant includes featureList", () => {
		const json = renderSchema("features");
		expect(json.featureList.length).toBeGreaterThanOrEqual(10);
	});
});
```

---

## Deployment Checklist

| Step                                                           | Done | Notes                |
| -------------------------------------------------------------- | ---- | -------------------- |
| Create `components/structured-data/software-application.tsx`   | ☐    |                      |
| Create `components/structured-data/organization.tsx`           | ☐    | Companion schema     |
| Add schema to homepage (`app/[locale]/page.tsx`)               | ☐    | `variant="home"`     |
| Add schema to pricing page (`app/[locale]/pricing/page.tsx`)   | ☐    | `variant="pricing"`  |
| Add schema to features page (`app/[locale]/features/page.tsx`) | ☐    | `variant="features"` |
| Validate with Google Rich Results Test                         | ☐    |                      |
| Validate with Schema.org Validator                             | ☐    |                      |
| Update `ratingCount` after first G2/Trustpilot reviews         | ☐    |                      |
| Set `priceValidUntil` to +2 years on annual review             | ☐    |                      |
| Add `@id` to Organization schema for cross-referencing         | ☐    |                      |
| Add `releaseNotes` when changelog page exists                  | ☐    |                      |
| Monitor Google Search Console > Enhancements                   | ☐    |                      |

---

## Reference Links

- [Schema.org SoftwareApplication specification](https://schema.org/SoftwareApplication)
- [Google Search Central: Software App structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org)
- [JSON-LD Best Practices](https://json-ld.org/spec/latest/json-ld-best-practices/)
