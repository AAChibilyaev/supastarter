"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { RecommendationsDashboardCards } from "../recommendations/RecommendationsDashboardCards";
import { RecommendationsGraphRAG } from "../recommendations/RecommendationsGraphRAG";
import { RecommendationsPersonalizedAnalytics } from "../recommendations/RecommendationsPersonalizedAnalytics";
import { RecommendationsSettings } from "../recommendations/RecommendationsSettings";
import { RecommendationsTestPanel } from "../recommendations/RecommendationsTestPanel";

interface RecommendationsPageProps {
	organizationId: string;
}

type TabId = "dashboard" | "similar" | "personalized" | "graphrag" | "settings";

const TAB_IDS: TabId[] = ["dashboard", "similar", "personalized", "graphrag", "settings"];

export function RecommendationsPage({ organizationId }: RecommendationsPageProps) {
	const t = useTranslations();
	const tr = useTranslations("search");
	const router = useRouter();
	const searchParams = useSearchParams();

	const activeTab: TabId = (searchParams.get("tab") as TabId) ?? "dashboard";

	const setActiveTab = useCallback(
		(tab: string) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set("tab", tab);
			router.replace(`?${params.toString()}`, { scroll: false });
		},
		[router, searchParams],
	);

	const { data: trendingData, isLoading } = useQuery(
		orpc.recommendations.trending.queryOptions({
			input: { organizationId, window: "7", limit: 1 },
		}),
	);

	const neo4jConnected = !isLoading && (trendingData?.neo4jConnected ?? false);

	const fetchSimilar = useCallback(
		async (productId: string) => {
			const result = await orpc.recommendations.similar.call({
				organizationId,
				productId,
				limit: 10,
			});
			return result.results.map((r) => ({
				id: r.id,
				title: r.title,
				score: r.score,
			}));
		},
		[organizationId],
	);

	return (
		<Tabs value={activeTab} onValueChange={setActiveTab}>
			<TabsList>
				{TAB_IDS.map((tab) => (
					<TabsTrigger key={tab} value={tab}>
						{t(
							`search.nav.recommendations${tab.charAt(0).toUpperCase() + tab.slice(1)}` as any,
						)}
					</TabsTrigger>
				))}
			</TabsList>

			<TabsContent value="dashboard" className="mt-6 space-y-6">
				<RecommendationsDashboardCards organizationId={organizationId} />
			</TabsContent>

			<TabsContent value="similar" className="mt-6 space-y-6">
				<RecommendationsTestPanel
					organizationId={organizationId}
					fetchRecommendations={fetchSimilar}
					title={tr("recommendations.similarTab")}
					emptyMessage={tr("recommendations.selectProduct")}
					neo4jConnected={neo4jConnected}
				/>
			</TabsContent>

			<TabsContent value="personalized" className="mt-6 space-y-6">
				<RecommendationsPersonalizedAnalytics organizationId={organizationId} />
			</TabsContent>

			<TabsContent value="graphrag" className="mt-6 space-y-6">
				<RecommendationsGraphRAG organizationId={organizationId} />
			</TabsContent>

			<TabsContent value="settings" className="mt-6 space-y-6">
				<RecommendationsSettings organizationId={organizationId} />
			</TabsContent>
		</Tabs>
	);
}
