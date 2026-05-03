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
	const tb = await getTranslations({ locale, namespace: "breadcrumbs" });
	const baseUrl = getBaseUrl();

	const faqItems = t.raw("faq") as { question: string; answer: string }[];

	const breadcrumbs = [
		{ name: tb("home"), url: `${baseUrl}/${locale}` },
		{ name: tb("compare"), url: `${baseUrl}/${locale}/compare` },
		{ name: tb("vs.algolia"), url: `${baseUrl}/${locale}/compare/algolia` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
			<FAQPageSchema items={faqItems} id={`/${locale}/compare/algolia#faq`} />

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
