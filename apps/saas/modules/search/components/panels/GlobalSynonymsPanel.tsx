"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GlobeIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useSearchIndexesQuery } from "../../lib/api";
import { EmptyState } from "../cards/EmptyState";
import { SynonymImportDialog } from "./SynonymImportDialog";

interface GlobalSynonymEntry {
	name: string;
	root: string;
	synonyms: string[];
	locale?: string;
	scope: "all" | "selected";
	excludedCollectionIds: string[];
}

interface GlobalSynonymRow extends GlobalSynonymEntry {
	id: string;
	createdAt: string;
	updatedAt: string;
}

interface GlobalSynonymsPanelProps {
	organizationId: string;
}

interface ImportResult {
	imported: number;
	skipped: number;
	errors: string[];
	warnings: string[];
	dryRun: boolean;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

interface AISynSuggestion {
	word: string;
	score: number;
	rationale: string;
}

export function GlobalSynonymsPanel({ organizationId }: GlobalSynonymsPanelProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();
	const { data: indexes } = useSearchIndexesQuery(organizationId);

	const [entries, setEntries] = useState<GlobalSynonymEntry[]>([]);
	const [initialized, setInitialized] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [aiSuggestions, setAiSuggestions] = useState<Record<number, AISynSuggestion[]>>({});
	const [suggestingIndex, setSuggestingIndex] = useState<number | null>(null);
	const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);

	const { data, isLoading } = useQuery(
		orpc.search.globalSynonyms.get.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	// Sync local state when data loads
	if (data && !initialized) {
		setEntries(
			data.map((d) => ({
				name: d.name,
				root: d.root,
				synonyms: d.synonyms,
				locale: d.locale,
				scope: d.scope as "all" | "selected",
				excludedCollectionIds: d.excludedCollectionIds ?? [],
			})),
		);
		setInitialized(true);
	}

	const updateMutation = useMutation({
		...orpc.search.globalSynonyms.update.mutationOptions(),
		onSuccess: (result) => {
			setEntries(
				result.map((r) => ({
					name: r.name,
					root: r.root,
					synonyms: r.synonyms,
					locale: r.locale,
					scope: r.scope as "all" | "selected",
					excludedCollectionIds: r.excludedCollectionIds ?? [],
				})),
			);
			void queryClient.invalidateQueries({
				queryKey: orpc.search.globalSynonyms.get.queryKey({
					input: { organizationId },
				}),
			});
			toastSuccess(t("search.synonyms.saved"));
		},
		onError: (error: Error) => {
			toastError(error instanceof Error ? error.message : t("search.synonyms.error"));
		},
	});

	const exportMutation = useMutation({
		...orpc.search.globalSynonyms.export.mutationOptions(),
	});

	const importMutation = useMutation({
		...orpc.search.globalSynonyms.import.mutationOptions(),
	});

	const aiSuggestMutation = useMutation({
		...orpc.search.globalSynonyms.suggest.mutationOptions(),
	});

	const handleAddSet = () => {
		setEntries([
			...entries,
			{
				name: "",
				root: "",
				synonyms: [],
				scope: "all",
				excludedCollectionIds: [],
			},
		]);
	};

	const handleRemoveSet = (index: number) => {
		confirm({
			title: t("search.synonyms.removeConfirmTitle"),
			message: t("search.synonyms.removeConfirmMessage"),
			destructive: true,
			onConfirm: () => {
				setEntries(entries.filter((_, i) => i !== index));
			},
		});
	};

	const handleChange = (
		index: number,
		field: "name" | "root" | "synonyms" | "scope",
		value: string | string[],
	) => {
		const updated = [...entries];
		updated[index] = { ...updated[index], [field]: value };
		setEntries(updated);
	};

	const handleToggleExclusion = (entryIndex: number, collectionId: string) => {
		const updated = [...entries];
		const entry = updated[entryIndex];
		const excluded = entry.excludedCollectionIds;
		if (excluded.includes(collectionId)) {
			entry.excludedCollectionIds = excluded.filter((id) => id !== collectionId);
		} else {
			entry.excludedCollectionIds = [...excluded, collectionId];
		}
		setEntries(updated);
	};

	const handleSave = () => {
		// Validate
		for (const entry of entries) {
			if (!entry.name.trim()) {
				toastError(t("search.globalSynonyms.nameRequired"));
				return;
			}
			if (!entry.root.trim()) {
				toastError(t("search.globalSynonyms.rootRequired"));
				return;
			}
			if (entry.synonyms.length === 0 || entry.synonyms.every((s) => !s.trim())) {
				toastError(t("search.globalSynonyms.synonymsRequired"));
				return;
			}
		}
		updateMutation.mutate({ organizationId, synonyms: entries });
	};

	const handleSuggestFromAI = async (index: number) => {
		const entry = entries[index];
		if (!entry.root.trim()) {
			toastError(t("search.globalSynonyms.rootRequired"));
			return;
		}
		setSuggestingIndex(index);
		setActiveSuggestionIndex(index);
		try {
			const result = await aiSuggestMutation.mutateAsync({
				organizationId,
				rootWord: entry.root,
				locale: entry.locale ?? "en",
			});
			setAiSuggestions((prev) => ({
				...prev,
				[index]: result.suggestions,
			}));
			if (result.suggestions.length > 0) {
				toastSuccess(
					t("search.synonyms.aiSuggestSuccess", { count: result.suggestions.length }),
				);
			} else {
				toastError(t("search.synonyms.aiSuggestEmpty"));
			}
		} catch (err) {
			toastError(err instanceof Error ? err.message : t("search.synonyms.error"));
		} finally {
			setSuggestingIndex(null);
		}
	};

	const handleAcceptSuggestion = (entryIndex: number, suggestion: AISynSuggestion) => {
		const updated = [...entries];
		const entry = updated[entryIndex];
		// Add the suggestion to the synonyms list if not already present
		if (!entry.synonyms.some((s) => s.toLowerCase() === suggestion.word.toLowerCase())) {
			entry.synonyms = [...entry.synonyms, suggestion.word];
		}
		setEntries(updated);
		setActiveSuggestionIndex(null);
	};

	const handleExport = async (format: "csv" | "json") => {
		try {
			const result = await exportMutation.mutateAsync({
				organizationId,
				format,
			});
			const mimeType = format === "csv" ? "text/csv" : "application/json";
			triggerDownload(result.data, result.filename, mimeType);
			toastSuccess(t("search.synonyms.exportSuccess", { count: result.total }));
		} catch (err) {
			toastError(err instanceof Error ? err.message : t("search.synonyms.error"));
		}
	};

	const handleImport = async (
		data: string,
		format: "csv" | "json",
		dryRun: boolean,
	): Promise<ImportResult> => {
		return importMutation.mutateAsync({
			organizationId,
			format,
			data,
			dryRun,
		});
	};

	if (isLoading) {
		return <div className="text-foreground/60">{t("search.loading")}</div>;
	}

	return (
		<Card className="p-6 space-y-6">
			<div className="sm:flex-row sm:items-center sm:justify-between gap-4 flex flex-col">
				<div>
					<h3 className="text-lg font-semibold">{t("search.globalSynonyms.title")}</h3>
					<p className="text-sm text-foreground/60">
						{t("search.globalSynonyms.description")}
					</p>
				</div>
				<div className="gap-2 flex">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								Export
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => handleExport("json")}>
								{t("search.globalSynonyms.exportJson")}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleExport("csv")}>
								{t("search.globalSynonyms.exportCsv")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<SynonymImportDialog
						open={importOpen}
						onOpenChange={setImportOpen}
						onImport={handleImport}
						isGlobal
					/>

					<Button variant="outline" onClick={handleAddSet}>
						{t("search.globalSynonyms.addSet")}
					</Button>
					<Button
						variant="primary"
						onClick={handleSave}
						loading={updateMutation.isPending}
					>
						{t("search.synonyms.save")}
					</Button>
				</div>
			</div>

			{entries.length === 0 ? (
				<EmptyState
					title={t("search.globalSynonyms.empty")}
					description={t("search.globalSynonyms.emptyDescription")}
					icon={GlobeIcon}
				/>
			) : (
				<div className="space-y-6">
					{entries.map((entry, index) => (
						<Card key={index} className="p-4 space-y-4 border">
							<div className="md:grid-cols-2 gap-4 grid grid-cols-1">
								<div className="space-y-1.5">
									<label className="text-sm font-medium">
										{t("search.globalSynonyms.nameLabel")}
									</label>
									<input
										type="text"
										value={entry.name}
										onChange={(e) =>
											handleChange(index, "name", e.target.value)
										}
										className="p-2.5 rounded text-sm w-full border bg-background"
										placeholder={t("search.globalSynonyms.namePlaceholder")}
									/>
								</div>
								<div className="space-y-1.5">
									<label className="text-sm font-medium">
										{t("search.globalSynonyms.rootLabel")}
									</label>
									<div className="gap-2 flex">
										<input
											type="text"
											value={entry.root}
											onChange={(e) =>
												handleChange(index, "root", e.target.value)
											}
											className="p-2.5 rounded text-sm flex-1 border bg-background"
											placeholder={t("search.globalSynonyms.rootPlaceholder")}
										/>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleSuggestFromAI(index)}
											loading={suggestingIndex === index}
											disabled={!entry.root.trim()}
											title={t("search.synonyms.aiSuggest")}
										>
											<SparklesIcon className="size-4" />
										</Button>
									</div>
									{/* AI suggestion popover */}
									{activeSuggestionIndex === index &&
										aiSuggestions[index] &&
										aiSuggestions[index].length > 0 && (
											<div className="mt-2 p-3 space-y-2 rounded-md border bg-muted/30">
												<p className="text-xs font-medium text-foreground/70">
													{t("search.synonyms.aiSuggestions")}
												</p>
												<div className="gap-1.5 flex flex-wrap">
													{aiSuggestions[index].map((s, si) => (
														<Button
															key={si}
															variant="secondary"
															size="sm"
															className="gap-1"
															onClick={() =>
																handleAcceptSuggestion(index, s)
															}
														>
															{s.word}
															<span className="text-[10px] text-foreground/50 opacity-70">
																{Math.round(s.score * 100)}%
															</span>
														</Button>
													))}
												</div>
												<div className="flex justify-end">
													<Button
														variant="ghost"
														size="xs"
														onClick={() =>
															setActiveSuggestionIndex(null)
														}
													>
														{t("search.synonyms.dismiss")}
													</Button>
												</div>
											</div>
										)}
								</div>
							</div>

							<div className="space-y-1.5">
								<label className="text-sm font-medium">
									{t("search.globalSynonyms.synonymsLabel")}
								</label>
								<input
									type="text"
									value={entry.synonyms.join(", ")}
									onChange={(e) =>
										handleChange(
											index,
											"synonyms",
											e.target.value
												.split(",")
												.map((s) => s.trim())
												.filter(Boolean),
										)
									}
									className="p-2.5 rounded text-sm w-full border bg-background"
									placeholder={t("search.globalSynonyms.synonymsPlaceholder")}
								/>
							</div>

							<div className="md:grid-cols-2 gap-4 grid grid-cols-1">
								<div className="space-y-1.5">
									<label className="text-sm font-medium">
										{t("search.globalSynonyms.scopeLabel")}
									</label>
									<Select
										value={entry.scope}
										onValueChange={(v) => handleChange(index, "scope", v)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">
												{t("search.globalSynonyms.scopeAll")}
											</SelectItem>
											<SelectItem value="selected">
												{t("search.globalSynonyms.scopeSelected")}
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="flex items-end justify-end">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleRemoveSet(index)}
									>
										{t("search.synonyms.remove")}
									</Button>
								</div>
							</div>

							{/* Excluded collections (only shown when scope=all) */}
							{entry.scope === "all" && indexes && indexes.length > 0 && (
								<div className="space-y-1.5">
									<label className="text-sm font-medium">
										{t("search.globalSynonyms.excludeLabel")}
									</label>
									<div className="gap-2 flex flex-wrap">
										{indexes.map((col) => {
											const isExcluded = entry.excludedCollectionIds.includes(
												col.id,
											);
											return (
												<Button
													key={col.id}
													variant={isExcluded ? "secondary" : "outline"}
													size="sm"
													onClick={() =>
														handleToggleExclusion(index, col.id)
													}
												>
													{isExcluded ? "✕ " : ""}
													{col.displayName || col.slug}
												</Button>
											);
										})}
									</div>
								</div>
							)}
						</Card>
					))}
				</div>
			)}
		</Card>
	);
}
