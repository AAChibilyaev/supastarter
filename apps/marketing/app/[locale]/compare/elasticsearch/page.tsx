import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { FAQPageSchema } from "@seo/components/FAQPageSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { CodeExampleSection } from "@shared/components/CodeExampleSection";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CompareElasticsearchGrid } from "../../../../modules/compare/components/CompareElasticsearchGrid";
import { CompareElasticsearchTable } from "../../../../modules/compare/components/CompareElasticsearchTable";
import { ElasticsearchDecisionMatrix } from "../../../../modules/compare/components/ElasticsearchDecisionMatrix";
import { ElasticsearchScenarios } from "../../../../modules/compare/components/ElasticsearchScenarios";
import { ElasticsearchTestimonial } from "../../../../modules/compare/components/ElasticsearchTestimonial";
import { ElasticsearchWhyMigrate } from "../../../../modules/compare/components/ElasticsearchWhyMigrate";

const COMPARE_ELASTICSEARCH_CODE = `// Before: Elasticsearch client (cluster + mapping)
const client = new elasticsearch.Client({
  node: 'http://localhost:9200',
  auth: { apiKey: '...' },
});

// After: AACsearch (zero-ops, auto-scaling)
const client = new AACsearchClient({
  apiKey: process.env.AAC_API_KEY,
});

const results = await client.search({
  q: 'query',
  filter_by: 'tenant_id:=123',
});`;

const FAQ_ITEMS = [
	{
		question: "Why switch from Elasticsearch to AACsearch?",
		answer:
			"AACsearch offers zero-ops search with automatic scaling, built-in analytics, and predictable flat pricing — no cluster management, JVM tuning, or capacity planning required. Teams typically eliminate 80% of search infrastructure overhead.",
	},
	{
		question: "How does AACsearch pricing compare to Elasticsearch?",
		answer:
			"AACsearch uses flat per-index pricing with unlimited search operations. Elasticsearch Cloud charges per node-hour plus storage. For 100k docs and 500k searches/month, AACsearch is $99/mo compared to Elastic Cloud's ~$350-600/mo (3-node cluster).",
	},
	{
		question: "Is migration from Elasticsearch to AACsearch difficult?",
		answer:
			"Migration is straightforward — AACsearch provides full Typesense data export, and the Typesense-compatible API means minimal code changes. Most teams complete migration in a weekend.",
	},
	{
		question: "Can I use AACsearch if I need Elasticsearch-specific features?",
		answer:
			"AACsearch covers core search, geo-search, typo tolerance, faceted search, and relevance tuning. For Elasticsearch-specific features like log analytics / ELK stack, complex aggregations, or ML capabilities, consider keeping Elasticsearch for those workloads while using AACsearch for application search.",
	},
];

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "compareElasticsearchPage" });
	return {
		title: t("title"),
		description: t("description"),
		openGraph: {
			title: t("title"),
			description: t("description"),
		},
	};
}

export default async function CompareElasticsearchPage(props: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "compareElasticsearchPage" });
	const baseUrl = getBaseUrl();

	const breadcrumbs = [
		{ name: "Home", url: `${baseUrl}/${locale}` },
		{ name: "Compare", url: `${baseUrl}/${locale}/compare` },
		{ name: "vs Elasticsearch", url: `${baseUrl}/${locale}/compare/elasticsearch` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
			<FAQPageSchema items={FAQ_ITEMS} id={`/${locale}/compare/elasticsearch#faq`} />

			{/* Hero */}
			<section className="py-20 border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-5xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>

			{/* Feature Grid */}
			<CompareElasticsearchGrid />

			{/* Full Comparison Table */}
			<CompareElasticsearchTable />

			{/* Pricing Scenarios */}
			<ElasticsearchScenarios />

			{/* Decision Matrix */}
			<ElasticsearchDecisionMatrix />

			{/* Why Migrate */}
			<ElasticsearchWhyMigrate />

			{/* Testimonial */}
			<ElasticsearchTestimonial />

			{/* Code Example */}
			<CodeExampleSection
				namespace="compareElasticsearch"
				code={COMPARE_ELASTICSEARCH_CODE}
				language="typescript"
			/>

			{/* Schema */}
			<SoftwareApplicationSchema locale={locale} />

			{/* CTA */}
			<CtaFooter />
		</>
	);
}
