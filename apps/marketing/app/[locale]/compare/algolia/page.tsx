import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { FAQPageSchema } from "@seo/components/FAQPageSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { CodeExampleSection } from "@shared/components/CodeExampleSection";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CompareAlgoliaGrid } from "../../../../modules/compare/components/CompareAlgoliaGrid";
import { CompareAlgoliaTable } from "../../../../modules/compare/components/CompareAlgoliaTable";
import { DecisionMatrixSection } from "../../../../modules/compare/components/DecisionMatrixSection";
import { PricingScenarios } from "../../../../modules/compare/components/PricingScenarios";
import { TestimonialSection } from "../../../../modules/compare/components/TestimonialSection";
import { WhyMigrateSection } from "../../../../modules/compare/components/WhyMigrateSection";

const COMPARE_ALGOLIA_CODE = `// Before: Algolia
const { hits } = await index.search('query', {
  filters: \`visible_by:\${userId}\`,
});

// After: AACsearch
const results = await client.search({
  q: 'query',
  filter_by: combineFilters(userFilter, scopedToken),
});`;

const FAQ_ITEMS = [
	{
		question: "Why switch from Algolia to AACsearch?",
		answer: "AACsearch offers native multi-tenancy, scoped API tokens, simpler flat pricing, and zero vendor lock-in with full Typesense data export. Cost savings are typically 3-5x.",
	},
	{
		question: "How does AACsearch pricing compare to Algolia?",
		answer: "AACsearch uses flat per-index pricing with unlimited search operations — no per-record or per-query charges. For 100k documents and 500k searches/month, AACsearch is $99/mo compared to Algolia's ~$499/mo (Growth plan).",
	},
	{
		question: "Is migration from Algolia to AACsearch difficult?",
		answer: "Migration is straightforward — AACsearch provides full Typesense data export, and the Typesense-compatible API means minimal code changes. Most teams complete migration in an afternoon.",
	},
	{
		question: "Can I use AACsearch if I need Algolia-specific features?",
		answer: "AACsearch covers core search, geo-search, typo tolerance, faceted search, relevance tuning, synonyms, and curations. For Algolia-specific features like AB testing or AI recommendations, evaluate if the 5x cost savings offset those needs.",
	},
];

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "compareAlgoliaPage" });
	return {
		title: t("title"),
		description: t("description"),
		openGraph: {
			title: t("title"),
			description: t("description"),
		},
	};
}

export default async function CompareAlgoliaPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "compareAlgoliaPage" });
	const baseUrl = getBaseUrl();

	const breadcrumbs = [
		{ name: "Home", url: `${baseUrl}/${locale}` },
		{ name: "Compare", url: `${baseUrl}/${locale}/compare` },
		{ name: "vs Algolia", url: `${baseUrl}/${locale}/compare/algolia` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
			<FAQPageSchema items={FAQ_ITEMS} id={`/${locale}/compare/algolia#faq`} />

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
			<CompareAlgoliaGrid />

			{/* Full Comparison Table */}
			<CompareAlgoliaTable />

			{/* Pricing Scenarios */}
			<PricingScenarios />

			{/* Decision Matrix */}
			<DecisionMatrixSection />

			{/* Why Migrate */}
			<WhyMigrateSection />

			{/* Testimonial */}
			<TestimonialSection />

			{/* Code Example */}
			<CodeExampleSection
				namespace="compareAlgolia"
				code={COMPARE_ALGOLIA_CODE}
				language="typescript"
			/>

			{/* Schema */}
			<SoftwareApplicationSchema locale={locale} />

			{/* CTA */}
			<CtaFooter />
		</>
	);
}
