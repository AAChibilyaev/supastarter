import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { FAQPageSchema } from "@seo/components/FAQPageSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComparePineconeGrid } from "../../../../modules/compare/components/ComparePineconeGrid";

const FAQ_ITEMS = [
	{
		question: "Why switch from Pinecone to AACsearch?",
		answer: "AACsearch offers native multi-tenancy, scoped API tokens, simpler flat pricing, and zero vendor lock-in with full Typesense data export.",
	},
	{
		question: "How does AACsearch pricing compare to Pinecone?",
		answer: "AACsearch uses flat per-index pricing with unlimited search operations — no per-record or per-query charges. Pinecone pricing info would go here.",
	},
	{
		question: "Is migration from Pinecone to AACsearch difficult?",
		answer: "Migration is straightforward — AACsearch provides full Typesense data export, and the Typesense-compatible API means minimal code changes.",
	},
];

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "comparePineconePage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function ComparePineconePage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "comparePineconePage" });
	const baseUrl = getBaseUrl();

	const breadcrumbs = [
		{ name: "Home", url: `${baseUrl}/${locale}` },
		{ name: "Compare", url: `${baseUrl}/${locale}/compare` },
		{ name: "vs Pinecone", url: `${baseUrl}/${locale}/compare/pinecone` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
			<FAQPageSchema items={FAQ_ITEMS} id={`/${locale}/compare/pinecone#faq`} />
			<section className="section-padding border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>
			<ComparePineconeGrid />
			<SoftwareApplicationSchema locale={locale} />
			<CtaFooter />
		</>
	);
}
