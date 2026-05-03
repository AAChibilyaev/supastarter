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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenTextIcon, DownloadIcon, SparklesIcon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";
import { SynonymImportDialog } from "./SynonymImportDialog";

interface SynonymsPanelProps {
	organizationId: string;
	slug: string;
}

interface SynonymRow {
	synonym: string;
	root: string;
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

export function SynonymsPanel({ organizationId, slug }: SynonymsPanelProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();

	const [rows, setRows] = useState<SynonymRow[]>([]);
	const [initialized, setInitialized] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [aiSuggestions, setAiSuggestions] = useState<Record<number, AISynSuggestion[]>>({});
	const [suggestingIndex, setSuggestingIndex] = useState<number | null>(null);
	const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);

	const aiSuggestMutation = useMutation({
		...orpc.search.synonyms.suggest.mutationOptions(),
	});

	const { data, isLoading } = useQuery(
		orpc.search.synonyms.get.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);

	// Sync local state when data loads
	if (data && !initialized) {
		setRows(data);
		setInitialized(true);
	}

	const updateMutation = useMutation({
		...orpc.search.synonyms.update.mutationOptions(),
		onSuccess: (result) => {
			setRows(result);
			void queryClient.invalidateQueries({
				queryKey: orpc.search.synonyms.get.queryKey({
					input: { organizationId, slug },
				}),
			});
			toastSuccess(t("search.synonyms.saved"));
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("search.synonyms.error"));
		},
	});

	const exportMutation = useMutation({
		...orpc.search.synonyms.export.mutationOptions(),
	});

	const importMutation = useMutation({
		...orpc.search.synonyms.import.mutationOptions(),
	});

	const handleSave = () => {
		updateMutation.mutate({ organizationId, slug, synonyms: rows });
	};

	const handleAddRow = () => {
		setRows([...rows, { synonym: "", root: "" }]);
	};

	const handleRemoveRow = (index: number) => {
		confirm({
			title: t("search.synonyms.removeConfirmTitle"),
			message: t("search.synonyms.removeConfirmMessage"),
			destructive: true,
			onConfirm: () => {
				setRows(rows.filter((_, i) => i !== index));
			},
		});
	};

	const handleChange = (index: number, field: "synonym" | "root", value: string) => {
		const updated = [...rows];
		updated[index] = { ...updated[index], [field]: value };
		setRows(updated);
	};

	const handleSuggestFromAI = async (index: number) => {
		const row = rows[index];
		if (!row.root.trim()) return;
		setSuggestingIndex(index);
		setActiveSuggestionIndex(index);
		try {
			const result = await aiSuggestMutation.mutateAsync({
				organizationId,
				slug,
				rootWord: row.root,
				locale: "en",
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

	const handleAcceptSuggestion = (rowIndex: number, suggestion: AISynSuggestion) => {
		const updated = [...rows];
		const row = updated[rowIndex];
		// Set the synonym field to the suggested word if empty, or append to it
		if (row.synonym) {
			row.synonym = `${row.synonym}, ${suggestion.word}`;
		} else {
			row.synonym = suggestion.word;
		}
		setRows(updated);
		setActiveSuggestionIndex(null);
	};

	const handleExport = async (format: "csv" | "json") => {
		try {
			const result = await exportMutation.mutateAsync({
				organizationId,
				slug,
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
			slug,
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
					<h3 className="text-lg font-semibold">{t("search.synonyms.title")}</h3>
					<p className="text-sm text-foreground/60">{t("search.synonyms.description")}</p>
				</div>
				<div className="gap-2 flex">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								<DownloadIcon className="mr-1.5 h-4 w-4" />
								Export
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => handleExport("json")}>
								{t("search.synonyms.exportJson")}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleExport("csv")}>
								{t("search.synonyms.exportCsv")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<SynonymImportDialog
						open={importOpen}
						onOpenChange={setImportOpen}
						onImport={handleImport}
					/>

					<Button variant="outline" onClick={handleAddRow}>
						{t("search.synonyms.add")}
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

			{rows.length === 0 ? (
				<EmptyState
					title={t("search.synonyms.empty")}
					description={t("search.synonyms.emptyDescription")}
					icon={BookOpenTextIcon}
				/>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("search.synonyms.synonymColumn")}</TableHead>
							<TableHead>{t("search.synonyms.rootColumn")}</TableHead>
							<TableHead className="w-20 text-right">
								{t("search.synonyms.tableActions")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row, index) => (
							<TableRow key={index}>
								<TableCell>
									<input
										type="text"
										value={row.synonym}
										onChange={(e) =>
											handleChange(index, "synonym", e.target.value)
										}
										className="p-2.5 rounded text-sm w-full border bg-background"
										placeholder="e.g. sneakers"
									/>
								</TableCell>
								<TableCell>
									<div className="gap-2 flex">
										<input
											type="text"
											value={row.root}
											onChange={(e) =>
												handleChange(index, "root", e.target.value)
											}
											className="p-2.5 rounded text-sm w-full flex-1 border bg-background"
											placeholder="e.g. shoes"
										/>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleSuggestFromAI(index)}
											loading={suggestingIndex === index}
											disabled={!row.root.trim()}
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
								</TableCell>
								<TableCell className="text-right">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleRemoveRow(index)}
									>
										{t("search.synonyms.remove")}
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</Card>
	);
}
