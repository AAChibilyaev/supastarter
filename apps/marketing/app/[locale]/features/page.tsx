import { CtaFooter } from "@home/components/CtaFooter";
import { FeaturesGrid } from "@home/components/FeaturesGrid";
import { HowItWorks } from "@home/components/HowItWorks";
import { BreadcrumbSchema } from "@seo/components/BreadcrumbSchema";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "featuresPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function FeaturesPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "featuresPage" });
	const baseUrl = getBaseUrl();

	const breadcrumbs = [
		{ name: "Home", url: `${baseUrl}/${locale}` },
		{ name: "Features", url: `${baseUrl}/${locale}/features` },
	];

	return (
		<>
			<BreadcrumbSchema items={breadcrumbs} baseUrl={baseUrl} />
			<section className="section-padding border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-balance">
						{t("title")}
					</h1>
					<p className="mt-4 text-xl font-light max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>
			<FeaturesGrid />
			<HowItWorks />
			<SoftwareApplicationSchema locale={locale} />
			<CtaFooter />
		</>
	);
}
