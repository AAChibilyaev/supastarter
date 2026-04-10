import { ChangelogSection } from "@changelog/components/ChangelogSection";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function ChangelogPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "changelog" });

	return (
		<div className="max-w-3xl py-16 container">
			<div className="mb-12 pt-8 text-center text-balance">
				<h1 className="mb-2 font-bold text-5xl">{t("title")}</h1>
				<p className="text-lg opacity-50">{t("description")}</p>
			</div>

			<ChangelogSection />
		</div>
	);
}
