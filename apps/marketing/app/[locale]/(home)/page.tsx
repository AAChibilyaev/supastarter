import { AiAnswersSection } from "@home/components/AiAnswersSection";
import { AnalyticsSection } from "@home/components/AnalyticsSection";
import { CtaFooter } from "@home/components/CtaFooter";
import { DocsEcosystemSection } from "@home/components/DocsEcosystemSection";
import { FeaturesGrid } from "@home/components/FeaturesGrid";
import { HeroSection } from "@home/components/HeroSection";
import { HowItWorks } from "@home/components/HowItWorks";
import { LiveDemoSection } from "@home/components/LiveDemoSection";
import { LogosWall } from "@home/components/LogosWall";
import { MigrationSection } from "@home/components/MigrationSection";
import { PricingFaq } from "@home/components/PricingFaq";
import { PricingPlans } from "@home/components/PricingPlans";
import { QuickstartSection } from "@home/components/QuickstartSection";
import { RelevanceSection } from "@home/components/RelevanceSection";
import { SearchUXSection } from "@home/components/SearchUXSection";
import { SecuritySection } from "@home/components/SecuritySection";
import { TcoComparison } from "@home/components/TcoComparison";
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

	return (
		<>
			{/* 1. Hero — outcome-driven value prop */}
			<HeroSection />

			{/* 2. Trust bar — customer logos */}
			<LogosWall />

			{/* 3. For whom — segmented use cases */}
			<UseCasesGrid />

			{/* 4. What users search — unique diff. */}
			<WhatUsersSearchSection />

			{/* 5. Search UX — autocomplete, facets, typo */}
			<SearchUXSection />

			{/* 6. Features — core capabilities */}
			<FeaturesGrid />

			{/* 7. Relevance — ranking control */}
			<RelevanceSection />

			{/* 8. Analytics — data-driven improvement */}
			<AnalyticsSection />

			{/* 9. Migration — 1-hour switch */}
			<MigrationSection />

			{/* 10. TCO comparison — vs Algolia */}
			<TcoComparison />

			{/* 11. How it works — 3 steps */}
			<HowItWorks />

			{/* 12. Quickstart — code in 15 min */}
			<QuickstartSection />

			{/* 13. AI answers — answer layer */}
			<AiAnswersSection />

			{/* 14. Security — multi-tenant design */}
			<SecuritySection />

			{/* 15. Live demo — interactive search */}
			<LiveDemoSection />

			{/* 16. Testimonials — social proof */}
			<TestimonialCarousel />

			{/* 17. Pricing — plans + FAQ */}
			<PricingPlans />
			<PricingFaq />

			{/* 18. Docs ecosystem — SDK, API */}
			<DocsEcosystemSection />

			{/* 19. Final CTA */}
			<CtaFooter />
		</>
	);
}
