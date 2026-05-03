import { CtaFooter } from "@home/components/CtaFooter";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TutorialsGrid } from "../../../modules/tutorials/components/TutorialsGrid";

export async function generateStaticParams() {
	return [
		{ locale: "en" },
		{ locale: "de" },
		{ locale: "es" },
		{ locale: "fr" },
		{ locale: "ru" },
	];
}

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "tutorialsPage" });
	return {
		title: t("title"),
		description: t("description"),
		openGraph: {
			title: t("title"),
			description: t("description"),
		},
	};
}

export default async function TutorialsPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "tutorialsPage" });

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
			<TutorialsGrid />
			<CtaFooter />
		</>
	);
}
