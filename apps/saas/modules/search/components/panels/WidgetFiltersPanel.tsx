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

	const [facetConfigs, setFacetConfigs] = useState<FacetConfig[]>([]);

	// Load saved config
	useEffect(() => {
		if (!widgetData?.config) return;
		const cfg = widgetData.config;
		if (cfg.facetFields.length > 0) {
			setFacetConfigs(
				cfg.facetFields.map((name: string) => ({
					fieldName: name,
					displayName: name,
					sortOrder: "count" as const,
					maxValues: 10,
					multiSelect: true,
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
					<p className="text-sm text-muted-foreground">
						{t("widgetConfigurator.noIndexes")}
					</p>
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
			)}

			<Button
				onClick={handleSave}
				loading={saveMutation.isPending}
				className="sm:w-auto w-full"
			>
				{tConfig("saveConfig")}
			</Button>
		</div>
	);
}
