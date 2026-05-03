import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { FAQPageSchema } from "@seo/components/FAQPageSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CompareSolrGrid } from "../../../../modules/compare/components/CompareSolrGrid";

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
	const tb = await getTranslations({ locale, namespace: "breadcrumbs" });
	const baseUrl = getBaseUrl();

	const faqItems = t.raw("faq") as { question: string; answer: string }[];

	const breadcrumbs = [
		{ name: tb("home"), url: `${baseUrl}/${locale}` },
		{ name: tb("compare"), url: `${baseUrl}/${locale}/compare` },
		{ name: tb("vs.solr"), url: `${baseUrl}/${locale}/compare/solr` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
			<FAQPageSchema items={faqItems} id={`/${locale}/compare/solr#faq`} />
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
			<CompareSolrGrid />
			<SoftwareApplicationSchema locale={locale} />
			<CtaFooter />
		</>
	);
}
