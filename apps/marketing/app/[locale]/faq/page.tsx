import { CtaFooter } from "@home/components/CtaFooter";
import { FAQPageSchema } from "@seo/components/FAQPageSchema";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FaqGrid } from "../../../modules/faq/components/FaqGrid";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "faqPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function FaqPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "faqPage" });
	const faqT = await getTranslations({ locale, namespace: "faq" });

	const faqItems = [
		{ key: "searchUnit" as const },
		{ key: "pricing" as const },
		{ key: "scaling" as const },
		{ key: "dataResidency" as const },
		{ key: "migration" as const },
	].map(({ key }) => ({
		question: faqT(`items.${key}.title`),
		answer: faqT(`items.${key}.description`),
	}));

	return (
		<>
			<FAQPageSchema items={faqItems} />
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
			<FaqGrid />
			<CtaFooter />
		</>
	);
}
