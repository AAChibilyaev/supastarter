import type { ReactElement } from "react";

import { SITE_CONFIG, PRICING, RATINGS } from "../config";
import { jsonLd } from "../json-ld";

type Locale = string;

interface SoftwareApplicationSchemaProps {
	/** Page-specific @id suffix, e.g. "/pricing#softwareapplication" */
	id?: string;
	/** Page-specific description override */
	description?: string;
	/** Show full offers array (pricing page) or aggregate only (homepage) */
	variant?: "home" | "pricing" | "features";
	/** Locale for localized description text */
	locale?: Locale;
}

const featureList = [
	"Typesense-powered search engine",
	"Native multi-tenancy with scoped API tokens",
	"Built-in search analytics dashboard",
	"Embeddable search widget (React, Vue, vanilla JS)",
	"Real-time webhook connectors (PrestaShop, Bitrix, Shopify)",
	"Geo-search support",
	"Configurable typo tolerance",
	"Relevance tuning with rank formula and synonyms",
	"99.9% uptime SLA",
	"Full Typesense data export — zero vendor lock-in",
];

/**
 * SoftwareApplication schema.org JSON-LD.
 * Use on homepage, pricing, features, and comparison pages.
 */
export function SoftwareApplicationSchema({
	id = "/#softwareapplication",
	description,
	variant = "home",
	locale = "en",
}: SoftwareApplicationSchemaProps): ReactElement {
	const localeKey =
		locale in SITE_CONFIG.description ? (locale as keyof typeof SITE_CONFIG.description) : "en";
	const base = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		"@id": `${SITE_CONFIG.url}${id}`,
		name: SITE_CONFIG.name,
		url: SITE_CONFIG.url,
		description: description ?? SITE_CONFIG.description[localeKey],
		applicationCategory: SITE_CONFIG.applicationCategory,
		applicationSubCategory: SITE_CONFIG.applicationSubCategory,
		operatingSystem: SITE_CONFIG.operatingSystem,
		softwareVersion: SITE_CONFIG.softwareVersion,
		datePublished: SITE_CONFIG.datePublished,
		author: {
			"@type": "Organization",
			"@id": `${SITE_CONFIG.url}/#organization`,
			name: SITE_CONFIG.name,
			url: SITE_CONFIG.url,
		},
		offers: {
			"@type": "AggregateOffer",
			lowPrice: PRICING.plans[0].price,
			highPrice: PRICING.plans[PRICING.plans.length - 1].price,
			priceCurrency: PRICING.currency,
			offerCount: PRICING.plans.length.toString(),
		},
		aggregateRating: {
			"@type": "AggregateRating",
			ratingValue: RATINGS.ratingValue,
			ratingCount: RATINGS.ratingCount,
			bestRating: RATINGS.bestRating,
		},
		featureList,
	};

	if (variant === "pricing") {
		base.offers = {
			...base.offers,
			description: "Flat per-index pricing with unlimited search operations. Free tier available.",
			offers: PRICING.plans.map((plan) => ({
				"@type": "Offer",
				name: plan.name,
				price: plan.price,
				priceCurrency: PRICING.currency,
				priceValidUntil: PRICING.priceValidUntil,
				description: plan.description,
				category: plan.name === "Free" ? "Free" : "Subscription",
			})),
		} as typeof base.offers & { description: string; offers: unknown[] };
	}

	if (variant === "features") {
		base.featureList = [
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
			"Role-based access control (RBAC) for team management",
			"Single sign-on (SSO) — Pro plan",
		];
	}

	return jsonLd("software-application-schema", base);
}
