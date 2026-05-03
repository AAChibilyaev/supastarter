import { CtaFooter } from "@home/components/CtaFooter";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { IntegrationFaq } from "../../../../modules/integrations/components/IntegrationFaq";
import { IntegrationSetupSteps } from "../../../../modules/integrations/components/IntegrationSetupSteps";
import { IntegrationsNextJsGrid } from "../../../../modules/integrations/components/IntegrationsNextJsGrid";
import { NextJsSnippet } from "../../../../modules/integrations/components/snippets/NextJsSnippet";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "integrationsNextJsPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function IntegrationsNextJsPage(props: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const tPage = await getTranslations({ locale, namespace: "integrationsNextJsPage" });
	const tSetup = await getTranslations({ locale, namespace: "integrationsNextJsSetup" });

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
			<IntegrationsNextJsGrid />
			<IntegrationSetupSteps namespace="integrationsNextJsSetup" stepCount={3} />
			<NextJsSnippet title={tSetup("code.title")} />
			<IntegrationFaq namespace="integrationsNextJsFaq" />
			<CtaFooter />
		</>
	);
}
