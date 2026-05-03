import { AiAnswersSection } from "@home/components/AiAnswersSection";
import { AnalyticsSection } from "@home/components/AnalyticsSection";
import { ArchitectureSection } from "@home/components/ArchitectureSection";
import { CtaFooter } from "@home/components/CtaFooter";
import { DocsEcosystemSection } from "@home/components/DocsEcosystemSection";
import { FeaturesGrid } from "@home/components/FeaturesGrid";
import { FitSection } from "@home/components/FitSection";
import { HeroSection } from "@home/components/HeroSection";
import { PricingCalculator } from "@home/components/PricingCalculator";
import { PricingFaq } from "@home/components/PricingFaq";
import { PricingPlans } from "@home/components/PricingPlans";
import { QuickstartSection } from "@home/components/QuickstartSection";
import { RelevanceSection } from "@home/components/RelevanceSection";
import { SearchUXSection } from "@home/components/SearchUXSection";
import { SecuritySection } from "@home/components/SecuritySection";
import { TcoComparison } from "@home/components/TcoComparison";
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

	return (
		<>
			{/* 1. Hero — outcome-driven value prop */}
			<HeroSection />

			{/* 3. For whom — segmented use cases */}
			<UseCasesGrid />

			{/* 4. Self-qualification — is it right for you? */}
			<FitSection />

			{/* 5. What users search — unique diff. */}
			<WhatUsersSearchSection />

			{/* 6. Search UX — autocomplete, facets, typo */}
			<SearchUXSection />

			{/* 7. Features — core capabilities */}
			<FeaturesGrid />

			{/* 8. Relevance — ranking control */}
			<RelevanceSection />

			{/* 9. Analytics — data-driven improvement */}
			<AnalyticsSection />

			{/* 11. TCO comparison — vs Algolia */}
			<TcoComparison />

			{/* 13. Architecture — system diagram for technical buyers */}
			<ArchitectureSection />

			{/* 14. Quickstart — code in 15 min */}
			<QuickstartSection />

			{/* 15. AI answers — answer layer */}
			<AiAnswersSection />

			{/* 16. Security — feature overview */}
			<SecuritySection />

			{/* 19. Pricing — plans + interactive calculator + FAQ */}

			{/* 19. Pricing — plans + interactive calculator + FAQ */}
			<PricingPlans />
			<PricingCalculator />
			<PricingFaq />

			{/* 20. Docs ecosystem — SDK, API */}
			<DocsEcosystemSection />

			{/* 21. Final CTA */}
			<CtaFooter />
		</>
	);
}
