import { CtaFooter } from "@home/components/CtaFooter";
import { FeaturesGrid } from "@home/components/FeaturesGrid";
import { HeroWithCode } from "@home/components/HeroWithCode";
import { HowItWorks } from "@home/components/HowItWorks";
import { PricingPlans } from "@home/components/PricingPlans";
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
			<HeroWithCode />
			<HowItWorks />
			<FeaturesGrid />
			<PricingPlans />
			<CtaFooter />
		</>
	);
}
