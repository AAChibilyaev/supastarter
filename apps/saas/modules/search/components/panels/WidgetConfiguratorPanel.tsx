"use client";

import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
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
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useSearchIndexesQuery } from "../../lib/api";

interface WidgetConfiguratorPanelProps {
	organizationId: string;
}

type Theme = "light" | "dark" | "auto";

function buildEmbedSnippet({
	baseUrl,
	indexSlug,
	apiKeyPrefix,
	config,
}: {
	baseUrl: string;
	indexSlug: string;
	apiKeyPrefix: string;
	config: {
		theme: string;
		placeholder: string;
		resultsPerPage: number;
		showThumbnails: boolean;
		showSearchButton: boolean;
		searchButtonText: string;
		accentColor: string;
		keyboardShortcut: boolean;
	};
}) {
	const lines = [
		`<script`,
		`  src="${baseUrl}/api/widget/widget.js"`,
		`  data-base-url="${baseUrl}"`,
		`  data-api-key="${apiKeyPrefix}***"`,
		`  data-index-slug="${indexSlug}"`,
		`  data-container="#aac-search"`,
		`  data-theme="${config.theme}"`,
		`  data-placeholder="${config.placeholder}"`,
		`  data-results-per-page="${config.resultsPerPage}"`,
		`  data-accent-color="${config.accentColor}"`,
	];
	if (!config.showThumbnails) lines.push(`  data-show-thumbnails="false"`);
	if (!config.showSearchButton) lines.push(`  data-show-search-button="false"`);
	if (config.searchButtonText !== "Search")
		lines.push(`  data-search-button-text="${config.searchButtonText}"`);
	if (!config.keyboardShortcut) lines.push(`  data-keyboard-shortcut="false"`);
	lines.push(`></script>`);
	return lines.join("\n");
}

const DEFAULT_CONFIG = {
	theme: "auto" as Theme,
	placeholder: "Search...",
	resultsPerPage: 20,
	showThumbnails: true,
	showSearchButton: true,
	searchButtonText: "Search",
	accentColor: "#6366f1",
	keyboardShortcut: true,
	queryBy: [] as string[],
};

export function WidgetConfiguratorPanel({ organizationId }: WidgetConfiguratorPanelProps) {
	const t = useTranslations("search.widgetConfigurator");
	const tCommon = useTranslations("search");
	const queryClient = useQueryClient();
	const [selectedIndexSlug, setSelectedIndexSlug] = useState<string>("");

	// Config state
	const [theme, setTheme] = useState<Theme>(DEFAULT_CONFIG.theme);
	const [placeholder, setPlaceholder] = useState(DEFAULT_CONFIG.placeholder);
	const [resultsPerPage, setResultsPerPage] = useState(DEFAULT_CONFIG.resultsPerPage);
	const [showThumbnails, setShowThumbnails] = useState(DEFAULT_CONFIG.showThumbnails);
	const [showSearchButton, setShowSearchButton] = useState(DEFAULT_CONFIG.showSearchButton);
	const [searchButtonText, setSearchButtonText] = useState(DEFAULT_CONFIG.searchButtonText);
	const [accentColor, setAccentColor] = useState(DEFAULT_CONFIG.accentColor);
	const [keyboardShortcut, setKeyboardShortcut] = useState(DEFAULT_CONFIG.keyboardShortcut);
	const [queryBy, setQueryBy] = useState<string[]>([]);

	// Data
	const { data: indexes, isLoading: indexesLoading } = useSearchIndexesQuery(organizationId);

	const { data: widgetData, isLoading: widgetLoading } = useQuery(
		orpc.search.widgetConfig.queryOptions({
			input: { organizationId, indexSlug: selectedIndexSlug },
			enabled: !!organizationId && !!selectedIndexSlug,
		}),
	);

	const { data: schemaData } = useQuery(
		orpc.search.schema.get.queryOptions({
			input: { organizationId, slug: selectedIndexSlug },
			enabled: !!organizationId && !!selectedIndexSlug,
		}),
	);

	const searchableFields = useMemo(
		() => (schemaData?.fields ?? []).filter((f) => f.index).map((f) => f.name),
		[schemaData],
	);

	const baseUrl = widgetData?.baseUrl ?? "";

	// Load config when widget data arrives
	useEffect(() => {
		if (!widgetData) return;
		const c = widgetData.config;
		setTheme(c.theme as Theme);
		setPlaceholder(c.placeholder ?? DEFAULT_CONFIG.placeholder);
		setResultsPerPage(c.resultsPerPage ?? DEFAULT_CONFIG.resultsPerPage);
		setShowThumbnails(c.showThumbnails ?? DEFAULT_CONFIG.showThumbnails);
		setShowSearchButton(c.showSearchButton ?? DEFAULT_CONFIG.showSearchButton);
		setSearchButtonText(c.searchButtonText ?? DEFAULT_CONFIG.searchButtonText);
		setAccentColor(c.accentColor ?? DEFAULT_CONFIG.accentColor);
		setKeyboardShortcut(c.keyboardShortcut ?? DEFAULT_CONFIG.keyboardShortcut);
		setQueryBy(c.queryBy ?? DEFAULT_CONFIG.queryBy);
	}, [widgetData]);

	// Select first index by default
	useEffect(() => {
		if (!selectedIndexSlug && indexes && indexes.length > 0) {
			setSelectedIndexSlug(indexes[0].slug);
		}
	}, [indexes, selectedIndexSlug]);

	const apiKeyPrefix = widgetData?.apiKeyPrefix ?? "ss_search_";

	const snippet = useMemo(() => {
		if (!selectedIndexSlug) return "";
		return buildEmbedSnippet({
			baseUrl,
			indexSlug: selectedIndexSlug,
			apiKeyPrefix,
			config: {
				theme,
				placeholder,
				resultsPerPage,
				showThumbnails,
				showSearchButton,
				searchButtonText,
				accentColor,
				keyboardShortcut,
			},
		});
	}, [
		baseUrl,
		selectedIndexSlug,
		apiKeyPrefix,
		theme,
		placeholder,
		resultsPerPage,
		showThumbnails,
		showSearchButton,
		searchButtonText,
		accentColor,
		keyboardShortcut,
	]);

	const saveMutation = useMutation({
		...orpc.search.saveWidgetConfig.mutationOptions(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: orpc.search.widgetConfig.key() });
			toast.success(tCommon("widget.saved"));
		},
		onError: () => toast.error(tCommon("widget.saveFailed")),
	});

	const handleSave = () => {
		if (!selectedIndexSlug) return;
		saveMutation.mutate({
			organizationId,
			slug: selectedIndexSlug,
			config: {
				theme,
				placeholder,
				resultsPerPage,
				showThumbnails,
				showSearchButton,
				searchButtonText,
				accentColor,
				keyboardShortcut,
				// Preserve existing fields from saved config
				facetFields: widgetData?.config.facetFields ?? [],
				defaultSortField: widgetData?.config.defaultSortField,
				showPrices: widgetData?.config.showPrices ?? true,
				showImages: widgetData?.config.showImages ?? true,
				queryBy,
			},
		});
	};

	if (indexesLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-64" />
				<div className="gap-4 lg:grid-cols-2 grid">
					<Skeleton className="h-96" />
					<Skeleton className="h-96" />
				</div>
			</div>
		);
	}

	if (!indexes || indexes.length === 0) {
		return (
			<Card>
				<CardContent className="gap-4 py-12 flex flex-col items-center text-center">
					<p className="text-lg font-medium">{t("noIndexes")}</p>
					<p className="text-sm text-foreground/60">{t("noIndexesDesc")}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Index selector */}
			<div className="gap-3 flex items-center">
				<Label htmlFor="index-select" className="shrink-0">
					{t("selectIndex")}
				</Label>
				<Select value={selectedIndexSlug} onValueChange={setSelectedIndexSlug}>
					<SelectTrigger id="index-select" className="w-72">
						<SelectValue placeholder={t("selectIndexPlaceholder")} />
					</SelectTrigger>
					<SelectContent>
						{indexes.map((idx) => (
							<SelectItem key={idx.slug} value={idx.slug}>
								{idx.displayName ?? idx.slug}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="gap-6 lg:grid-cols-2 grid">
				{/* Left column: Settings */}
				<Card className="shadow-sm">
					<CardHeader>
						<CardTitle className="text-base">{t("settingsTitle")}</CardTitle>
						<CardDescription>{t("settingsDesc")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Theme */}
						<div className="space-y-2">
							<Label>{t("theme")}</Label>
							<div className="gap-2 flex">
								<Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
									<SelectTrigger className="w-40">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="auto">{t("themeAuto")}</SelectItem>
										<SelectItem value="light">{t("themeLight")}</SelectItem>
										<SelectItem value="dark">{t("themeDark")}</SelectItem>
									</SelectContent>
								</Select>
								<div className="gap-2 flex items-center">
									<Label htmlFor="accent-color" className="sr-only">
										{t("accentColor")}
									</Label>
									<Input
										id="accent-color"
										type="color"
										value={accentColor}
										onChange={(e) => setAccentColor(e.target.value)}
										className="size-10 w-16 p-1 cursor-pointer"
									/>
									<Input
										value={accentColor}
										onChange={(e) => setAccentColor(e.target.value)}
										className="w-28 font-mono text-xs"
									/>
								</div>
							</div>
						</div>

						{/* Placeholder */}
						<div className="space-y-2">
							<Label htmlFor="placeholder">{t("placeholder")}</Label>
							<Input
								id="placeholder"
								value={placeholder}
								onChange={(e) => setPlaceholder(e.target.value)}
								placeholder={DEFAULT_CONFIG.placeholder}
							/>
						</div>

						{/* Results per page */}
						<div className="space-y-2">
							<div className="gap-2 flex items-center justify-between">
								<Label htmlFor="results-per-page">{t("resultsPerPage")}</Label>
								<span className="text-sm font-mono text-foreground/60 tabular-nums">
									{resultsPerPage}
								</span>
							</div>
							<Slider
								id="results-per-page"
								value={[resultsPerPage]}
								onValueChange={([v]) => setResultsPerPage(v)}
								min={5}
								max={50}
								step={5}
							/>
						</div>

						{/* Show thumbnails */}
						<div className="gap-3 flex items-center justify-between">
							<Label htmlFor="show-thumbnails">{t("showThumbnails")}</Label>
							<Switch
								id="show-thumbnails"
								checked={showThumbnails}
								onCheckedChange={setShowThumbnails}
							/>
						</div>

						{/* Search button */}
						<div className="space-y-3">
							<div className="gap-3 flex items-center justify-between">
								<Label htmlFor="show-search-button">{t("showSearchButton")}</Label>
								<Switch
									id="show-search-button"
									checked={showSearchButton}
									onCheckedChange={setShowSearchButton}
								/>
							</div>
							{showSearchButton && (
								<Input
									value={searchButtonText}
									onChange={(e) => setSearchButtonText(e.target.value)}
									placeholder={DEFAULT_CONFIG.searchButtonText}
								/>
							)}
						</div>

						{/* Keyboard shortcut */}
						<div className="gap-3 flex items-center justify-between">
							<Label htmlFor="keyboard-shortcut">{t("keyboardShortcut")}</Label>
							<Switch
								id="keyboard-shortcut"
								checked={keyboardShortcut}
								onCheckedChange={setKeyboardShortcut}
							/>
						</div>

						{/* Searchable fields */}
						<div className="space-y-2">
							<Label>{t("queryBy")}</Label>
							{searchableFields.length > 0 ? (
								<div className="gap-2 flex flex-wrap">
									{searchableFields.map((field) => (
										<label
											key={field}
											className="gap-2 px-3 py-1.5 text-sm flex cursor-pointer items-center rounded-md border border-foreground/10 hover:bg-foreground/5"
										>
											<input
												type="checkbox"
												className="size-4 accent-[var(--color-primary)]"
												checked={queryBy.includes(field)}
												onChange={() => {
													setQueryBy((prev) =>
														prev.includes(field)
															? prev.filter((f) => f !== field)
															: [...prev, field],
													);
												}}
											/>
											<span className="font-mono text-xs">{field}</span>
										</label>
									))}
								</div>
							) : (
								<p className="text-sm text-foreground/50">{t("noSearchableFields")}</p>
							)}
						</div>

						<Button onClick={handleSave} loading={saveMutation.isPending} className="w-full">
							{t("saveConfig")}
						</Button>
					</CardContent>
				</Card>

				{/* Right column: Live Preview */}
				<Card className="shadow-sm">
					<CardHeader>
						<CardTitle className="text-base">{t("previewTitle")}</CardTitle>
						<CardDescription>{t("previewDesc")}</CardDescription>
					</CardHeader>
					<CardContent>
						{widgetLoading ? (
							<Skeleton className="h-80 w-full" />
						) : selectedIndexSlug ? (
							<div className="space-y-4">
								<div
									className="p-8 min-h-80 flex items-center justify-center rounded-lg border transition-colors"
									style={
										{
											"--accent-color": accentColor,
											backgroundColor:
												theme === "dark" ? "#1a1a2e" : theme === "light" ? "#ffffff" : undefined,
										} as React.CSSProperties
									}
								>
									<div className="max-w-md space-y-4 w-full">
										{/* Simulated search input */}
										<div className="gap-2 px-3 py-2 shadow-sm flex items-center rounded-lg border bg-background">
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
											<span className="text-sm text-foreground/50">
												{placeholder || "Search..."}
											</span>
											{keyboardShortcut && (
												<span className="rounded px-1.5 py-0.5 text-xs font-mono ml-auto border bg-muted text-foreground/40">
													⌘K
												</span>
											)}
											{showSearchButton && (
												<Button
													size="sm"
													className="shrink-0"
													style={{ backgroundColor: accentColor }}
												>
													{searchButtonText || "Search"}
												</Button>
											)}
										</div>

										{/* Simulated results */}
										<div className="space-y-3">
											<div className="gap-3 flex items-start">
												{showThumbnails && (
													<div className="size-12 shrink-0 rounded-md bg-foreground/10" />
												)}
												<div className="min-w-0 space-y-1.5 flex-1">
													<div className="h-3 rounded w-3/4 bg-foreground/15" />
													<div className="h-2.5 rounded w-full bg-foreground/8" />
													<div className="h-2.5 rounded w-1/2 bg-foreground/8" />
												</div>
											</div>
											<div className="gap-3 flex items-start">
												{showThumbnails && (
													<div className="size-12 shrink-0 rounded-md bg-foreground/10" />
												)}
												<div className="min-w-0 space-y-1.5 flex-1">
													<div className="h-3 rounded w-2/3 bg-foreground/15" />
													<div className="h-2.5 rounded w-full bg-foreground/8" />
													<div className="h-2.5 rounded w-2/3 bg-foreground/8" />
												</div>
											</div>
											<div className="gap-3 flex items-start">
												{showThumbnails && (
													<div className="size-12 shrink-0 rounded-md bg-foreground/10" />
												)}
												<div className="min-w-0 space-y-1.5 flex-1">
													<div className="h-3 rounded w-5/6 bg-foreground/15" />
													<div className="h-2.5 rounded w-full bg-foreground/8" />
													<div className="h-2.5 rounded w-1/3 bg-foreground/8" />
												</div>
											</div>
										</div>
									</div>
								</div>

								{/* Embed snippet */}
								<div className="space-y-2">
									<Label>{tCommon("widget.snippet")}</Label>
									<pre className="max-h-32 p-3 font-mono text-xs overflow-auto rounded-lg border bg-muted text-muted-foreground">
										{snippet || t("noIndexSelected")}
									</pre>
								</div>
							</div>
						) : (
							<div className="h-80 flex items-center justify-center">
								<p className="text-sm text-foreground/50">{t("noIndexSelected")}</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
