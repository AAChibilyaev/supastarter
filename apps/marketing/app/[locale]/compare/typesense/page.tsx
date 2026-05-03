import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { FAQPageSchema } from "@seo/components/FAQPageSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { CodeExampleSection } from "@shared/components/CodeExampleSection";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CompareTypesenseGrid } from "../../../../modules/compare/components/CompareTypesenseGrid";
import { CompareTypesenseTable } from "../../../../modules/compare/components/CompareTypesenseTable";
import { TypesenseAnalogySection } from "../../../../modules/compare/components/TypesenseAnalogySection";
import { TypesenseDecisionMatrix } from "../../../../modules/compare/components/TypesenseDecisionMatrix";
import { TypesenseScenarios } from "../../../../modules/compare/components/TypesenseScenarios";
import { TypesenseTestimonial } from "../../../../modules/compare/components/TypesenseTestimonial";
import { TypesenseWhyMigrate } from "../../../../modules/compare/components/TypesenseWhyMigrate";

const COMPARE_TYPESENSE_CODE = `// Before: Raw Typesense client (self-hosted or cloud)
const client = new Typesense.Client({
  apiKey: '...',
  nodes: [{ host: '...', port: 8108 }],
});

// After: AACsearch (managed platform + multi-tenancy)
const client = new AACsearchClient({
  apiKey: process.env.AAC_API_KEY,
});

const results = await client.search({
  q: 'query',
  filter_by: combineFilters(tenantFilter, scopedToken),
});`;

const FAQ_ITEMS = [
	{
		question: "Why choose AACsearch over Typesense Cloud?",
		answer: "AACsearch adds a full SaaS layer on top of Typesense: multi-tenant API keys, scoped tokens, analytics dashboard, search widget, CMS connectors, rate limiting, and user management — all included. Typesense Cloud gives you a Typesense cluster, but you build everything else yourself.",
	},
	{
		question: "How does AACsearch pricing compare to Typesense Cloud?",
		answer: "AACsearch uses flat per-index pricing with unlimited search operations. Typesense Cloud charges per node-hour plus per-GB storage. For 100k documents and 500k searches/month, AACsearch is $99/mo compared to Typesense Cloud's ~$99/mo for the cluster — but you'd also need to build and maintain multi-tenancy, analytics, and other middleware.",
	},
	{
		question: "Is migration from Typesense to AACsearch difficult?",
		answer: "Not at all — AACsearch uses the same Typesense engine. Your data schema, search queries, and relevance tuning are fully compatible. Most teams reindex in under an hour.",
	},
	{
		question: "Can I use AACsearch if I need to self-host later?",
		answer: "Yes — AACsearch provides full Typesense data export. Because both use the same open-source engine, you can migrate to self-hosted Typesense anytime with zero lock-in. Export your data and point your client to your own cluster.",
	},
];

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "compareTypesensePage" });
	return {
		title: t("title"),
		description: t("description"),
		openGraph: {
			title: t("title"),
			description: t("description"),
		},
	};
}

export default async function CompareTypesensePage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "compareTypesensePage" });
	const baseUrl = getBaseUrl();

	const breadcrumbs = [
		{ name: "Home", url: `${baseUrl}/${locale}` },
		{ name: "Compare", url: `${baseUrl}/${locale}/compare` },
		{ name: "vs Typesense Cloud", url: `${baseUrl}/${locale}/compare/typesense` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
			<FAQPageSchema items={FAQ_ITEMS} id={`/${locale}/compare/typesense#faq`} />

			{/* Hero */}
			<section className="section-padding border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>

			{/* Feature Grid */}
			<CompareTypesenseGrid />

			{/* Full Comparison Table */}
			<CompareTypesenseTable />

			{/* Pricing Scenarios */}
			<TypesenseScenarios />

			{/* Analogy Section */}
			<TypesenseAnalogySection />

			{/* Decision Matrix */}
			<TypesenseDecisionMatrix />

			{/* Why Migrate */}
			<TypesenseWhyMigrate />

			{/* Testimonial */}
			<TypesenseTestimonial />

			{/* Code Example */}
			<CodeExampleSection
				namespace="compareTypesense"
				code={COMPARE_TYPESENSE_CODE}
				language="typescript"
			/>

			{/* Schema */}
			<SoftwareApplicationSchema locale={locale} />

			{/* CTA */}
			<CtaFooter />
		</>
	);
}
