import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { CodeExampleSection } from "@shared/components/CodeExampleSection";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { WidgetGrid } from "../../../../modules/features/components/WidgetGrid";

const WIDGET_CODE = `<!-- One script tag. Zero configuration. -->
<script
  src="https://cdn.aacsearch.com/widget/v1/widget.js"
  data-key="ss_search_xxxx"
  data-index="products"
  data-placeholder="Search products..."
></script>`;

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "featuresWidgetPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function FeaturesWidgetPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "featuresWidgetPage" });
	const baseUrl = getBaseUrl();

	const breadcrumbs = [
		{ name: "Home", url: `${baseUrl}/${locale}` },
		{ name: "Features", url: `${baseUrl}/${locale}/features` },
		{ name: "Widget", url: `${baseUrl}/${locale}/features/widget` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
			<section className="section-padding border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>
			<WidgetGrid />
			<CodeExampleSection namespace="featuresWidget" code={WIDGET_CODE} language="html" />
			<SoftwareApplicationSchema locale={locale} />
			<CtaFooter />
		</>
	);
}
