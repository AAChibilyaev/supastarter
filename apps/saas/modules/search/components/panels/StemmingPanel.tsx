"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
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
import { TreePineIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";

interface StemOverride {
	word: string;
	root: string;
}

interface StemmingPanelProps {
	organizationId: string;
	slug: string;
}

export function StemmingPanel({ organizationId, slug }: StemmingPanelProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();

	const { data: overrides = [], isLoading } = useQuery(
		orpc.search.stemming.list.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);

	const [edits, setEdits] = useState<Record<string, StemOverride>>({});
	const [newRows, setNewRows] = useState<StemOverride[]>([]);

	const invalidateList = () => {
		void queryClient.invalidateQueries({
			queryKey: orpc.search.stemming.list.queryKey({
				input: { organizationId, slug },
			}),
		});
	};

	const upsertMutation = useMutation({
		...orpc.search.stemming.upsert.mutationOptions(),
		onSuccess: () => {
			invalidateList();
			toastSuccess(t("search.stemming.saved"));
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("search.stemming.error"));
		},
	});

	const deleteMutation = useMutation({
		...orpc.search.stemming.delete.mutationOptions(),
		onSuccess: () => {
			invalidateList();
			toastSuccess(t("search.stemming.saved"));
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("search.stemming.error"));
		},
	});

	const handleEdit = (word: string, field: "word" | "root", value: string) => {
		setEdits((prev) => ({
			...prev,
			[word]: {
				...(prev[word] ?? overrides.find((o) => o.word === word) ?? { word: "", root: "" }),
				[field]: value,
			},
		}));
	};

	const handleSaveEdit = (originalWord: string) => {
		const edit = edits[originalWord];
		if (!edit || !edit.word.trim() || !edit.root.trim()) return;
		upsertMutation.mutate({
			organizationId,
			slug,
			word: edit.word.trim(),
			root: edit.root.trim(),
		});
		setEdits((prev) => {
			const next = { ...prev };
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete next[originalWord];
			return next;
		});
	};

	const handleDelete = (word: string) => {
		confirm({
			title: t("search.stemming.removeConfirmTitle"),
			message: t("search.stemming.removeConfirmMessage"),
			destructive: true,
			onConfirm: () => {
				deleteMutation.mutate({ organizationId, slug, word });
			},
		});
	};

	const handleAddRow = () => {
		setNewRows([...newRows, { word: "", root: "" }]);
	};

	const handleNewRowChange = (index: number, field: "word" | "root", value: string) => {
		const updated = [...newRows];
		updated[index] = { ...updated[index], [field]: value };
		setNewRows(updated);
	};

	const handleSaveNewRow = (index: number) => {
		const row = newRows[index];
		if (!row.word.trim() || !row.root.trim()) return;
		upsertMutation.mutate({
			organizationId,
			slug,
			word: row.word.trim(),
			root: row.root.trim(),
		});
		setNewRows(newRows.filter((_, i) => i !== index));
	};

	const handleCancelNewRow = (index: number) => {
		setNewRows(newRows.filter((_, i) => i !== index));
	};

	if (isLoading) {
		return <div className="text-foreground/60">{t("search.loading")}</div>;
	}

	const hasOverrides = overrides.length > 0 || newRows.length > 0;

	return (
		<Card className="p-6 space-y-6">
			<div className="sm:flex-row sm:items-center sm:justify-between gap-4 flex flex-col">
				<div>
					<h3 className="text-lg font-semibold">{t("search.stemming.title")}</h3>
					<p className="text-sm text-foreground/60">{t("search.stemming.description")}</p>
				</div>
				<Button variant="outline" onClick={handleAddRow} loading={upsertMutation.isPending}>
					{t("search.stemming.add")}
				</Button>
			</div>

			{!hasOverrides ? (
				<EmptyState
					title={t("search.stemming.empty")}
					description={t("search.stemming.emptyDescription")}
					icon={TreePineIcon}
				/>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("search.stemming.word")}</TableHead>
							<TableHead>{t("search.stemming.root")}</TableHead>
							<TableHead className="w-40 text-right">
								{t("search.stopwords.tableActions")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{/* Existing overrides */}
						{overrides.map((override) => {
							const edit = edits[override.word];
							const isEditing = edit !== undefined;
							const displayWord = isEditing ? edit.word : override.word;
							const displayRoot = isEditing ? edit.root : override.root;

							return (
								<TableRow key={override.word}>
									<TableCell>
										<input
											type="text"
											value={displayWord}
											onChange={(e) =>
												handleEdit(override.word, "word", e.target.value)
											}
											className="p-2 rounded text-sm w-full border bg-background"
										/>
									</TableCell>
									<TableCell>
										<input
											type="text"
											value={displayRoot}
											onChange={(e) =>
												handleEdit(override.word, "root", e.target.value)
											}
											className="p-2 rounded text-sm w-full border bg-background"
										/>
									</TableCell>
									<TableCell className="text-right">
										<div className="gap-1 flex justify-end">
											{isEditing && (
												<Button
													variant="primary"
													size="sm"
													onClick={() => handleSaveEdit(override.word)}
													loading={upsertMutation.isPending}
												>
													{t("search.stemming.save")}
												</Button>
											)}
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleDelete(override.word)}
												loading={deleteMutation.isPending}
											>
												{t("search.stemming.remove")}
											</Button>
										</div>
									</TableCell>
								</TableRow>
							);
						})}

						{/* New rows (not yet saved) */}
						{newRows.map((row, index) => (
							<TableRow key={`new-${index}`}>
								<TableCell>
									<input
										type="text"
										value={row.word}
										onChange={(e) =>
											handleNewRowChange(index, "word", e.target.value)
										}
										className="p-2 rounded text-sm w-full border bg-background"
										placeholder="e.g. running"
									/>
								</TableCell>
								<TableCell>
									<input
										type="text"
										value={row.root}
										onChange={(e) =>
											handleNewRowChange(index, "root", e.target.value)
										}
										className="p-2 rounded text-sm w-full border bg-background"
										placeholder="e.g. run"
									/>
								</TableCell>
								<TableCell className="text-right">
									<div className="gap-1 flex justify-end">
										<Button
											variant="primary"
											size="sm"
											onClick={() => handleSaveNewRow(index)}
											loading={upsertMutation.isPending}
										>
											{t("search.stemming.save")}
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleCancelNewRow(index)}
										>
											{t("search.stopwords.remove")}
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</Card>
	);
}
