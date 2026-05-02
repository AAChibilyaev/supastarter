import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { FAQPageSchema } from "@seo/components/FAQPageSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CompareElasticsearchGrid } from "../../../../modules/compare/components/CompareElasticsearchGrid";

const FAQ_ITEMS = [
	{
		question: "Why switch from Elasticsearch to AACsearch?",
		answer: "AACsearch offers native multi-tenancy, scoped API tokens, simpler flat pricing, and zero vendor lock-in with full Typesense data export.",
	},
	{
		question: "How does AACsearch pricing compare to Elasticsearch?",
		answer: "AACsearch uses flat per-index pricing with unlimited search operations — no per-record or per-query charges. Elasticsearch pricing info would go here.",
	},
	{
		question: "Is migration from Elasticsearch to AACsearch difficult?",
		answer: "Migration is straightforward — AACsearch provides full Typesense data export, and the Typesense-compatible API means minimal code changes.",
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
			<section className="py-20 border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-5xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>
			<CompareElasticsearchGrid />
			<SoftwareApplicationSchema locale={locale} />
			<CtaFooter />
		</>
	);
}
