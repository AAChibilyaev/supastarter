"use client";

import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { FacetsPanel } from "@search/components/panels/FacetsPanel";
import type { FacetConfig } from "@search/components/panels/FacetsPanel";
import { useSearchIndexesQuery } from "@search/lib/api";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface WidgetFiltersPanelProps {
	organizationId: string;
}

export function WidgetFiltersPanel({ organizationId }: WidgetFiltersPanelProps) {
	const t = useTranslations("search");
	const tConfig = useTranslations("search.configurator");
	const queryClient = useQueryClient();

	const { data: indexes, isLoading: indexesLoading } = useSearchIndexesQuery(organizationId);
	const [selectedIndexSlug, setSelectedIndexSlug] = useState("");

	// Auto-select first index
	useEffect(() => {
		if (!selectedIndexSlug && indexes && indexes.length > 0) {
			setSelectedIndexSlug(indexes[0].slug);
		}
	}, [indexes, selectedIndexSlug]);

	// Load schema for facetable fields
	const { data: schemaData, isLoading: schemaLoading } = useQuery(
		orpc.search.schema.get.queryOptions({
			input: { organizationId, slug: selectedIndexSlug },
			enabled: !!organizationId && !!selectedIndexSlug,
		}),
	);

	// Load existing widget config
	const { data: widgetData } = useQuery(
		orpc.search.widgetConfig.queryOptions({
			input: { organizationId, indexSlug: selectedIndexSlug },
			enabled: !!organizationId && !!selectedIndexSlug,
		}),
	);

	const facetableFields = useMemo(
		() => (schemaData?.fields ?? []).filter((f) => f.facet).map((f) => f.name),
		[schemaData],
	);

	// Numeric facetable fields (candidates for range slider)
	const numericFacetableFields = useMemo(
		() =>
			(schemaData?.fields ?? []).filter(
				(f) => f.facet && (f.type === "float" || f.type === "int32" || f.type === "int64"),
			),
		[schemaData],
	);

	const [facetConfigs, setFacetConfigs] = useState<FacetConfig[]>([]);

	// Load saved config from API (facetConfigs takes priority, fallback to facetFields)
	useEffect(() => {
		if (!widgetData?.config) return;
		const cfg = widgetData.config;

		if (cfg.facetConfigs && cfg.facetConfigs.length > 0) {
			// Full configs available — use them directly
			setFacetConfigs(cfg.facetConfigs);
		} else if (cfg.facetFields && cfg.facetFields.length > 0) {
			// Legacy format — migrate facetFields to facetConfigs
			setFacetConfigs(
				cfg.facetFields.map((name: string) => ({
					fieldName: name,
					displayName: name,
					sortOrder: "count" as const,
					maxValues: 10,
					multiSelect: true,
					type: "checkbox" as const,
					collapsible: true,
				})),
			);
		} else {
			setFacetConfigs([]);
		}
	}, [widgetData]);

	const saveMutation = useMutation({
		...orpc.search.saveWidgetConfig.mutationOptions(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: orpc.search.widgetConfig.key() });
			toast.success(t("widget.saved"));
		},
		onError: () => toast.error(t("widget.saveFailed")),
	});

	const handleSave = () => {
		if (!selectedIndexSlug) return;
		saveMutation.mutate({
			organizationId,
			slug: selectedIndexSlug,
			config: {
				facetFields: facetConfigs.map((c) => c.fieldName),
				facetConfigs,
				theme: widgetData?.config.theme ?? "auto",
				placeholder: widgetData?.config.placeholder ?? "Search...",
				resultsPerPage: widgetData?.config.resultsPerPage ?? 20,
				showThumbnails: widgetData?.config.showThumbnails ?? true,
				showSearchButton: widgetData?.config.showSearchButton ?? true,
				searchButtonText: widgetData?.config.searchButtonText ?? "Search",
				accentColor: widgetData?.config.accentColor ?? "#6366f1",
				keyboardShortcut: widgetData?.config.keyboardShortcut ?? true,
				defaultSortField: widgetData?.config.defaultSortField,
				showPrices: widgetData?.config.showPrices ?? true,
				showImages: widgetData?.config.showImages ?? true,
				queryBy: widgetData?.config.queryBy ?? [],
				autocompleteEnabled: widgetData?.config.autocompleteEnabled ?? true,
				autocompleteSource: widgetData?.config.autocompleteSource ?? "analytics",
				autocompleteResults: widgetData?.config.autocompleteResults ?? 5,
				autocompleteDebounce: widgetData?.config.autocompleteDebounce ?? 200,
				autocompleteMinQuery: widgetData?.config.autocompleteMinQuery ?? 2,
				autocompleteThumbnails: widgetData?.config.autocompleteThumbnails ?? false,
				autocompleteHighlight: widgetData?.config.autocompleteHighlight ?? true,
				autocompleteRecent: widgetData?.config.autocompleteRecent ?? false,
				voiceEnabled: widgetData?.config.voiceEnabled ?? false,
				voiceLanguage: widgetData?.config.voiceLanguage ?? "auto",
				voiceTrigger: widgetData?.config.voiceTrigger ?? "mic",
				voiceFallbackMessage: widgetData?.config.voiceFallbackMessage ?? "",
			},
		});
	};

	if (indexesLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-64" />
			</div>
		);
	}

	if (!indexes || indexes.length === 0) {
		return (
			<Card>
				<CardContent className="py-12 flex flex-col items-center text-center">
					<p className="text-sm text-muted-foreground">{t("widgetConfigurator.noIndexes")}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Index selector */}
			<div className="gap-3 flex items-center">
				<label className="text-sm font-medium shrink-0">
					{t("widgetConfigurator.selectIndex")}
				</label>
				<select
					value={selectedIndexSlug}
					onChange={(e) => setSelectedIndexSlug(e.target.value)}
					className="w-72 h-10 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<option value="" disabled>
						{t("widgetConfigurator.selectIndexPlaceholder")}
					</option>
					{(indexes ?? []).map((idx) => (
						<option key={idx.slug} value={idx.slug}>
							{idx.displayName ?? idx.slug}
						</option>
					))}
				</select>
			</div>

			{schemaLoading ? (
				<Skeleton className="h-64 rounded-lg" />
			) : (
				<>
					{/* Facet filters card */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">
								{tConfig("facetSettingsTitle") ?? "Facet Filters"}
							</CardTitle>
							<CardDescription>
								{tConfig("facetSettingsDesc") ??
									"Configure which fields appear as filters in the search widget."}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<FacetsPanel
								facetFields={facetableFields}
								configs={facetConfigs}
								onChange={setFacetConfigs}
							/>
						</CardContent>
					</Card>

					{/* Price Range Filter card — only if numeric facet fields exist */}
					{numericFacetableFields.length > 0 && (
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">
									{tConfig("facetSettingsTitle") ?? "Price Range Filter"}
								</CardTitle>
								<CardDescription>
									Configure range sliders for numeric fields. Select a field above and set its type
									to &quot;Range Slider&quot; to enable min/max and format options.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									Numeric facet fields available:{" "}
									<span className="font-medium">
										{numericFacetableFields.map((f) => f.name).join(", ")}
									</span>
								</p>
								<p className="mt-2 text-xs text-muted-foreground">
									Tip: Set a facet's type to &quot;Range Slider&quot; above, then configure its min,
									max, and display format.
								</p>
							</CardContent>
						</Card>
					)}
				</>
			)}

			<Button onClick={handleSave} loading={saveMutation.isPending} className="sm:w-auto w-full">
				{tConfig("saveConfig")}
			</Button>
		</div>
	);
}
