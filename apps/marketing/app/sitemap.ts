import { config as i18nConfig } from "@i18n/config";
import { getBaseUrl } from "@shared/lib/base-url";
import { getUniqueBasePaths } from "@shared/lib/content";
import { allLegalPages, allPosts } from "content-collections";
import type { MetadataRoute } from "next";

const baseUrl = getBaseUrl();
const locales = Object.keys(i18nConfig.locales);
const defaultLocale = i18nConfig.defaultLocale;

function localePath(locale: string, path: string): string {
	const prefix = locale === defaultLocale ? "" : `/${locale}`;
	return `${prefix}${path}`;
}

type ChangeFrequency = MetadataRoute.Sitemap[number]["changeFrequency"];

function getPagePriority(path: string): number {
	if (path === "") return 1.0;
	if (
		[
			"/features",
			"/pricing",
			"/integrations",
			"/connectors",
			"/use-cases",
			"/compare",
			"/blog",
		].includes(path)
	)
		return 0.9;
	if (
		path.startsWith("/features/") ||
		path.startsWith("/use-cases/") ||
		path.startsWith("/compare/") ||
		path.startsWith("/integrations/") ||
		path.startsWith("/solutions/")
	)
		return 0.8;
	if (["/about", "/enterprise", "/security", "/ai-search", "/developers"].includes(path))
		return 0.7;
	return 0.5;
}

function getChangeFrequency(path: string): ChangeFrequency {
	if (path === "") return "daily";
	if (path === "/blog" || path === "/changelog") return "daily";
	if (path === "/pricing" || path === "/pricing/plans") return "weekly";
	if (path.startsWith("/features/") || path.startsWith("/integrations/")) return "monthly";
	if (path.startsWith("/compare/")) return "monthly";
	return "monthly";
}

const staticMarketingPages = [
	"",
	"/blog",
	"/changelog",
	"/features",
	"/pricing",
	"/integrations",
	"/connectors",
	"/security",
	"/use-cases",
	"/enterprise",
	"/about",
	"/customers",
	"/roadmap",
	"/careers",
	"/partners",
	"/compare",
	"/developers",
	"/ai-search",
	"/contact",
	"/features/search-api",
	"/features/analytics",
	"/features/widget",
	"/features/knowledge",
	"/features/connectors",
	"/features/scoped-tokens",
	"/features/multi-search",
	"/features/reindex",
	"/features/rate-limiting",
	"/use-cases/ecommerce",
	"/use-cases/saas",
	"/use-cases/help-center",
	"/use-cases/developer-tools",
	"/use-cases/content-sites",
	"/integrations/prestashop",
	"/integrations/bitrix",
	"/integrations/rest-api",
	"/integrations/browser-sdk",
	"/integrations/mcp",
	"/compare/algolia",
	"/compare/elasticsearch",
	"/compare/meilisearch",
	"/solutions",
	"/solutions/retail",
	"/solutions/media",
	"/solutions/fintech",
	"/solutions/education",
	"/solutions/healthcare",
	"/solutions/gaming",
	"/features/geo-search",
	"/features/instant-search",
	"/features/faceted-search",
	"/features/typo-tolerance",
	"/features/synonyms",
	"/features/relevance-tuning",
	"/features/curations",
	"/features/stopwords",
	"/integrations/shopify",
	"/integrations/wordpress",
	"/integrations/woocommerce",
	"/integrations/strapi",
	"/integrations/contentful",
	"/integrations/sanity",
	"/integrations/next-js",
	"/integrations/react",
	"/compare/typesense",
	"/compare/opensearch",
	"/compare/solr",
	"/compare/weaviate",
	"/compare/pinecone",
	"/press",
	"/brand",
	"/resources",
	"/glossary",
	"/trust",
	"/newsletter",
	"/community",
	"/support",
	"/status",
	"/faq",
	"/affiliate",
	"/pricing/plans",
	"/all-pages",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const postPaths = getUniqueBasePaths(allPosts);
	const legalPaths = getUniqueBasePaths(allLegalPages);

	return [
		...staticMarketingPages.flatMap((page) =>
			locales.map((locale) => ({
				url: new URL(localePath(locale, page), baseUrl).href,
				lastModified: new Date(),
				changeFrequency: getChangeFrequency(page),
				priority: getPagePriority(page),
			})),
		),
		...postPaths.flatMap((path) =>
			locales.map((locale) => ({
				url: new URL(localePath(locale, `/blog/${path}`), baseUrl).href,
				lastModified: new Date(),
				changeFrequency: "monthly" as ChangeFrequency,
				priority: 0.7,
			})),
		),
		...legalPaths.flatMap((path) =>
			locales.map((locale) => ({
				url: new URL(localePath(locale, `/legal/${path}`), baseUrl).href,
				lastModified: new Date(),
				changeFrequency: "yearly" as ChangeFrequency,
				priority: 0.3,
			})),
		),
	];
}
