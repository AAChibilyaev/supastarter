"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { useTranslations } from "next-intl";

import { EmptyState } from "../cards/EmptyState";
import { CurationsPanel } from "../panels/CurationsPanel";
import { SpellCorrectionPanel } from "../panels/SpellCorrectionPanel";
import { StopwordsPanel } from "../panels/StopwordsPanel";
import { SynonymsPanel } from "../panels/SynonymsPanel";

interface RelevanceTabsProps {
	organizationId: string;
	slug?: string;
}

export function RelevanceTabs({ organizationId, slug }: RelevanceTabsProps) {
	const t = useTranslations();

	if (!slug) {
		return <EmptyState variant="inline" description={t("search.selectIndex")} />;
	}

	return (
		<Tabs defaultValue="synonyms" className="space-y-4">
			<TabsList>
				<TabsTrigger value="synonyms">{t("search.synonyms.tab")}</TabsTrigger>
				<TabsTrigger value="curations">{t("search.curations.tab")}</TabsTrigger>
				<TabsTrigger value="stopwords">{t("search.stopwords.tab")}</TabsTrigger>
				<TabsTrigger value="spellCorrection">{t("search.spellCorrection.tab")}</TabsTrigger>
			</TabsList>

			<TabsContent value="synonyms">
				<SynonymsPanel organizationId={organizationId} slug={slug} />
			</TabsContent>

			<TabsContent value="curations">
				<CurationsPanel organizationId={organizationId} slug={slug} />
			</TabsContent>

			<TabsContent value="stopwords">
				<StopwordsPanel organizationId={organizationId} slug={slug} />
			</TabsContent>

			<TabsContent value="spellCorrection">
				<SpellCorrectionPanel organizationId={organizationId} slug={slug} />
			</TabsContent>
		</Tabs>
	);
}
