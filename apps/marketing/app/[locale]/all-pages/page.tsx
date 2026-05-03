import { config } from "@config";
import { CtaFooter } from "@home/components/CtaFooter";
import { LocaleLink } from "@i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

type PageLink = { label: string; href: string; pattern?: boolean };
type Section = { key: string; pages: PageLink[] };

const marketingSections: Section[] = [
	{
		key: "core",
		pages: [
			{ label: "Home", href: "/" },
			{ label: "Blog", href: "/blog" },
			{ label: "Changelog", href: "/changelog" },
			{ label: "Pricing", href: "/pricing" },
			{ label: "Pricing Plans", href: "/pricing/plans" },
			{ label: "Contact", href: "/contact" },
			{ label: "Security", href: "/security" },
			{ label: "Enterprise", href: "/enterprise" },
			{ label: "AI Search", href: "/ai-search" },
			{ label: "Developers", href: "/developers" },
			{ label: "FAQ", href: "/faq" },
			{ label: "Status", href: "/status" },
		],
	},
	{
		key: "features",
		pages: [
			{ label: "Features", href: "/features" },
			{ label: "Search API", href: "/features/search-api" },
			{ label: "Analytics", href: "/features/analytics" },
			{ label: "Widget", href: "/features/widget" },
			{ label: "Knowledge", href: "/features/knowledge" },
			{ label: "Connectors", href: "/features/connectors" },
			{ label: "Scoped Tokens", href: "/features/scoped-tokens" },
			{ label: "Multi-Search", href: "/features/multi-search" },
			{ label: "Reindex", href: "/features/reindex" },
			{ label: "Rate Limiting", href: "/features/rate-limiting" },
			{ label: "Geo Search", href: "/features/geo-search" },
			{ label: "Instant Search", href: "/features/instant-search" },
			{ label: "Faceted Search", href: "/features/faceted-search" },
			{ label: "Typo Tolerance", href: "/features/typo-tolerance" },
			{ label: "Synonyms", href: "/features/synonyms" },
			{ label: "Relevance Tuning", href: "/features/relevance-tuning" },
			{ label: "Curations", href: "/features/curations" },
			{ label: "Stopwords", href: "/features/stopwords" },
		],
	},
	{
		key: "useCases",
		pages: [
			{ label: "Use Cases", href: "/use-cases" },
			{ label: "E-commerce", href: "/use-cases/ecommerce" },
			{ label: "SaaS", href: "/use-cases/saas" },
			{ label: "Help Center", href: "/use-cases/help-center" },
			{ label: "Developer Tools", href: "/use-cases/developer-tools" },
			{ label: "Content Sites", href: "/use-cases/content-sites" },
		],
	},
	{
		key: "integrations",
		pages: [
			{ label: "Integrations", href: "/integrations" },
			{ label: "PrestaShop", href: "/integrations/prestashop" },
			{ label: "Bitrix", href: "/integrations/bitrix" },
			{ label: "Shopify", href: "/integrations/shopify" },
			{ label: "WordPress", href: "/integrations/wordpress" },
			{ label: "WooCommerce", href: "/integrations/woocommerce" },
			{ label: "Strapi", href: "/integrations/strapi" },
			{ label: "Contentful", href: "/integrations/contentful" },
			{ label: "Sanity", href: "/integrations/sanity" },
			{ label: "Next.js", href: "/integrations/next-js" },
			{ label: "React", href: "/integrations/react" },
			{ label: "REST API", href: "/integrations/rest-api" },
			{ label: "Browser SDK", href: "/integrations/browser-sdk" },
			{ label: "MCP", href: "/integrations/mcp" },
		],
	},
	{
		key: "compare",
		pages: [
			{ label: "Compare", href: "/compare" },
			{ label: "vs Algolia", href: "/compare/algolia" },
			{ label: "vs Elasticsearch", href: "/compare/elasticsearch" },
			{ label: "vs Meilisearch", href: "/compare/meilisearch" },
			{ label: "vs Typesense", href: "/compare/typesense" },
			{ label: "vs OpenSearch", href: "/compare/opensearch" },
			{ label: "vs Solr", href: "/compare/solr" },
			{ label: "vs Weaviate", href: "/compare/weaviate" },
			{ label: "vs Pinecone", href: "/compare/pinecone" },
		],
	},
	{
		key: "solutions",
		pages: [
			{ label: "Solutions", href: "/solutions" },
			{ label: "Retail", href: "/solutions/retail" },
			{ label: "Media", href: "/solutions/media" },
			{ label: "Fintech", href: "/solutions/fintech" },
			{ label: "Education", href: "/solutions/education" },
			{ label: "Healthcare", href: "/solutions/healthcare" },
			{ label: "Gaming", href: "/solutions/gaming" },
		],
	},
	{
		key: "company",
		pages: [
			{ label: "About", href: "/about" },
			{ label: "Customers", href: "/customers" },
			{ label: "Roadmap", href: "/roadmap" },
			{ label: "Careers", href: "/careers" },
			{ label: "Partners", href: "/partners" },
			{ label: "Press", href: "/press" },
			{ label: "Brand", href: "/brand" },
			{ label: "Resources", href: "/resources" },
			{ label: "Glossary", href: "/glossary" },
			{ label: "Trust", href: "/trust" },
			{ label: "Newsletter", href: "/newsletter" },
			{ label: "Community", href: "/community" },
			{ label: "Support", href: "/support" },
			{ label: "Affiliate", href: "/affiliate" },
		],
	},
];

const saasAuthPages: PageLink[] = [
	{ label: "Login", href: "/login" },
	{ label: "Signup", href: "/signup" },
	{ label: "Forgot Password", href: "/forgot-password" },
	{ label: "Reset Password", href: "/reset-password" },
	{ label: "Verify Email", href: "/verify" },
];

const saasAccountPages: PageLink[] = [
	{ label: "Dashboard", href: "/" },
	{ label: "Knowledge", href: "/knowledge" },
	{ label: "Chatbot", href: "/chatbot" },
	{ label: "Account Settings", href: "/settings/general" },
	{ label: "Security Settings", href: "/settings/security" },
	{ label: "Notifications", href: "/settings/notifications" },
	{ label: "Billing", href: "/settings/billing" },
	{ label: "AI Credits", href: "/settings/billing/ai-credits" },
];

const saasOrgPages: PageLink[] = [
	{ label: "Overview", href: "/:orgSlug/overview", pattern: true },
	{ label: "Getting Started", href: "/:orgSlug/getting-started", pattern: true },
	{ label: "Search Dashboard", href: "/:orgSlug/search", pattern: true },
	{ label: "Search Index", href: "/:orgSlug/search/:indexSlug", pattern: true },
	{ label: "Analytics", href: "/:orgSlug/analytics", pattern: true },
	{ label: "API Keys", href: "/:orgSlug/api-keys", pattern: true },
	{ label: "Import Jobs", href: "/:orgSlug/import-jobs", pattern: true },
	{ label: "Preview", href: "/:orgSlug/preview", pattern: true },
	{ label: "Relevance", href: "/:orgSlug/relevance", pattern: true },
	{ label: "Connectors", href: "/:orgSlug/connectors", pattern: true },
	{ label: "Knowledge", href: "/:orgSlug/knowledge", pattern: true },
	{ label: "Org Settings", href: "/:orgSlug/settings/general", pattern: true },
	{ label: "Members", href: "/:orgSlug/settings/members", pattern: true },
	{ label: "Org Billing", href: "/:orgSlug/settings/billing", pattern: true },
];

const saasAdminPages: PageLink[] = [
	{ label: "Admin Dashboard", href: "/admin" },
	{ label: "Organizations", href: "/admin/organizations" },
	{ label: "Users", href: "/admin/users" },
	{ label: "Config", href: "/admin/config" },
	{ label: "Security", href: "/admin/security" },
	{ label: "Integrations", href: "/admin/integrations" },
	{ label: "Audit Log", href: "/admin/audit" },
	{ label: "Jobs", href: "/admin/jobs" },
	{ label: "Notifications", href: "/admin/notifications" },
	{ label: "Wallet", href: "/admin/wallet" },
];

const saasMiscPages: PageLink[] = [
	{ label: "New Organization", href: "/new-organization" },
	{ label: "Onboarding", href: "/onboarding" },
	{ label: "Choose Plan", href: "/choose-plan" },
	{ label: "Organization Invitation", href: "/organization-invitation/:id", pattern: true },
	{ label: "Checkout Return", href: "/checkout-return" },
];

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "allPagesPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function AllPagesPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "allPagesPage" });
	const saasBase = config.saasUrl ?? "";

	return (
		<>
			<section className="section-padding border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>

			<section className="py-16 border-b border-border/60">
				<div className="container">
					<h2 className="text-2xl font-semibold mb-8">{t("marketingTitle")}</h2>
					<div className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 grid grid-cols-1">
						{marketingSections.map((section) => (
							<Card key={section.key}>
								<CardHeader className="pb-3">
									<CardTitle className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
										{t(`sections.${section.key}`)}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<ul className="space-y-1.5">
										{section.pages.map((page) => (
											<li key={page.href}>
												<LocaleLink
													href={
														page.href as Parameters<
															typeof LocaleLink
														>[0]["href"]
													}
													className="text-sm transition-colors hover:text-primary"
												>
													{page.label}
												</LocaleLink>
											</li>
										))}
									</ul>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			<section className="py-16">
				<div className="container">
					<h2 className="text-2xl font-semibold mb-2">{t("appTitle")}</h2>
					{saasBase && (
						<p className="text-sm mb-8 text-muted-foreground">
							{t("saasNote", { base: saasBase })}
						</p>
					)}
					<div className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 grid grid-cols-1">
						{[
							{ key: "auth", pages: saasAuthPages },
							{ key: "account", pages: saasAccountPages },
							{ key: "organization", pages: saasOrgPages },
							{ key: "admin", pages: saasAdminPages },
							{ key: "misc", pages: saasMiscPages },
						].map((section) => (
							<Card key={section.key}>
								<CardHeader className="pb-3">
									<CardTitle className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
										{t(`sections.${section.key}`)}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<ul className="space-y-1.5">
										{section.pages.map((page) =>
											page.pattern ? (
												<li key={page.href}>
													<code className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
														{page.href}
													</code>
													<span className="ml-1.5 text-xs text-muted-foreground">
														{page.label}
													</span>
												</li>
											) : (
												<li key={page.href}>
													<a
														href={
															saasBase
																? `${saasBase}${page.href}`
																: undefined
														}
														target="_blank"
														rel="noopener noreferrer"
														className="text-sm transition-colors hover:text-primary"
													>
														{page.label}
													</a>
												</li>
											),
										)}
									</ul>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			<CtaFooter />
		</>
	);
}
