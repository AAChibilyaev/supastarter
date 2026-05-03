import { CtaFooter } from "@home/components/CtaFooter";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { IntegrationFaq } from "../../../../modules/integrations/components/IntegrationFaq";
import { IntegrationSetupSteps } from "../../../../modules/integrations/components/IntegrationSetupSteps";
import { IntegrationsSanityGrid } from "../../../../modules/integrations/components/IntegrationsSanityGrid";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "integrationsSanityPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function IntegrationsSanityPage(props: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "integrationsSanityPage" });

	return (
		<>
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
			<IntegrationsSanityGrid />
			<IntegrationSetupSteps namespace="integrationsSanitySetup" stepCount={3} ctaHref="#" />
			<IntegrationFaq namespace="integrationsSanityFaq" />
			<CtaFooter />
		</>
	);
}
