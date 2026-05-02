import { CtaFooter } from "@home/components/CtaFooter";
import { FeaturesGrid } from "@home/components/FeaturesGrid";
import { HeroWithCode } from "@home/components/HeroWithCode";
import { HowItWorks } from "@home/components/HowItWorks";
import { LogosWall } from "@home/components/LogosWall";
import { PricingPlans } from "@home/components/PricingPlans";
import { TestimonialCarousel } from "@home/components/TestimonialCarousel";
import { SoftwareApplicationSchema } from "@seo/components/SoftwareApplicationSchema";
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
			<SoftwareApplicationSchema locale={locale} />
			<HeroWithCode />
			<HowItWorks />
			<FeaturesGrid />
			<PricingPlans />
			<TestimonialCarousel />
			<LogosWall />
			<CtaFooter />
		</>
	);
}
