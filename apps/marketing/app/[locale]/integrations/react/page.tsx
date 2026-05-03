import { CtaFooter } from "@home/components/CtaFooter";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { IntegrationFaq } from "../../../../modules/integrations/components/IntegrationFaq";
import { IntegrationSetupSteps } from "../../../../modules/integrations/components/IntegrationSetupSteps";
import { IntegrationsReactGrid } from "../../../../modules/integrations/components/IntegrationsReactGrid";
import { ReactSnippet } from "../../../../modules/integrations/components/snippets/ReactSnippet";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "integrationsReactPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function IntegrationsReactPage(props: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const tPage = await getTranslations({ locale, namespace: "integrationsReactPage" });
	const tSetup = await getTranslations({ locale, namespace: "integrationsReactSetup" });

	return (
		<>
			<section className="py-20 border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-5xl font-bold tracking-tight text-balance">
						{tPage("title")}
					</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{tPage("description")}
					</p>
				</div>
			</section>
			<IntegrationsReactGrid />
			<IntegrationSetupSteps namespace="integrationsReactSetup" stepCount={3} />
			<ReactSnippet title={tSetup("code.title")} />
			<IntegrationFaq namespace="integrationsReactFaq" />
			<CtaFooter />
		</>
	);
}
