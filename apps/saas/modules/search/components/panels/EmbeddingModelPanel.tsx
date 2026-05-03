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
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useListModelsQuery, useModelConfigQuery } from "../../lib/api";

interface EmbeddingModelPanelProps {
	organizationId: string;
	slug: string;
}

interface ModelGroup {
	provider: string;
	models: Array<{ name: string; dimensions: number; maxInputTokens: number }>;
}

export function EmbeddingModelPanel({ organizationId, slug }: EmbeddingModelPanelProps) {
	const t = useTranslations("search");
	const queryClient = useQueryClient();

	const { data: models, isLoading: modelsLoading } = useListModelsQuery();
	const { data: config, isLoading: configLoading } = useModelConfigQuery(organizationId, slug);

	const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
	const [hybridAlpha, setHybridAlpha] = useState(0.5);
	const [enabled, setEnabled] = useState(false);
	const [azureApiUrl, setAzureApiUrl] = useState("");
	const [azureApiVersion, setAzureApiVersion] = useState("2024-02-01");
	const [openaiCompatibleApiUrl, setOpenaiCompatibleApiUrl] = useState("");
	const [openaiCompatibleApiKey, setOpenaiCompatibleApiKey] = useState("");
	const [changed, setChanged] = useState(false);
	const [initialized, setInitialized] = useState(false);

	// ── Group models by provider ─────────────────────────────────

	const modelGroups: ModelGroup[] = [];
	if (models) {
		const groups = new Map<
			string,
			Array<{ name: string; dimensions: number; maxInputTokens: number }>
		>();
		for (const m of models) {
			const provider = m.provider;
			if (!groups.has(provider)) groups.set(provider, []);
			groups
				.get(provider)!
				.push({ name: m.name, dimensions: m.dimensions, maxInputTokens: m.maxInputTokens });
		}
		for (const [provider, providerModels] of groups) {
			modelGroups.push({ provider, models: providerModels });
		}
	}

	const selectedModel = models?.find((m) => m.name === embeddingModel);
	const isAzure = selectedModel?.provider === "azure";
	const isOpenaiCompatible = selectedModel?.provider === "openai-compatible";

	// ── Initialize from fetched config ────────────────────────────

	useEffect(() => {
		if (!config || initialized) return;
		setEmbeddingModel(config.embeddingModel);
		setHybridAlpha(config.hybridAlpha);
		setEnabled(config.enabled);
		setAzureApiUrl(config.azureApiUrl ?? "");
		setAzureApiVersion(config.azureApiVersion ?? "2024-02-01");
		setOpenaiCompatibleApiUrl(config.openaiCompatibleApiUrl ?? "");
		setOpenaiCompatibleApiKey(config.openaiCompatibleApiKey ?? "");
		setInitialized(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [config, initialized]);

	// ── Update mutation ───────────────────────────────────────────

	const updateMutation = useMutation({
		...orpc.search.modelConfig.update.mutationOptions(),
		onSuccess: async () => {
			toastSuccess(t("embeddingModel.saved"));
			setChanged(false);
			await queryClient.invalidateQueries({
				queryKey: orpc.search.modelConfig.get.queryKey({
					input: { organizationId, slug },
				}),
			});
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("embeddingModel.error"));
		},
	});

	const handleSave = () => {
		updateMutation.mutate({
			organizationId,
			slug,
			embeddingModel,
			hybridAlpha,
			enabled,
			azureApiUrl: isAzure ? azureApiUrl : undefined,
			azureApiVersion: isAzure ? azureApiVersion : undefined,
			openaiCompatibleApiUrl: isOpenaiCompatible ? openaiCompatibleApiUrl : undefined,
			openaiCompatibleApiKey: isOpenaiCompatible ? openaiCompatibleApiKey : undefined,
		});
	};

	const isLoading = modelsLoading || configLoading;

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-48" />
					<Skeleton className="h-4 w-64" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="gap-2 text-base flex items-center">
					{t("embeddingModel.title")}
				</CardTitle>
				<CardDescription>{t("embeddingModel.description")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Enable/disable */}
				<div className="gap-3 flex items-center justify-between">
					<div>
						<Label htmlFor="embedding-enabled">{t("embeddingModel.enableLabel")}</Label>
						<p className="text-sm text-muted-foreground">
							{t("embeddingModel.enableHint")}
						</p>
					</div>
					<Switch
						id="embedding-enabled"
						checked={enabled}
						onCheckedChange={(v) => {
							setEnabled(v);
							setChanged(true);
						}}
					/>
				</div>

				{enabled && (
					<>
						{/* Model selector */}
						<div className="space-y-3">
							<Label>{t("embeddingModel.modelLabel")}</Label>
							<Select
								value={embeddingModel}
								onValueChange={(v) => {
									setEmbeddingModel(v);
									setChanged(true);
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder={t("embeddingModel.selectModel")} />
								</SelectTrigger>
								<SelectContent>
									{modelGroups.map((group) => (
										<div key={group.provider}>
											<div className="px-2 py-1.5 font-medium text-xs tracking-wider text-muted-foreground uppercase">
												{group.provider}
											</div>
											{group.models.map((m) => (
												<SelectItem key={m.name} value={m.name}>
													<span className="font-mono text-xs">
														{m.name}
													</span>
													<span className="ml-2 text-xs text-muted-foreground">
														{m.dimensions}d
													</span>
												</SelectItem>
											))}
										</div>
									))}
								</SelectContent>
							</Select>

							{selectedModel && (
								<p className="text-xs text-muted-foreground">
									{t("embeddingModel.dimensions", {
										dims: selectedModel.dimensions,
									})}
									{" · "}
									{t("embeddingModel.maxTokens", {
										tokens: selectedModel.maxInputTokens,
									})}
								</p>
							)}
						</div>

						{/* Hybrid alpha slider */}
						<div className="space-y-3">
							<div className="gap-2 flex items-center justify-between">
								<Label htmlFor="hybrid-alpha">
									{t("embeddingModel.hybridAlpha")}
								</Label>
								<span className="font-mono text-xs tabular-nums">
									{hybridAlpha.toFixed(2)}
								</span>
							</div>
							<Slider
								id="hybrid-alpha"
								min={0}
								max={1}
								step={0.05}
								value={[hybridAlpha]}
								onValueChange={([v]) => {
									setHybridAlpha(v);
									setChanged(true);
								}}
							/>
							<p className="text-xs text-muted-foreground">
								{t("embeddingModel.hybridAlphaHint")}
							</p>
						</div>

						{/* OpenAI-compatible fields */}
						{isOpenaiCompatible && (
							<div className="space-y-4 p-4 rounded-lg border">
								<p className="font-medium text-sm">
									{t("embeddingModel.openaiCompatibleSection")}
								</p>
								<div className="space-y-2">
									<Label htmlFor="openai-compat-url">
										{t("embeddingModel.openaiCompatibleApiUrl")}
									</Label>
									<Input
										id="openai-compat-url"
										value={openaiCompatibleApiUrl}
										onChange={(e) => {
											setOpenaiCompatibleApiUrl(e.target.value);
											setChanged(true);
										}}
										placeholder="http://localhost:11434/v1"
									/>
									<p className="text-xs text-muted-foreground">
										{t("embeddingModel.openaiCompatibleApiUrlHint")}
									</p>
								</div>
								<div className="space-y-2">
									<Label htmlFor="openai-compat-key">
										{t("embeddingModel.openaiCompatibleApiKey")}
									</Label>
									<Input
										id="openai-compat-key"
										type="password"
										value={openaiCompatibleApiKey}
										onChange={(e) => {
											setOpenaiCompatibleApiKey(e.target.value);
											setChanged(true);
										}}
										placeholder={t(
											"embeddingModel.openaiCompatibleApiKeyPlaceholder",
										)}
									/>
									<p className="text-xs text-muted-foreground">
										{t("embeddingModel.openaiCompatibleApiKeyHint")}
									</p>
								</div>
							</div>
						)}

						{/* Azure-specific fields */}
						{isAzure && (
							<div className="space-y-4 p-4 rounded-lg border">
								<p className="font-medium text-sm">
									{t("embeddingModel.azureSection")}
								</p>
								<div className="space-y-2">
									<Label htmlFor="azure-url">
										{t("embeddingModel.azureApiUrl")}
									</Label>
									<Input
										id="azure-url"
										value={azureApiUrl}
										onChange={(e) => {
											setAzureApiUrl(e.target.value);
											setChanged(true);
										}}
										placeholder="https://{resource}.openai.azure.com/"
									/>
									<p className="text-xs text-muted-foreground">
										{t("embeddingModel.azureApiUrlHint")}
									</p>
								</div>
								<div className="space-y-2">
									<Label htmlFor="azure-version">
										{t("embeddingModel.azureApiVersion")}
									</Label>
									<Input
										id="azure-version"
										value={azureApiVersion}
										onChange={(e) => {
											setAzureApiVersion(e.target.value);
											setChanged(true);
										}}
										placeholder="2024-02-01"
									/>
								</div>
							</div>
						)}
					</>
				)}

				{/* Save button */}
				<Button onClick={handleSave} disabled={!changed || updateMutation.isPending}>
					{updateMutation.isPending
						? t("embeddingModel.saving")
						: t("embeddingModel.save")}
				</Button>
			</CardContent>
		</Card>
	);
}
