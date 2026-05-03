"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
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
import { GlobeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useSearchIndexesQuery } from "../../lib/api";
import { EmptyState } from "../cards/EmptyState";

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

export function GlobalSynonymsPanel({ organizationId }: GlobalSynonymsPanelProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();
	const { data: indexes } = useSearchIndexesQuery(organizationId);

	const [entries, setEntries] = useState<GlobalSynonymEntry[]>([]);
	const [initialized, setInitialized] = useState(false);

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
									<input
										type="text"
										value={entry.root}
										onChange={(e) =>
											handleChange(index, "root", e.target.value)
										}
										className="p-2.5 rounded text-sm w-full border bg-background"
										placeholder={t("search.globalSynonyms.rootPlaceholder")}
									/>
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
