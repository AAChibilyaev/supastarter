import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { MultiSearchGrid } from "../../../../modules/features/components/MultiSearchGrid";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "featuresMultiSearchPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function FeaturesMultiSearchPage(props: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "featuresMultiSearchPage" });
	const baseUrl = getBaseUrl();

	const breadcrumbs = [
		{ name: "Home", url: `${baseUrl}/${locale}` },
		{ name: "Features", url: `${baseUrl}/${locale}/features` },
		{ name: "Multi-Search", url: `${baseUrl}/${locale}/features/multi-search` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
			<section className="py-20 border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-5xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>
			<MultiSearchGrid />
			<SoftwareApplicationSchema locale={locale} />
			<CtaFooter />
		</>
	);
}
