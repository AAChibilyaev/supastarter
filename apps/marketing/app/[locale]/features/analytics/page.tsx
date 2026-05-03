import { CtaFooter } from "@home/components/CtaFooter";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { CodeExampleSection } from "@shared/components/CodeExampleSection";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AnalyticsGrid } from "../../../../modules/features/components/AnalyticsGrid";

const ANALYTICS_CODE = `// POST /api/events/track
{
  "type": "search_query",
  "query": "sneakers",
  "resultCount": 42,
  "latencyMs": 23
}`;

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "featuresAnalyticsPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function FeaturesAnalyticsPage(props: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "featuresAnalyticsPage" });
	const baseUrl = getBaseUrl();

	const breadcrumbs = [
		{ name: "Home", url: `${baseUrl}/${locale}` },
		{ name: "Features", url: `${baseUrl}/${locale}/features` },
		{ name: "Analytics", url: `${baseUrl}/${locale}/features/analytics` },
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
			<AnalyticsGrid />
			<CodeExampleSection
				namespace="featuresAnalytics"
				code={ANALYTICS_CODE}
				language="json"
			/>
			<SoftwareApplicationSchema locale={locale} />
			<CtaFooter />
		</>
	);
}
