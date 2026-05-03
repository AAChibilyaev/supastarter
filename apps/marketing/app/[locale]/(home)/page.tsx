import { CtaFooter } from "@home/components/CtaFooter";
import { FeaturesGrid } from "@home/components/FeaturesGrid";
import { HeroSection } from "@home/components/HeroSection";
import { HowItWorks } from "@home/components/HowItWorks";
import { LogosWall } from "@home/components/LogosWall";
import { PricingPlans } from "@home/components/PricingPlans";
import { TestimonialCarousel } from "@home/components/TestimonialCarousel";
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

			<FeaturesGrid />

			<HowItWorks />

			<LogosWall />

			<TestimonialCarousel />

			<PricingPlans />

			<CtaFooter />
		</>
	);
}
