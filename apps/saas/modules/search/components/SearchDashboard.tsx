"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { useSearchIndexesQuery } from "../lib/api";
import { CreateSearchIndexDialog } from "./CreateSearchIndexDialog";
import { PlaygroundPanel } from "./PlaygroundPanel";
import { SearchApiKeysPanel } from "./SearchApiKeysPanel";
import { SearchIndexesList } from "./SearchIndexesList";
import { SearchUsageCard } from "./SearchUsageCard";
import { SearchUsageCards } from "./SearchUsageCards";
import { WidgetPanel } from "./WidgetPanel";

interface SearchDashboardProps {
	organizationId: string;
	canManage: boolean;
	baseUrl?: string;
}

type TabId = "indexes" | "playground" | "apiKeys" | "widget";

const TAB_IDS: TabId[] = ["indexes", "playground", "apiKeys", "widget"];

export function SearchDashboard({ organizationId, canManage, baseUrl }: SearchDashboardProps) {
	const t = useTranslations();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { data: indexes } = useSearchIndexesQuery(organizationId);

	const activeTab: TabId = (searchParams.get("tab") as TabId) ?? "indexes";
	const [selectedSlug, setSelectedSlug] = useState<string>("");

	const setActiveTab = useCallback(
		(tab: TabId) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set("tab", tab);
			router.replace(`?${params.toString()}`, { scroll: false });
		},
		[router, searchParams],
	);

	// Auto-select first index when slug-dependent tabs are opened
	const handleTabChange = (tab: string) => {
		setActiveTab(tab as TabId);
		if (tab === "apiKeys" || tab === "widget") {
			if (!selectedSlug && indexes && indexes.length > 0) {
				setSelectedSlug(indexes[0].slug);
			}
		}
	};

	return (
		<div className="space-y-6">
			<Tabs value={activeTab} onValueChange={handleTabChange}>
				{/* Header + tab bar */}
				<div className="gap-4 flex flex-wrap items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">{t("search.title")}</h1>
						<p className="text-foreground/60">{t("search.subtitle")}</p>
					</div>
					{canManage && activeTab === "indexes" && (
						<CreateSearchIndexDialog organizationId={organizationId} />
					)}
				</div>

				<TabsList className="mt-4">
					{TAB_IDS.map((tab) => (
						<TabsTrigger key={tab} value={tab}>
							{t(`search.tabs.${tab}`)}
						</TabsTrigger>
					))}
				</TabsList>

				{/* ---- Indexes tab ---- */}
				<TabsContent value="indexes" className="space-y-6">
					<SearchUsageCard organizationId={organizationId} />
					<SearchIndexesList
						organizationId={organizationId}
						onSelect={() => {
							// informational — user can view indices
						}}
					/>
				</TabsContent>

				{/* ---- Playground tab ---- */}
				<TabsContent value="playground" className="space-y-4">
					<PlaygroundPanel organizationId={organizationId} baseUrl={baseUrl} />
				</TabsContent>

				{/* ---- API Keys tab ---- */}
				<TabsContent value="apiKeys" className="space-y-4">
					<div className="max-w-xs">
						<Select value={selectedSlug} onValueChange={setSelectedSlug}>
							<SelectTrigger>
								<SelectValue placeholder={t("search.selectIndex")} />
							</SelectTrigger>
							<SelectContent>
								{(indexes ?? []).map((index) => (
									<SelectItem key={index.id} value={index.slug}>
										{index.displayName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{selectedSlug ? (
						<>
							<SearchUsageCards organizationId={organizationId} />
							<SearchApiKeysPanel
								organizationId={organizationId}
								slug={selectedSlug}
							/>
						</>
					) : (
						<div className="rounded p-6 border text-center text-foreground/60">
							{t("search.selectIndex")}
						</div>
					)}
				</TabsContent>

				{/* ---- Widget tab ---- */}
				<TabsContent value="widget" className="space-y-4">
					<div className="max-w-xs">
						<Select value={selectedSlug} onValueChange={setSelectedSlug}>
							<SelectTrigger>
								<SelectValue placeholder={t("search.selectIndex")} />
							</SelectTrigger>
							<SelectContent>
								{(indexes ?? []).map((index) => (
									<SelectItem key={index.id} value={index.slug}>
										{index.displayName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{selectedSlug ? (
						<WidgetPanel
							organizationId={organizationId}
							slug={selectedSlug}
							baseUrl={baseUrl ?? ""}
						/>
					) : (
						<div className="rounded p-6 border text-center text-foreground/60">
							{t("search.selectIndex")}
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
