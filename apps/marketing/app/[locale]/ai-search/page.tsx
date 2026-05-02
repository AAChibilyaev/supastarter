import { CtaFooter } from "@home/components/CtaFooter";
import { Badge } from "@repo/ui/components/badge";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AiSearchContent } from "../../../modules/ai-search/components/AiSearchContent";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "aiSearchPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function AiSearchPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "aiSearchPage" });

	return (
		<>
			<section className="py-20 border-b border-border/60 text-center">
				<div className="container">
					<div className="mb-4 flex justify-center">
						<Badge status="success">{t("badge")}</Badge>
					</div>
					<h1 className="text-5xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>
			<AiSearchContent />
			<CtaFooter />
		</>
	);
}
