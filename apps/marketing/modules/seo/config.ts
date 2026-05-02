/**
 * SEO schema configuration constants.
 * Centralized values used across all schema.org JSON-LD components.
 */

export const SITE_CONFIG = {
	name: "AACsearch",
	url: "https://aacsearch.com",
	description: {
		en: "AACsearch is a managed Typesense search-as-a-service platform with native multi-tenancy, built-in analytics, embeddable search widgets, and per-index flat pricing.",
		de: "AACsearch ist eine verwaltete Typesense Search-as-a-Service-Plattform mit nativer Multi-Tenancy, integrierter Analyse, einbettbaren Such-Widgets und flachen Preisen pro Index.",
		es: "AACsearch es una plataforma de búsqueda como servicio gestionada con Typesense, con multi-tenencia nativa, análisis integrados, widgets de búsqueda integrables y precios planos por índice.",
		fr: "AACsearch est une plateforme de recherche en tant que service gérée basée sur Typesense, avec multi-tenance native, analyses intégrées, widgets de recherche intégrables et tarification forfaitaire par index.",
		ru: "AACsearch — управляемая платформа поиска как услуги на базе Typesense с нативной мультиарендностью, встроенной аналитикой, встраиваемыми виджетами поиска и фиксированной ценой за индекс.",
	},
	softwareVersion: "1.0",
	datePublished: "2025-06-01",
	applicationCategory: "WebApplication" as const,
	applicationSubCategory: "Search Engine",
	operatingSystem: "Cross-platform (Web-based SaaS)",
	browserRequirements: "Requires modern browser with JavaScript enabled",
} as const;

export const PRICING = {
	plans: [
		{ name: "Free", price: "0", description: "1 index, 10k documents" },
		{ name: "Starter", price: "29", description: "3 indexes, 50k documents" },
		{ name: "Scale", price: "99", description: "10 indexes, 500k documents, 99.9% SLA" },
		{
			name: "Pro",
			price: "499",
			description: "Unlimited indexes, 5M documents, SSO, dedicated support",
		},
	],
	currency: "USD",
	priceValidUntil: "2027-12-31",
} as const;

export const RATINGS = {
	ratingValue: "4.8",
	ratingCount: "42",
	bestRating: "5",
} as const;
