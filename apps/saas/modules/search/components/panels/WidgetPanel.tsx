"use client";

import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface WidgetPanelProps {
	slug: string;
	organizationId: string;
	baseUrl: string;
}

type Theme = "light" | "dark" | "auto";

function buildSnippet({
	baseUrl,
	slug,
	apiKeyPrefix,
	facetFields,
	defaultSortField,
	showPrices,
	showImages,
	theme,
}: {
	baseUrl: string;
	slug: string;
	apiKeyPrefix: string;
	facetFields: string[];
	defaultSortField: string;
	showPrices: boolean;
	showImages: boolean;
	theme: Theme;
}) {
	const lines = [
		`<script`,
		`  src="${baseUrl}/api/widget/widget.js"`,
		`  data-base-url="${baseUrl}"`,
		`  data-api-key="${apiKeyPrefix}***"`,
		`  data-index-slug="${slug}"`,
		`  data-container="#aac-search"`,
		`  data-theme="${theme}"`,
	];
	if (facetFields.length > 0) lines.push(`  data-facets="${facetFields.join(",")}"`);
	if (defaultSortField) lines.push(`  data-sort="${defaultSortField}"`);
	if (!showPrices) lines.push(`  data-show-prices="false"`);
	if (!showImages) lines.push(`  data-show-images="false"`);
	lines.push(`></script>`);
	return lines.join("\n");
}

export function WidgetPanel({ slug, organizationId, baseUrl }: WidgetPanelProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const { data: widgetData } = useQuery(
		orpc.search.widgetConfig.queryOptions({
			input: { organizationId, indexSlug: slug },
			enabled: !!slug && !!organizationId,
		}),
	);

	const { data: schemaData } = useQuery(
		orpc.search.schema.get.queryOptions({
			input: { organizationId, slug },
			enabled: !!slug && !!organizationId,
		}),
	);

	const facetableFields = useMemo(
		() => (schemaData?.fields ?? []).filter((f) => f.facet).map((f) => f.name),
		[schemaData],
	);

	const sortableFields = useMemo(
		() => (schemaData?.fields ?? []).filter((f) => f.sort).map((f) => f.name),
		[schemaData],
	);

	const [facetFields, setFacetFields] = useState<string[]>([]);
	const [defaultSortField, setDefaultSortField] = useState("");
	const [showPrices, setShowPrices] = useState(true);
	const [showImages, setShowImages] = useState(true);
	const [theme, setTheme] = useState<Theme>("auto");

	useEffect(() => {
		if (!widgetData) return;
		setFacetFields(widgetData.config.facetFields);
		setDefaultSortField(widgetData.config.defaultSortField ?? "");
		setShowPrices(widgetData.config.showPrices);
		setShowImages(widgetData.config.showImages);
		setTheme(widgetData.config.theme);
	}, [widgetData]);

	const apiKeyPrefix = widgetData?.apiKeyPrefix ?? "ss_search_";

	const snippet = useMemo(
		() =>
			buildSnippet({
				baseUrl,
				slug,
				apiKeyPrefix,
				facetFields,
				defaultSortField,
				showPrices,
				showImages,
				theme,
			}),
		[baseUrl, slug, apiKeyPrefix, facetFields, defaultSortField, showPrices, showImages, theme],
	);

	const saveMutation = useMutation({
		...orpc.search.saveWidgetConfig.mutationOptions(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: orpc.search.widgetConfig.key() });
			toast.success(t("search.widget.saved"));
		},
		onError: () => toast.error(t("search.widget.saveFailed")),
	});

	const copySnippet = () => {
		navigator.clipboard.writeText(snippet).then(
			() => toast.success(t("search.widget.copied")),
			() => toast.error(t("search.widget.copyFailed")),
		);
	};

	const handleFacetToggle = (field: string, checked: boolean) => {
		setFacetFields((prev) => (checked ? [...prev, field] : prev.filter((f) => f !== field)));
	};

	const handleSave = () => {
		saveMutation.mutate({
			organizationId,
			slug,
			config: {
				facetFields,
				defaultSortField: defaultSortField || undefined,
				showPrices,
				showImages,
				theme,
			},
		});
	};

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="pb-4">
					<CardTitle>{t("search.widget.configureTitle")}</CardTitle>
					<CardDescription>{t("search.widget.configureDescription")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{facetableFields.length > 0 && (
						<div className="space-y-2">
							<Label>{t("search.widget.facetFields")}</Label>
							<div className="gap-3 flex flex-wrap">
								{facetableFields.map((field) => (
									<label
										key={field}
										className="gap-2 flex cursor-pointer items-center"
									>
										<Checkbox
											checked={facetFields.includes(field)}
											onCheckedChange={(checked) =>
												handleFacetToggle(field, !!checked)
											}
										/>
										<span className="text-sm font-mono">{field}</span>
									</label>
								))}
							</div>
						</div>
					)}

					{sortableFields.length > 0 && (
						<div className="space-y-2">
							<Label htmlFor="default-sort">{t("search.widget.defaultSort")}</Label>
							<Select
								value={defaultSortField || "__none__"}
								onValueChange={(v) =>
									setDefaultSortField(v === "__none__" ? "" : v)
								}
							>
								<SelectTrigger id="default-sort" className="w-64">
									<SelectValue
										placeholder={t("search.widget.defaultSortPlaceholder")}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">
										{t("search.widget.defaultSortNone")}
									</SelectItem>
									{sortableFields.map((field) => (
										<SelectItem key={field} value={field}>
											{field}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					<div className="space-y-3">
						<Label>{t("search.widget.displayOptions")}</Label>
						<div className="gap-3 flex items-center">
							<Switch
								id="show-prices"
								checked={showPrices}
								onCheckedChange={setShowPrices}
							/>
							<label htmlFor="show-prices" className="text-sm cursor-pointer">
								{t("search.widget.showPrices")}
							</label>
						</div>
						<div className="gap-3 flex items-center">
							<Switch
								id="show-images"
								checked={showImages}
								onCheckedChange={setShowImages}
							/>
							<label htmlFor="show-images" className="text-sm cursor-pointer">
								{t("search.widget.showImages")}
							</label>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="theme-select">{t("search.widget.theme")}</Label>
						<Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
							<SelectTrigger id="theme-select" className="w-48">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="auto">{t("search.widget.themeAuto")}</SelectItem>
								<SelectItem value="light">
									{t("search.widget.themeLight")}
								</SelectItem>
								<SelectItem value="dark">{t("search.widget.themeDark")}</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Button onClick={handleSave} loading={saveMutation.isPending}>
						{t("search.widget.saveConfig")}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-4">
					<CardTitle>{t("search.widget.title")}</CardTitle>
					<CardDescription>{t("search.widget.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="widget-snippet">{t("search.widget.snippet")}</Label>
						<Textarea
							id="widget-snippet"
							readOnly
							value={snippet}
							rows={8}
							spellCheck={false}
							className="max-h-64 min-h-0 font-mono text-sm resize-y bg-muted"
						/>
					</div>

					<Button onClick={copySnippet}>{t("search.widget.copySnippet")}</Button>

					<div className="rounded p-4 border border-dashed">
						<p className="text-sm mb-2 text-foreground/60">
							{t("search.widget.installInstructions")}
						</p>
						<ol className="space-y-1 text-sm list-inside list-decimal text-foreground/60">
							<li>{t("search.widget.step1")}</li>
							<li>{t("search.widget.step2")}</li>
							<li>{t("search.widget.step3")}</li>
						</ol>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
