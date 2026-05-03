import { AiAnswersSection } from "@home/components/AiAnswersSection";
import { AnalyticsSection } from "@home/components/AnalyticsSection";
import { CtaFooter } from "@home/components/CtaFooter";
import { DocsEcosystemSection } from "@home/components/DocsEcosystemSection";
import { FeaturesGrid } from "@home/components/FeaturesGrid";
import { HeroSection } from "@home/components/HeroSection";
import { HowItWorks } from "@home/components/HowItWorks";
import { LogosWall } from "@home/components/LogosWall";
import { PricingPlans } from "@home/components/PricingPlans";
import { QuickstartSection } from "@home/components/QuickstartSection";
import { RelevanceSection } from "@home/components/RelevanceSection";
import { SearchUXSection } from "@home/components/SearchUXSection";
import { SecuritySection } from "@home/components/SecuritySection";
import { TestimonialCarousel } from "@home/components/TestimonialCarousel";
import { UseCasesGrid } from "@home/components/UseCasesGrid";
import { WhatUsersSearchSection } from "@home/components/WhatUsersSearchSection";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "home" });
	return {
		title: t("hero.title"),
		description: t("hero.subtitle"),
		openGraph: {
			title: t("hero.title"),
			description: t("hero.subtitle"),
		},
	};
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "home" });

	return (
		<>
			<HeroSection />

			<LogosWall />

			<UseCasesGrid />

			<WhatUsersSearchSection />

			<SearchUXSection />

			<FeaturesGrid />

			<RelevanceSection />

			<AnalyticsSection />

			<SecuritySection />

			<HowItWorks />

			<QuickstartSection />

			<TestimonialCarousel />

			<AiAnswersSection />

			<PricingPlans />

			<DocsEcosystemSection />

			<CtaFooter />
		</>
	);
}
