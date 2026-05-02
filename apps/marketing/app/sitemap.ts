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

const staticMarketingPages = [
	"",
	"/blog",
	"/changelog",
	"/features",
	"/pricing",
	"/integrations",
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
	"/features/self-host",
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
	"/open-source",
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
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const postPaths = getUniqueBasePaths(allPosts);
	const legalPaths = getUniqueBasePaths(allLegalPages);

	return [
		...staticMarketingPages.flatMap((page) =>
			locales.map((locale) => ({
				url: new URL(localePath(locale, page), baseUrl).href,
				lastModified: new Date(),
			})),
		),
		...postPaths.flatMap((path) =>
			locales.map((locale) => ({
				url: new URL(localePath(locale, `/blog/${path}`), baseUrl).href,
				lastModified: new Date(),
			})),
		),
		...legalPaths.flatMap((path) =>
			locales.map((locale) => ({
				url: new URL(localePath(locale, `/legal/${path}`), baseUrl).href,
				lastModified: new Date(),
			})),
		),
	];
}
