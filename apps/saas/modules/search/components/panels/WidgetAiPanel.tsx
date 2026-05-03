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
import { Switch } from "@repo/ui/components/switch";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CameraIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface WidgetAiPanelProps {
	organizationId: string;
}

export function WidgetAiPanel({ organizationId }: WidgetAiPanelProps) {
	const t = useTranslations("search");
	const queryClient = useQueryClient();
	const [selectedIndexSlug, setSelectedIndexSlug] = useState("");

	const { data: indexes, isLoading: indexesLoading } = useQuery(
		orpc.search.listIndexes.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	const { data: widgetData } = useQuery(
		orpc.search.widgetConfig.queryOptions({
			input: { organizationId, indexSlug: selectedIndexSlug },
			enabled: !!organizationId && !!selectedIndexSlug,
		}),
	);

	const [aiAnswers, setAiAnswers] = useState(false);
	const [imageSearch, setImageSearch] = useState(false);

	useEffect(() => {
		if (!selectedIndexSlug && indexes && indexes.length > 0) {
			setSelectedIndexSlug(indexes[0].slug);
		}
	}, [indexes, selectedIndexSlug]);

	useEffect(() => {
		if (!widgetData?.config) return;
		setAiAnswers(widgetData.config.aiAnswers ?? false);
		setImageSearch(widgetData.config.imageSearch ?? false);
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
		const cfg = widgetData?.config;
		saveMutation.mutate({
			organizationId,
			slug: selectedIndexSlug,
			config: {
				aiAnswers,
				imageSearch,
				// preserve existing settings
				facetFields: cfg?.facetFields ?? [],
				facetConfigs: cfg?.facetConfigs ?? [],
				theme: cfg?.theme ?? "auto",
				placeholder: cfg?.placeholder ?? "Search...",
				resultsPerPage: cfg?.resultsPerPage ?? 20,
				showThumbnails: cfg?.showThumbnails ?? true,
				showSearchButton: cfg?.showSearchButton ?? true,
				searchButtonText: cfg?.searchButtonText ?? "Search",
				accentColor: cfg?.accentColor ?? "#6366f1",
				keyboardShortcut: cfg?.keyboardShortcut ?? true,
				defaultSortField: cfg?.defaultSortField,
				showPrices: cfg?.showPrices ?? true,
				showImages: cfg?.showImages ?? true,
				queryBy: cfg?.queryBy ?? [],
				voiceEnabled: cfg?.voiceEnabled ?? false,
				voiceLanguage: cfg?.voiceLanguage ?? "auto",
				voiceTrigger: cfg?.voiceTrigger ?? "mic",
				voiceFallbackMessage: cfg?.voiceFallbackMessage ?? "",
				chatEnabled: cfg?.chatEnabled ?? false,
				chatAssistantName: cfg?.chatAssistantName ?? "",
				widgetMode: cfg?.widgetMode ?? "search",
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
			<div className="gap-3 flex items-center">
				<Label htmlFor="ai-index" className="shrink-0">
					{t("widgetConfigurator.selectIndex")}
				</Label>
				<Select value={selectedIndexSlug} onValueChange={setSelectedIndexSlug}>
					<SelectTrigger id="ai-index" className="w-72">
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

			{/* AI Answers */}
			<Card className="shadow-sm">
				<CardHeader>
					<CardTitle className="text-base gap-2 flex items-center">
						<SparklesIcon className="size-4 text-primary" />
						{t("widget.aiAnswersTitle")}
					</CardTitle>
					<CardDescription>{t("widget.aiAnswersDesc")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="gap-3 flex items-center justify-between">
						<div>
							<Label htmlFor="ai-answers-enable">{t("widget.aiAnswersEnable")}</Label>
							<p className="text-xs mt-1 text-muted-foreground">
								{t("widget.aiAnswersHint")}
							</p>
						</div>
						<Switch
							id="ai-answers-enable"
							checked={aiAnswers}
							onCheckedChange={setAiAnswers}
						/>
					</div>

					{aiAnswers && (
						<div className="p-3 rounded-lg border bg-muted/40">
							<div className="gap-2 text-xs font-semibold tracking-wide mb-2 flex items-center text-primary uppercase">
								<SparklesIcon className="size-3" />
								{t("widget.aiAnswersPreview")}
							</div>
							<p className="text-sm text-muted-foreground">
								{t("widget.aiAnswersPreviewText")}
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Image Search */}
			<Card className="shadow-sm">
				<CardHeader>
					<CardTitle className="text-base gap-2 flex items-center">
						<CameraIcon className="size-4 text-primary" />
						{t("widget.imageSearchTitle")}
					</CardTitle>
					<CardDescription>{t("widget.imageSearchDesc")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="gap-3 flex items-center justify-between">
						<div>
							<Label htmlFor="image-search-enable">
								{t("widget.imageSearchEnable")}
							</Label>
							<p className="text-xs mt-1 text-muted-foreground">
								{t("widget.imageSearchHint")}
							</p>
						</div>
						<Switch
							id="image-search-enable"
							checked={imageSearch}
							onCheckedChange={setImageSearch}
						/>
					</div>

					{imageSearch && (
						<div className="p-3 gap-3 flex items-center rounded-lg border bg-muted/40">
							<div className="size-10 flex flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
								<CameraIcon className="size-5 text-primary" />
							</div>
							<p className="text-sm text-muted-foreground">
								{t("widget.imageSearchPreviewText")}
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			<Button onClick={handleSave} loading={saveMutation.isPending} className="w-full">
				{t("widgetConfigurator.saveConfig")}
			</Button>
		</div>
	);
}
