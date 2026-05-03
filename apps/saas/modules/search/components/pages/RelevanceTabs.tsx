"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { useSearchIndexesQuery } from "@search/lib/api";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";
import { CurationsPanel } from "../panels/CurationsPanel";
import { RankingRulesPanel } from "../panels/RankingRulesPanel";
import { SpellCorrectionPanel } from "../panels/SpellCorrectionPanel";
import { StemmingPanel } from "../panels/StemmingPanel";
import { StopwordsPanel } from "../panels/StopwordsPanel";
import { SynonymsPanel } from "../panels/SynonymsPanel";

interface RelevanceTabsProps {
	organizationId: string;
}

export function RelevanceTabs({ organizationId }: RelevanceTabsProps) {
	const t = useTranslations();
	const { data: indexes } = useSearchIndexesQuery(organizationId);
	const [selectedSlug, setSelectedSlug] = useState<string>("");
	const slug = selectedSlug;

	if (!indexes || indexes.length === 0) {
		return <EmptyState variant="inline" description={t("search.noIndexes")} />;
	}

	return (
		<div className="space-y-4">
			<div className="max-w-xs">
				<Select value={selectedSlug} onValueChange={setSelectedSlug}>
					<SelectTrigger>
						<SelectValue placeholder={t("search.selectIndex")} />
					</SelectTrigger>
					<SelectContent>
						{indexes.map((index) => (
							<SelectItem key={index.id} value={index.slug}>
								{index.displayName}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{slug ? (
				<Tabs defaultValue="synonyms" className="space-y-4">
					<TabsList>
						<TabsTrigger value="synonyms">{t("search.synonyms.tab")}</TabsTrigger>
						<TabsTrigger value="curations">{t("search.curations.tab")}</TabsTrigger>
						<TabsTrigger value="stopwords">{t("search.stopwords.tab")}</TabsTrigger>
						<TabsTrigger value="stemming">{t("search.stemming.tab")}</TabsTrigger>
						<TabsTrigger value="spellCorrection">
							{t("search.spellCorrection.tab")}
						</TabsTrigger>
						<TabsTrigger value="ranking">{t("search.ranking.tab")}</TabsTrigger>
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

					<TabsContent value="stemming">
						<StemmingPanel organizationId={organizationId} slug={slug} />
					</TabsContent>

					<TabsContent value="spellCorrection">
						<SpellCorrectionPanel organizationId={organizationId} slug={slug} />
					</TabsContent>

					<TabsContent value="ranking">
						<RankingRulesPanel organizationId={organizationId} slug={slug} />
					</TabsContent>
				</Tabs>
			) : (
				<EmptyState variant="inline" description={t("search.selectIndex")} />
			)}
		</div>
	);
}
