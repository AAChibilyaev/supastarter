import { CtaFooter } from "@home/components/CtaFooter";
import { FeaturesGrid } from "@home/components/FeaturesGrid";
import { HeroWithCode } from "@home/components/HeroWithCode";
import { HowItWorks } from "@home/components/HowItWorks";
import { PricingPlans } from "@home/components/PricingPlans";
import { setRequestLocale } from "next-intl/server";

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
