import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CompareGrid } from "../../../modules/compare/components/CompareGrid";
import { CompareTable } from "../../../modules/compare/components/CompareTable";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "comparePage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function ComparePage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "comparePage" });
	const tb = await getTranslations({ locale, namespace: "breadcrumbs" });
	const baseUrl = getBaseUrl();

	const breadcrumbs = [
		{ name: tb("home"), url: `${baseUrl}/${locale}` },
		{ name: tb("compare"), url: `${baseUrl}/${locale}/compare` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
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
			<CompareGrid />
			<CompareTable />
			<SoftwareApplicationSchema locale={locale} />
			<CtaFooter />
		</>
	);
}
