import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { FAQPageSchema } from "@seo/components/FAQPageSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CompareSolrGrid } from "../../../../modules/compare/components/CompareSolrGrid";

const FAQ_ITEMS = [
	{
		question: "Why switch from Solr to AACsearch?",
		answer: "AACsearch offers native multi-tenancy, scoped API tokens, simpler flat pricing, and zero vendor lock-in with full Typesense data export.",
	},
	{
		question: "How does AACsearch pricing compare to Solr?",
		answer: "AACsearch uses flat per-index pricing with unlimited search operations — no per-record or per-query charges. Solr pricing info would go here.",
	},
	{
		question: "Is migration from Solr to AACsearch difficult?",
		answer: "Migration is straightforward — AACsearch provides full Typesense data export, and the Typesense-compatible API means minimal code changes.",
	},
];

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "compareSolrPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function CompareSolrPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "compareSolrPage" });
	const baseUrl = getBaseUrl();

	const breadcrumbs = [
		{ name: "Home", url: `${baseUrl}/${locale}` },
		{ name: "Compare", url: `${baseUrl}/${locale}/compare` },
		{ name: "vs Solr", url: `${baseUrl}/${locale}/compare/solr` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
			<FAQPageSchema items={FAQ_ITEMS} id={`/${locale}/compare/solr#faq`} />
			<section className="section-padding border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>
			<CompareSolrGrid />
			<SoftwareApplicationSchema locale={locale} />
			<CtaFooter />
		</>
	);
}
