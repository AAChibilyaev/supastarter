import { CtaFooter } from "@home/components/CtaFooter";
import { CodeExampleSection } from "@shared/components/CodeExampleSection";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ConnectorsGrid } from "../../../../modules/features/components/ConnectorsGrid";

const CONNECTORS_CODE = `curl -X POST https://app.aacsearch.com/api/connector/sync/delta \\
  -H "Authorization: Bearer ss_connector_xxxx" \\
  -d '{"documents": [{"id": "p123", "name": "Sneakers", "price": 9990}]}'`;

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "featuresConnectorsPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function FeaturesConnectorsPage(props: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "featuresConnectorsPage" });

	return (
		<>
			<section className="py-20 border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-5xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>
			<ConnectorsGrid />
			<CodeExampleSection
				namespace="featuresConnectors"
				code={CONNECTORS_CODE}
				language="bash"
			/>
			<CtaFooter />
		</>
	);
}
