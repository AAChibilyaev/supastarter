import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { CodeExampleSection } from "@shared/components/CodeExampleSection";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InstantSearchGrid } from "../../../../modules/features/components/InstantSearchGrid";

const INSTANT_SEARCH_CODE = `<script
  src="https://cdn.aacsearch.com/widget/v1/widget.js"
  data-key="ss_search_xxxx"
  data-index="products"
  data-locale="auto"
></script>`;

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "featuresInstantSearchPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function FeaturesInstantSearchPage(props: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "featuresInstantSearchPage" });
	const baseUrl = getBaseUrl();

	const breadcrumbs = [
		{ name: "Home", url: `${baseUrl}/${locale}` },
		{ name: "Features", url: `${baseUrl}/${locale}/features` },
		{ name: "Instant Search", url: `${baseUrl}/${locale}/features/instant-search` },
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
			<InstantSearchGrid />
			<CodeExampleSection
				namespace="featuresInstantSearch"
				code={INSTANT_SEARCH_CODE}
				language="html"
			/>
			<SoftwareApplicationSchema locale={locale} />
			<CtaFooter />
		</>
	);
}
