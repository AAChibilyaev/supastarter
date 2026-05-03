"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { WidgetAiPanel } from "@search/components/panels/WidgetAiPanel";
import { WidgetAnalyticsPanel } from "@search/components/panels/WidgetAnalyticsPanel";
import { WidgetAutocompletePanel } from "@search/components/panels/WidgetAutocompletePanel";
import { WidgetConfiguratorPanel } from "@search/components/panels/WidgetConfiguratorPanel";
import { WidgetFiltersPanel } from "@search/components/panels/WidgetFiltersPanel";
import { WidgetInstallPanel } from "@search/components/panels/WidgetInstallPanel";
import { WidgetVoicePanel } from "@search/components/panels/WidgetVoicePanel";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface WidgetPageProps {
	organizationId: string;
}

type TabId = "configurator" | "filters" | "autocomplete" | "voice" | "ai" | "analytics" | "install";

const TAB_IDS: TabId[] = [
	"configurator",
	"filters",
	"autocomplete",
	"voice",
	"ai",
	"analytics",
	"install",
];

function tabLabel(t: (key: string) => string, tab: TabId): string {
	const key = `nav.widget${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
	return t(key);
}

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
						{tabLabel(t, tab)}
					</TabsTrigger>
				))}
			</TabsList>

			<TabsContent value="configurator" className="space-y-6 mt-6">
				<WidgetConfiguratorPanel organizationId={organizationId} />
			</TabsContent>

			<TabsContent value="filters" className="space-y-6 mt-6">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{tabLabel(t, "filters")}</CardTitle>
					</CardHeader>
					<CardContent>
						<WidgetFiltersPanel organizationId={organizationId} />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="autocomplete" className="space-y-6 mt-6">
				<WidgetAutocompletePanel organizationId={organizationId} />
			</TabsContent>

			<TabsContent value="voice" className="space-y-6 mt-6">
				<WidgetVoicePanel organizationId={organizationId} />
			</TabsContent>

			<TabsContent value="ai" className="space-y-6 mt-6">
				<WidgetAiPanel organizationId={organizationId} />
			</TabsContent>

			<TabsContent value="analytics" className="space-y-6 mt-6">
				<WidgetAnalyticsPanel organizationId={organizationId} />
			</TabsContent>

			<TabsContent value="install" className="space-y-6 mt-6">
				<WidgetInstallPanel organizationId={organizationId} />
			</TabsContent>
		</Tabs>
	);
}
