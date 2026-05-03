import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DemoSearchPage } from "../../../modules/demo/components/DemoSearchPage";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "demo" });
	return {
		title: t("title"),
		description: t("description"),
		openGraph: {
			title: t("title"),
			description: t("description"),
		},
	};
}

export default async function DemoPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "demo" });

	return (
		<main className="section-padding min-h-screen">
			<div className="container">
				<div className="max-w-3xl mb-12 mx-auto text-center">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
						{t("heading")}
					</h1>
					<p className="text-lg text-muted-foreground">{t("subheading")}</p>
				</div>
				<DemoSearchPage />
			</div>
		</main>
	);
}
