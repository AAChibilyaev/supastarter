"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { EmptyState } from "@search/components/cards/EmptyState";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface RecommendationsPageProps {
	organizationId: string;
}

type TabId = "dashboard" | "similar" | "personalized" | "graphrag" | "settings";

const TAB_IDS: TabId[] = ["dashboard", "similar", "personalized", "graphrag", "settings"];

export function RecommendationsPage({ organizationId: _organizationId }: RecommendationsPageProps) {
	const t = useTranslations("search");
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

	return (
		<Tabs value={activeTab} onValueChange={setActiveTab}>
			<TabsList>
				{TAB_IDS.map((tab) => (
					<TabsTrigger key={tab} value={tab}>
						{t(
							`nav.recommendations${tab.charAt(0).toUpperCase() + tab.slice(1)}` as any,
						)}
					</TabsTrigger>
				))}
			</TabsList>

			<TabsContent value="dashboard" className="space-y-6 mt-6">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("recommendations.dashboardTitle")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<EmptyState
							title={t("recommendations.comingSoon")}
							description={t("recommendations.comingSoonDescription")}
						/>
					</CardContent>
				</Card>
			</TabsContent>

			{TAB_IDS.filter((t) => t !== "dashboard").map((tab) => (
				<TabsContent key={tab} value={tab} className="space-y-6 mt-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">
								{t(
									`nav.recommendations${tab.charAt(0).toUpperCase() + tab.slice(1)}` as any,
								)}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<EmptyState
								title={t("recommendations.comingSoon")}
								description={t("recommendations.comingSoonDescription")}
							/>
						</CardContent>
					</Card>
				</TabsContent>
			))}
		</Tabs>
	);
}
