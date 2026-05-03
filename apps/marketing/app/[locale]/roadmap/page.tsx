import { CtaFooter } from "@home/components/CtaFooter";
import { listRoadmapItems } from "@repo/database";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RoadmapGrid } from "../../../modules/company/components/RoadmapGrid";
import type { RoadmapItemData } from "../../../modules/company/components/RoadmapGrid";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "roadmapPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function RoadmapPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "roadmapPage" });

	const dbItems = await listRoadmapItems();
	const items: RoadmapItemData[] = dbItems.map((item) => ({
		key: item.key,
		iconName: item.iconName,
		voteCount: item.voteCount,
		status: item.status,
		changelogSlug: item.changelogSlug,
	}));

	return (
		<>
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
			<RoadmapGrid items={items} />
			<CtaFooter />
		</>
	);
}
