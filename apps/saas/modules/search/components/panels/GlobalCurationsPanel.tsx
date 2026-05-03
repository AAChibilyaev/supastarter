"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";

interface GlobalCurationEntry {
	query: string;
	pinnedIds: string[];
	hiddenIds: string[];
	filter?: string;
}

interface GlobalCurationsPanelProps {
	organizationId: string;
}

export function GlobalCurationsPanel({ organizationId }: GlobalCurationsPanelProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();

	const [entries, setEntries] = useState<GlobalCurationEntry[]>([]);
	const [initialized, setInitialized] = useState(false);

	const { data, isLoading } = useQuery(
		orpc.search.globalCurations.get.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	if (data && !initialized) {
		setEntries(
			data.map((d) => ({
				query: d.query,
				pinnedIds: d.pinnedIds ?? [],
				hiddenIds: d.hiddenIds ?? [],
				filter: d.filter,
			})),
		);
		setInitialized(true);
	}

	const updateMutation = useMutation({
		...orpc.search.globalCurations.update.mutationOptions(),
		onSuccess: (result) => {
			setEntries(
				result.map((r) => ({
					query: r.query,
					pinnedIds: r.pinnedIds ?? [],
					hiddenIds: r.hiddenIds ?? [],
					filter: r.filter,
				})),
			);
			void queryClient.invalidateQueries({
				queryKey: orpc.search.globalCurations.get.queryKey({
					input: { organizationId },
				}),
			});
			toastSuccess(t("search.curations.saved"));
		},
		onError: (error: Error) => {
			toastError(error instanceof Error ? error.message : t("search.curations.error"));
		},
	});

	const handleAddSet = () => {
		setEntries([...entries, { query: "", pinnedIds: [], hiddenIds: [] }]);
	};

	const handleRemoveSet = (index: number) => {
		confirm({
			title: t("search.curations.removeConfirmTitle"),
			message: t("search.curations.removeConfirmMessage"),
			destructive: true,
			onConfirm: () => {
				setEntries(entries.filter((_, i) => i !== index));
			},
		});
	};

	const handleChange = (
		index: number,
		field: "query" | "pinnedIds" | "hiddenIds" | "filter",
		value: string,
	) => {
		const updated = [...entries];
		if (field === "pinnedIds" || field === "hiddenIds") {
			updated[index] = {
				...updated[index],
				[field]: value
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
			};
		} else {
			updated[index] = { ...updated[index], [field]: value };
		}
		setEntries(updated);
	};

	const handleSave = () => {
		for (const entry of entries) {
			if (!entry.query.trim()) {
				toastError(t("search.curations.queryRequired"));
				return;
			}
		}
		updateMutation.mutate({ organizationId, curations: entries });
	};

	if (isLoading) {
		return <div className="text-foreground/60">{t("search.loading")}</div>;
	}

	return (
		<Card className="p-6 space-y-6">
			<div className="sm:flex-row sm:items-center sm:justify-between gap-4 flex flex-col">
				<div>
					<h3 className="text-lg font-semibold">{t("search.globalCurations.title")}</h3>
					<p className="text-sm text-foreground/60">
						{t("search.globalCurations.description")}
					</p>
				</div>
				<div className="gap-2 flex">
					<Button variant="outline" onClick={handleAddSet}>
						{t("search.globalCurations.addSet")}
					</Button>
					<Button
						variant="primary"
						onClick={handleSave}
						loading={updateMutation.isPending}
					>
						{t("search.curations.save")}
					</Button>
				</div>
			</div>

			{entries.length === 0 ? (
				<EmptyState
					title={t("search.globalCurations.empty")}
					description={t("search.globalCurations.emptyDescription")}
				/>
			) : (
				<div className="space-y-4">
					{entries.map((entry, index) => (
						<Card key={index} className="p-4 space-y-4 border">
							<div className="space-y-1.5">
								<label className="text-sm font-medium">
									{t("search.curations.queryLabel")}
								</label>
								<input
									type="text"
									value={entry.query}
									onChange={(e) => handleChange(index, "query", e.target.value)}
									className="p-2.5 rounded text-sm w-full border bg-background"
									placeholder={t("search.curations.queryPlaceholder")}
								/>
							</div>
							<div className="md:grid-cols-2 gap-4 grid grid-cols-1">
								<div className="space-y-1.5">
									<label className="text-sm font-medium">
										{t("search.curations.pinnedLabel")}
									</label>
									<input
										type="text"
										value={entry.pinnedIds.join(", ")}
										onChange={(e) =>
											handleChange(index, "pinnedIds", e.target.value)
										}
										className="p-2.5 rounded text-sm w-full border bg-background"
										placeholder={t("search.curations.pinnedPlaceholder")}
									/>
								</div>
								<div className="space-y-1.5">
									<label className="text-sm font-medium">
										{t("search.curations.hiddenLabel")}
									</label>
									<input
										type="text"
										value={entry.hiddenIds.join(", ")}
										onChange={(e) =>
											handleChange(index, "hiddenIds", e.target.value)
										}
										className="p-2.5 rounded text-sm w-full border bg-background"
										placeholder={t("search.curations.hiddenPlaceholder")}
									/>
								</div>
							</div>
							<div className="flex justify-end">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleRemoveSet(index)}
								>
									{t("search.curations.remove")}
								</Button>
							</div>
						</Card>
					))}
				</div>
			)}
		</Card>
	);
}
