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
import { Switch } from "@repo/ui/components/switch";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MicIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface WidgetVoicePanelProps {
	organizationId: string;
}

const LANGUAGES = [
	{ value: "auto", labelKey: "voiceLanguageAuto" },
	{ value: "en", label: "English" },
	{ value: "ru", label: "Русский" },
	{ value: "de", label: "Deutsch" },
	{ value: "fr", label: "Français" },
	{ value: "es", label: "Español" },
] as const;

export function WidgetVoicePanel({ organizationId }: WidgetVoicePanelProps) {
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

	const [enabled, setEnabled] = useState(false);
	const [language, setLanguage] = useState("auto");
	const [trigger, setTrigger] = useState<"mic" | "doubleTap">("mic");
	const [fallbackMessage, setFallbackMessage] = useState("");

	useEffect(() => {
		if (!selectedIndexSlug && indexes && indexes.length > 0) {
			setSelectedIndexSlug(indexes[0].slug);
		}
	}, [indexes, selectedIndexSlug]);

	useEffect(() => {
		if (!widgetData?.config) return;
		const cfg = widgetData.config;
		setEnabled(cfg.voiceEnabled ?? false);
		setLanguage(cfg.voiceLanguage ?? "auto");
		setTrigger(cfg.voiceTrigger ?? "mic");
		setFallbackMessage(cfg.voiceFallbackMessage ?? "");
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
				voiceEnabled: enabled,
				voiceLanguage: language,
				voiceTrigger: trigger,
				voiceFallbackMessage: fallbackMessage,
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
				<Label htmlFor="voice-index" className="shrink-0">
					{t("widgetConfigurator.selectIndex")}
				</Label>
				<Select value={selectedIndexSlug} onValueChange={setSelectedIndexSlug}>
					<SelectTrigger id="voice-index" className="w-72">
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

			<Card className="shadow-sm">
				<CardHeader>
					<CardTitle className="text-base">{t("widget.voiceTitle")}</CardTitle>
					<CardDescription>{t("widget.voiceDesc")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Enable toggle */}
					<div className="gap-3 flex items-center justify-between">
						<Label htmlFor="voice-enable">{t("widget.voiceEnable")}</Label>
						<Switch id="voice-enable" checked={enabled} onCheckedChange={setEnabled} />
					</div>

					{enabled && (
						<>
							{/* Language */}
							<div className="space-y-2">
								<Label>{t("widget.voiceLanguage")}</Label>
								<Select value={language} onValueChange={setLanguage}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{LANGUAGES.map((lang) => (
											<SelectItem key={lang.value} value={lang.value}>
												{lang.labelKey
													? t(`widget.${lang.labelKey}`)
													: lang.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Trigger */}
							<div className="space-y-2">
								<Label>{t("widget.voiceTrigger")}</Label>
								<div className="gap-2 flex">
									<Button
										variant={trigger === "mic" ? "default" : "outline"}
										size="sm"
										onClick={() => setTrigger("mic")}
									>
										<MicIcon className="size-3 mr-1.5" />
										{t("widget.voiceTriggerMic")}
									</Button>
									<Button
										variant={trigger === "doubleTap" ? "default" : "outline"}
										size="sm"
										onClick={() => setTrigger("doubleTap")}
									>
										{t("widget.voiceTriggerDoubleTap")}
									</Button>
								</div>
							</div>

							{/* Fallback message */}
							<div className="space-y-2">
								<Label htmlFor="voice-fallback">{t("widget.voiceFallback")}</Label>
								<Input
									id="voice-fallback"
									value={fallbackMessage}
									onChange={(e) => setFallbackMessage(e.target.value)}
									placeholder="Voice search is not supported in your browser."
								/>
							</div>
						</>
					)}

					<Button
						onClick={handleSave}
						loading={saveMutation.isPending}
						className="w-full"
					>
						{t("widgetConfigurator.saveConfig")}
					</Button>
				</CardContent>
			</Card>

			{/* Live preview */}
			<Card className="shadow-sm">
				<CardHeader>
					<CardTitle className="text-base">
						{t("widgetConfigurator.previewTitle")}
					</CardTitle>
					<CardDescription>{t("widgetConfigurator.previewDesc")}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="p-6 min-h-40 flex items-center justify-center rounded-lg border bg-background">
						{enabled ? (
							<button
								type="button"
								className="size-14 flex items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
							>
								<MicIcon className="size-6" />
							</button>
						) : (
							<p className="text-sm text-muted-foreground/50">
								{t("widget.voiceDisabled") || "Voice search is disabled"}
							</p>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
