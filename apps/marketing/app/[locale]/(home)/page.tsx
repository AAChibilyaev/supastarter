import { AiAnswersSection } from "@home/components/AiAnswersSection";
import { AnalyticsSection } from "@home/components/AnalyticsSection";
import { ArchitectureSection } from "@home/components/ArchitectureSection";
import { CtaFooter } from "@home/components/CtaFooter";
import { DocsEcosystemSection } from "@home/components/DocsEcosystemSection";
import { FeaturesGrid } from "@home/components/FeaturesGrid";
import { FitSection } from "@home/components/FitSection";
import { GraphRagSection } from "@home/components/GraphRagSection";
import { HeroSection } from "@home/components/HeroSection";
import { OsStackSection } from "@home/components/OsStackSection";
import { PricingFaq } from "@home/components/PricingFaq";
import { PricingPlans } from "@home/components/PricingPlans";
import { QuickstartSection } from "@home/components/QuickstartSection";
import { RelevanceSection } from "@home/components/RelevanceSection";
import { SearchUXSection } from "@home/components/SearchUXSection";
import { SecuritySection } from "@home/components/SecuritySection";
import { SuggestionsSection } from "@home/components/SuggestionsSection";
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
			{/* 1. Hero — Search OS value prop */}
			<HeroSection />

			{/* 2. OS Stack — platform architecture, not a feature list */}
			<OsStackSection />

			{/* 3. For whom — segmented use cases */}
			<UseCasesGrid />

			{/* 4. Self-qualification — is it right for you? */}
			<FitSection />

			{/* 5. What users search — unique differentiation */}
			<WhatUsersSearchSection />

			{/* 6. Search UX — autocomplete, facets, typo */}
			<SearchUXSection />

			{/* 7. Features — core capabilities */}
			<FeaturesGrid />

			{/* 8. Suggestions & Recommendations — from search to discovery */}
			<SuggestionsSection />

			{/* 9. GraphRAG — knowledge graph, connections */}
			<GraphRagSection />

			{/* 10. Relevance — ranking control */}
			<RelevanceSection />

			{/* 11. Analytics — data-driven improvement */}
			<AnalyticsSection />

			{/* 12. Architecture — system diagram for technical buyers */}
			<ArchitectureSection />

			{/* 13. Quickstart — code in 15 min */}
			<QuickstartSection />

			{/* 14. AI answers — answer layer */}
			<AiAnswersSection />

			{/* 15. Security — feature overview */}
			<SecuritySection />

			{/* 16. Pricing — plans + FAQ (TCO comparison moved to /pricing and /compare) */}
			<PricingPlans />
			<PricingFaq />

			{/* 17. Docs ecosystem — SDK, API */}
			<DocsEcosystemSection />

			{/* 18. Final CTA */}
			<CtaFooter />
		</>
	);
}
