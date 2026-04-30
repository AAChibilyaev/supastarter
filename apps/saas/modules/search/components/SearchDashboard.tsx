"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { CreateSearchIndexDialog } from "./CreateSearchIndexDialog";
import { ImportJobsPanel } from "./ImportJobsPanel";
import { RelevanceTabs } from "./RelevanceTabs";
import { SearchAnalyticsCards } from "./SearchAnalyticsCards";
import { SearchApiKeysPanel } from "./SearchApiKeysPanel";
import { SearchIndexesList } from "./SearchIndexesList";
import { SearchPreview } from "./SearchPreview";
import { SearchUsageCard } from "./SearchUsageCard";
import { SearchUsageCards } from "./SearchUsageCards";
import { WidgetPanel } from "./WidgetPanel";

interface SearchDashboardProps {
	organizationId: string;
	canManage: boolean;
	baseUrl?: string;
}

export function SearchDashboard({ organizationId, canManage, baseUrl }: SearchDashboardProps) {
	const t = useTranslations();
	const [selectedSlug, setSelectedSlug] = useState<string>();
	const [activeTab, setActiveTab] = useState<
		"keys" | "widget" | "analytics" | "relevance" | "importJobs" | "preview"
	>("keys");

	const handleSelect = (slug: string | undefined) => {
		setSelectedSlug(slug);
		setActiveTab("keys");
	};

	return (
		<div className="space-y-6">
			<div className="gap-4 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">{t("search.title")}</h1>
					<p className="text-foreground/60">{t("search.subtitle")}</p>
				</div>
				{canManage && <CreateSearchIndexDialog organizationId={organizationId} />}
			</div>

			<SearchUsageCard organizationId={organizationId} />

			{/* Analytics overview (no index selected) */}
			<SearchAnalyticsCards organizationId={organizationId} />

			<div className="gap-6 lg:grid-cols-[2fr_3fr] grid">
				<SearchIndexesList
					organizationId={organizationId}
					onSelect={handleSelect}
					selectedSlug={selectedSlug}
				/>
				{selectedSlug ? (
					<div className="space-y-4">
						<SearchUsageCards organizationId={organizationId} />
						<div className="gap-2 flex border-b">
							<button
								type="button"
								className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "keys"
										? "border-primary text-primary"
										: "border-transparent text-foreground/60 hover:text-foreground"
								}`}
								onClick={() => setActiveTab("keys")}
							>
								{t("search.apiKeys.title")}
							</button>
							<button
								type="button"
								className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "widget"
										? "border-primary text-primary"
										: "border-transparent text-foreground/60 hover:text-foreground"
								}`}
								onClick={() => setActiveTab("widget")}
							>
								{t("search.widget.tab")}
							</button>
							<button
								type="button"
								className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "analytics"
										? "border-primary text-primary"
										: "border-transparent text-foreground/60 hover:text-foreground"
								}`}
								onClick={() => setActiveTab("analytics")}
							>
								{t("search.analytics.tab")}
							</button>
							<button
								type="button"
								className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "relevance"
										? "border-primary text-primary"
										: "border-transparent text-foreground/60 hover:text-foreground"
								}`}
								onClick={() => setActiveTab("relevance")}
							>
								{t("search.relevance.tab")}
							</button>
							<button
								type="button"
								className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "importJobs"
										? "border-primary text-primary"
										: "border-transparent text-foreground/60 hover:text-foreground"
								}`}
								onClick={() => setActiveTab("importJobs")}
							>
								{t("search.importJobs.tab")}
							</button>
							<button
								type="button"
								className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "preview"
										? "border-primary text-primary"
										: "border-transparent text-foreground/60 hover:text-foreground"
								}`}
								onClick={() => setActiveTab("preview")}
							>
								{t("search.preview.tab")}
							</button>
						</div>

						{activeTab === "keys" ? (
							<SearchApiKeysPanel
								organizationId={organizationId}
								slug={selectedSlug}
							/>
						) : activeTab === "widget" ? (
							<WidgetPanel
								organizationId={organizationId}
								slug={selectedSlug}
								baseUrl={baseUrl ?? ""}
							/>
						) : activeTab === "analytics" ? (
							<SearchAnalyticsCards organizationId={organizationId} />
						) : activeTab === "relevance" ? (
							<RelevanceTabs organizationId={organizationId} slug={selectedSlug} />
						) : activeTab === "importJobs" ? (
							<ImportJobsPanel organizationId={organizationId} slug={selectedSlug} />
						) : activeTab === "preview" ? (
							<SearchPreview organizationId={organizationId} slug={selectedSlug} />
						) : null}
					</div>
				) : (
					<div className="rounded p-6 border text-center text-foreground/60">
						{t("search.selectIndex")}
					</div>
				)}
			</div>
		</div>
	);
}
