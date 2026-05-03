"use client";

import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Slider } from "@repo/ui/components/slider";
import { Switch } from "@repo/ui/components/switch";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface WidgetAutocompletePanelProps {
	organizationId: string;
}

export function WidgetAutocompletePanel({ organizationId }: WidgetAutocompletePanelProps) {
	const t = useTranslations("search");
	const queryClient = useQueryClient();
	const [selectedIndexSlug, setSelectedIndexSlug] = useState("");

	// Load indexes
	const { data: indexes, isLoading: indexesLoading } = useQuery(
		orpc.search.listIndexes.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	// Load widget config
	const { data: widgetData } = useQuery(
		orpc.search.widgetConfig.queryOptions({
			input: { organizationId, indexSlug: selectedIndexSlug },
			enabled: !!organizationId && !!selectedIndexSlug,
		}),
	);

	// Autocomplete settings state
	const [enabled, setEnabled] = useState(true);
	const [source, setSource] = useState<"analytics" | "instant">("analytics");
	const [resultCount, setResultCount] = useState(5);
	const [debounceDelay, setDebounceDelay] = useState(200);
	const [minQueryLength, setMinQueryLength] = useState(2);
	const [showThumbnails, setShowThumbnails] = useState(false);
	const [highlightText, setHighlightText] = useState(true);
	const [showRecent, setShowRecent] = useState(false);

	// Auto-select first index
	useEffect(() => {
		if (!selectedIndexSlug && indexes && indexes.length > 0) {
			setSelectedIndexSlug(indexes[0].slug);
		}
	}, [indexes, selectedIndexSlug]);

	// Load saved config
	useEffect(() => {
		if (!widgetData?.config) return;
		const cfg = widgetData.config;
		setEnabled(cfg.autocompleteEnabled ?? true);
		setSource((cfg.autocompleteSource as "analytics" | "instant") ?? "analytics");
		setResultCount(cfg.autocompleteResults ?? 5);
		setDebounceDelay(cfg.autocompleteDebounce ?? 200);
		setMinQueryLength(cfg.autocompleteMinQuery ?? 2);
		setShowThumbnails(cfg.autocompleteThumbnails ?? false);
		setHighlightText(cfg.autocompleteHighlight ?? true);
		setShowRecent(cfg.autocompleteRecent ?? false);
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
				autocompleteEnabled: enabled,
				autocompleteSource: source,
				autocompleteResults: resultCount,
				autocompleteDebounce: debounceDelay,
				autocompleteMinQuery: minQueryLength,
				autocompleteThumbnails: showThumbnails,
				autocompleteHighlight: highlightText,
				autocompleteRecent: showRecent,
				facetFields: widgetData?.config.facetFields ?? [],
				facetConfigs: widgetData?.config.facetConfigs ?? [],
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
				<Skeleton className="h-80 w-full" />
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
			<div className="gap-3 flex items-center">
				<Label htmlFor="autocomplete-index" className="shrink-0">
					{t("widgetConfigurator.selectIndex")}
				</Label>
				<Select value={selectedIndexSlug} onValueChange={setSelectedIndexSlug}>
					<SelectTrigger id="autocomplete-index" className="w-72">
						<SelectValue placeholder={t("widgetConfigurator.selectIndexPlaceholder")} />
					</SelectTrigger>
					<SelectContent>
						{(indexes ?? []).map((idx) => (
							<SelectItem key={idx.slug} value={idx.slug}>
								{idx.displayName ?? idx.slug}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="gap-6 lg:grid-cols-2 grid">
				<Card className="shadow-sm">
					<CardHeader>
						<CardTitle className="text-base">{t("widget.autocompleteTitle")}</CardTitle>
						<CardDescription>{t("widget.autocompleteDesc")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="gap-3 flex items-center justify-between">
							<Label htmlFor="ac-enable">{t("widget.autocompleteEnable")}</Label>
							<Switch id="ac-enable" checked={enabled} onCheckedChange={setEnabled} />
						</div>

						{enabled && (
							<>
								<div className="space-y-2">
									<Label>{t("widget.autocompleteSource")}</Label>
									<Select
										value={source}
										onValueChange={(v) => setSource(v as "analytics" | "instant")}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="analytics">
												{t("widget.autocompleteSourceAnalytics")}
											</SelectItem>
											<SelectItem value="instant">
												{t("widget.autocompleteSourceInstant")}
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<div className="gap-2 flex items-center justify-between">
										<Label htmlFor="ac-results">{t("widget.autocompleteResults")}</Label>
										<span className="text-sm font-mono text-foreground/60 tabular-nums">
											{resultCount}
										</span>
									</div>
									<Slider
										id="ac-results"
										value={[resultCount]}
										onValueChange={([v]) => setResultCount(v)}
										min={3}
										max={10}
										step={1}
										disabled={!enabled}
									/>
								</div>

								<div className="space-y-2">
									<div className="gap-2 flex items-center justify-between">
										<Label htmlFor="ac-debounce">{t("widget.autocompleteDebounce")}</Label>
										<span className="text-sm font-mono text-foreground/60 tabular-nums">
											{debounceDelay}ms
										</span>
									</div>
									<Slider
										id="ac-debounce"
										value={[debounceDelay]}
										onValueChange={([v]) => setDebounceDelay(v)}
										min={100}
										max={500}
										step={50}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="ac-min-query">{t("widget.autocompleteMinQuery")}</Label>
									<div className="gap-2 flex">
										{[1, 2, 3].map((n) => (
											<Button
												key={n}
												variant={minQueryLength === n ? "default" : "outline"}
												size="sm"
												onClick={() => setMinQueryLength(n)}
												className="w-12"
											>
												{n}
											</Button>
										))}
									</div>
								</div>

								<div className="gap-3 flex items-center justify-between">
									<Label htmlFor="ac-thumbnails">{t("widget.autocompleteThumbnails")}</Label>
									<Switch
										id="ac-thumbnails"
										checked={showThumbnails}
										onCheckedChange={setShowThumbnails}
									/>
								</div>

								<div className="gap-3 flex items-center justify-between">
									<Label htmlFor="ac-highlight">{t("widget.autocompleteHighlight")}</Label>
									<Switch
										id="ac-highlight"
										checked={highlightText}
										onCheckedChange={setHighlightText}
									/>
								</div>

								<div className="gap-3 flex items-center justify-between">
									<Label htmlFor="ac-recent">{t("widget.autocompleteRecent")}</Label>
									<Switch id="ac-recent" checked={showRecent} onCheckedChange={setShowRecent} />
								</div>
							</>
						)}

						<Button onClick={handleSave} loading={saveMutation.isPending} className="w-full">
							{t("widgetConfigurator.saveConfig")}
						</Button>
					</CardContent>
				</Card>

				<Card className="shadow-sm">
					<CardHeader>
						<CardTitle className="text-base">{t("widgetConfigurator.previewTitle")}</CardTitle>
						<CardDescription>{t("widgetConfigurator.previewDesc")}</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="p-6 min-h-80 space-y-3 rounded-lg border bg-background">
							<div className="gap-2 px-3 py-2 flex items-center rounded-lg border">
								<svg
									className="size-4 shrink-0 text-foreground/40"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
								<span className="text-sm flex-1 text-foreground/50">Search...</span>
							</div>

							{enabled && (
								<div className="p-2 space-y-1 shadow-sm rounded-lg border bg-background">
									{[1, 2, 3, 4, 5].slice(0, resultCount).map((i) => (
										<div
											key={i}
											className="gap-2 p-2 rounded flex cursor-pointer items-center hover:bg-muted"
										>
											{showThumbnails && (
												<div className="size-8 rounded shrink-0 bg-foreground/10" />
											)}
											<div className="min-w-0 flex-1">
												<div className="h-2.5 rounded w-3/4 bg-foreground/15" />
												{highlightText && (
													<div className="h-2 rounded mt-1.5 w-1/2 bg-foreground/8" />
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
