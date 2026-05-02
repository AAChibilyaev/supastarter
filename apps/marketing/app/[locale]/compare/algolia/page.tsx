import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { FAQPageSchema } from "@seo/components/FAQPageSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { CodeExampleSection } from "@shared/components/CodeExampleSection";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CompareAlgoliaGrid } from "../../../../modules/compare/components/CompareAlgoliaGrid";

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
		answer: "AACsearch offers native multi-tenancy, scoped API tokens, simpler flat pricing, and zero vendor lock-in with full Typesense data export.",
	},
	{
		question: "How does AACsearch pricing compare to Algolia?",
		answer: "AACsearch uses flat per-index pricing with unlimited search operations — no per-record or per-query charges. Algolia pricing info would go here.",
	},
	{
		question: "Is migration from Algolia to AACsearch difficult?",
		answer: "Migration is straightforward — AACsearch provides full Typesense data export, and the Typesense-compatible API means minimal code changes.",
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
			<section className="py-20 border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-5xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>
			<CompareAlgoliaGrid />
			<CodeExampleSection
				namespace="compareAlgolia"
				code={COMPARE_ALGOLIA_CODE}
				language="typescript"
			/>
			<SoftwareApplicationSchema locale={locale} />
			<CtaFooter />
		</>
	);
}