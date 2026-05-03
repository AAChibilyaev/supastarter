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
	const tb = await getTranslations({ locale, namespace: "breadcrumbs" });
	const baseUrl = getBaseUrl();

	const faqItems = t.raw("faq") as { question: string; answer: string }[];

	const breadcrumbs = [
		{ name: tb("home"), url: `${baseUrl}/${locale}` },
		{ name: tb("compare"), url: `${baseUrl}/${locale}/compare` },
		{ name: tb("vs.typesense"), url: `${baseUrl}/${locale}/compare/typesense` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
			<FAQPageSchema items={faqItems} id={`/${locale}/compare/typesense#faq`} />

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
