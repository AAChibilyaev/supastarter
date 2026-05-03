"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { WidgetConfiguratorPanel } from "@search/components/panels/WidgetConfiguratorPanel";
import { EmptyState } from "@search/components/cards/EmptyState";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface WidgetPageProps {
	organizationId: string;
}

type TabId = "configurator" | "filters" | "autocomplete" | "voice" | "analytics" | "install";

const TAB_IDS: TabId[] = [
	"configurator",
	"filters",
	"autocomplete",
	"voice",
	"analytics",
	"install",
];

export function WidgetPage({ organizationId }: WidgetPageProps) {
	const t = useTranslations("search");
	const router = useRouter();
	const searchParams = useSearchParams();

	const activeTab: TabId = (searchParams.get("tab") as TabId) ?? "configurator";

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
						{t(`nav.widget${tab.charAt(0).toUpperCase() + tab.slice(1)}` as any)}
					</TabsTrigger>
				))}
			</TabsList>

			<TabsContent value="configurator" className="space-y-6 mt-6">
				<WidgetConfiguratorPanel organizationId={organizationId} />
			</TabsContent>

			{TAB_IDS.filter((t) => t !== "configurator").map((tab) => (
				<TabsContent key={tab} value={tab} className="space-y-6 mt-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">
								{t(
									`nav.widget${tab.charAt(0).toUpperCase() + tab.slice(1)}` as any,
								)}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<EmptyState
								title={t("widget.comingSoon")}
								description={t("widget.comingSoonDescription")}
							/>
						</CardContent>
					</Card>
				</TabsContent>
			))}
		</Tabs>
	);
}
