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
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface RagConfigPanelProps {
	ownerType: "USER" | "ORGANIZATION";
	ownerId: string;
	spaceSlug: string;
	canManage: boolean;
}

interface RagConfigForm {
	maxOutputTokens: number;
	maxContextTokens: number;
	minConfidence: number;
	retrievalLimit: number;
	includeGraphEdges: boolean;
	systemPrompt: string;
}

const DEFAULTS: RagConfigForm = {
	maxOutputTokens: 1024,
	maxContextTokens: 8000,
	minConfidence: 0.35,
	retrievalLimit: 8,
	includeGraphEdges: true,
	systemPrompt: "",
};

export function RagConfigPanel({ ownerType, ownerId, spaceSlug, canManage }: RagConfigPanelProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const ragConfigQuery = useQuery(
		orpc.knowledge.getRagConfig.queryOptions({
			input: { ownerType, ownerId, spaceSlug },
		}),
	);

	const [form, setForm] = useState<RagConfigForm>(DEFAULTS);
	const [synced, setSynced] = useState(false);

	// Sync form from server data once after first successful load
	useEffect(() => {
		if (ragConfigQuery.data && !synced) {
			const d = ragConfigQuery.data as RagConfigForm;
			setForm({
				maxOutputTokens: d.maxOutputTokens ?? DEFAULTS.maxOutputTokens,
				maxContextTokens: d.maxContextTokens ?? DEFAULTS.maxContextTokens,
				minConfidence: d.minConfidence ?? DEFAULTS.minConfidence,
				retrievalLimit: d.retrievalLimit ?? DEFAULTS.retrievalLimit,
				includeGraphEdges: d.includeGraphEdges ?? DEFAULTS.includeGraphEdges,
				systemPrompt: d.systemPrompt ?? DEFAULTS.systemPrompt,
			});
			setSynced(true);
		}
	}, [ragConfigQuery.data, synced]);

	const updateMutation = useMutation({
		...orpc.knowledge.updateRagConfig.mutationOptions(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: orpc.knowledge.getRagConfig.queryKey({
					input: { ownerType, ownerId, spaceSlug },
				}),
			});
			toast.success(t("search.knowledge.ragConfigSaved"));
		},
		onError: () => toast.error(t("search.knowledge.ragConfigSaveError")),
	});

	const handleSave = () => {
		if (!canManage) {
			toast.error(t("search.knowledge.permissionDenied"));
			return;
		}
		updateMutation.mutate({
			ownerType,
			ownerId,
			spaceSlug,
			config: {
				maxOutputTokens: form.maxOutputTokens,
				maxContextTokens: form.maxContextTokens,
				minConfidence: form.minConfidence,
				retrievalLimit: form.retrievalLimit,
				includeGraphEdges: form.includeGraphEdges,
				systemPrompt: form.systemPrompt.trim(),
			},
		});
	};

	const updateField = <K extends keyof RagConfigForm>(field: K, value: RagConfigForm[K]) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const savedConfig = ragConfigQuery.data as RagConfigForm | undefined;
	const hasChanges =
		synced &&
		savedConfig != null &&
		(form.maxOutputTokens !== savedConfig.maxOutputTokens ||
			form.maxContextTokens !== savedConfig.maxContextTokens ||
			form.minConfidence !== savedConfig.minConfidence ||
			form.retrievalLimit !== savedConfig.retrievalLimit ||
			form.includeGraphEdges !== savedConfig.includeGraphEdges ||
			form.systemPrompt !== (savedConfig.systemPrompt ?? ""));

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("search.knowledge.ragConfig")}</CardTitle>
				<CardDescription>{t("search.knowledge.ragConfigDesc")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{ragConfigQuery.isLoading ? (
					<p className="text-sm text-muted-foreground">
						{t("search.knowledge.loadingConfig")}
					</p>
				) : (
					<>
						<div className="gap-4 grid grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="rag-max-output-tokens">
									{t("search.knowledge.maxOutputTokens")}
								</Label>
								<Input
									id="rag-max-output-tokens"
									type="number"
									min={64}
									max={4096}
									value={form.maxOutputTokens}
									onChange={(e) =>
										updateField("maxOutputTokens", Number(e.target.value))
									}
									disabled={!canManage}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="rag-max-context-tokens">
									{t("search.knowledge.maxContextTokens")}
								</Label>
								<Input
									id="rag-max-context-tokens"
									type="number"
									min={512}
									max={16000}
									value={form.maxContextTokens}
									onChange={(e) =>
										updateField("maxContextTokens", Number(e.target.value))
									}
									disabled={!canManage}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="rag-min-confidence">
									{t("search.knowledge.minConfidence")}
								</Label>
								<Input
									id="rag-min-confidence"
									type="number"
									min={0}
									max={1}
									step={0.05}
									value={form.minConfidence}
									onChange={(e) =>
										updateField("minConfidence", Number(e.target.value))
									}
									disabled={!canManage}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="rag-retrieval-limit">
									{t("search.knowledge.retrievalLimit")}
								</Label>
								<Input
									id="rag-retrieval-limit"
									type="number"
									min={1}
									max={50}
									value={form.retrievalLimit}
									onChange={(e) =>
										updateField("retrievalLimit", Number(e.target.value))
									}
									disabled={!canManage}
								/>
							</div>
						</div>

						<div className="gap-2 flex items-center">
							<Switch
								id="rag-include-graph"
								checked={form.includeGraphEdges}
								onCheckedChange={(checked) =>
									updateField("includeGraphEdges", checked)
								}
								disabled={!canManage}
							/>
							<Label htmlFor="rag-include-graph">
								{t("search.knowledge.includeGraphEdges")}
							</Label>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="rag-system-prompt">
								{t("search.knowledge.systemPrompt")}
							</Label>
							<Textarea
								id="rag-system-prompt"
								rows={4}
								value={form.systemPrompt}
								onChange={(e) => updateField("systemPrompt", e.target.value)}
								placeholder={t("search.knowledge.systemPromptPlaceholder")}
								disabled={!canManage}
							/>
							<p className="text-xs text-muted-foreground">
								{t("search.knowledge.systemPromptHint")}
							</p>
						</div>

						{canManage && (
							<Button
								type="button"
								onClick={handleSave}
								disabled={updateMutation.isPending || !hasChanges}
							>
								{t("search.knowledge.saveRagConfig")}
							</Button>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
