import { CtaFooter } from "@home/components/CtaFooter";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompareOpenSearchGrid } from "../../../../modules/compare/components/CompareOpenSearchGrid";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "compareOpenSearchPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function CompareOpenSearchPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "compareOpenSearchPage" });

	return (
		<>
			<section className="py-20 border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-5xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
						{t("description")}
					</p>
				</div>
			</section>
			<CompareOpenSearchGrid />
			<CtaFooter />
		</>
	);
}
