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
	const tb = await getTranslations({ locale, namespace: "breadcrumbs" });
	const baseUrl = getBaseUrl();

	const faqItems = t.raw("faq") as { question: string; answer: string }[];

	const breadcrumbs = [
		{ name: tb("home"), url: `${baseUrl}/${locale}` },
		{ name: tb("compare"), url: `${baseUrl}/${locale}/compare` },
		{ name: tb("vs.elasticsearch"), url: `${baseUrl}/${locale}/compare/elasticsearch` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
			<FAQPageSchema items={faqItems} id={`/${locale}/compare/elasticsearch#faq`} />

			{/* Hero */}
			<section className="section-padding border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
						{t("title")}
					</h1>
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
