import { ContactForm } from "@home/components/ContactForm";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "contact" });
	return {
		title: t("title"),
	};
}

export default async function ContactPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "contact" });
	return (
		<section className="section-padding">
			<div className="container max-w-xl">
				<div className="mb-12 pt-8 text-center">
					<h1 className="mb-2 font-bold text-4xl md:text-5xl lg:text-6xl">{t("title")}</h1>
					<p className="text-lg font-light text-balance opacity-50">{t("description")}</p>
				</div>

				<ContactForm />
			</div>
		</section>
	);
}
