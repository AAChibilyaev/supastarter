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
import { BookOpenTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";

interface SynonymsPanelProps {
	organizationId: string;
	slug: string;
}

interface SynonymRow {
	synonym: string;
	root: string;
}

export function SynonymsPanel({ organizationId, slug }: SynonymsPanelProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();

	const [rows, setRows] = useState<SynonymRow[]>([]);
	const [initialized, setInitialized] = useState(false);

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
					<Button variant="outline" onClick={handleAddRow}>
						{t("search.synonyms.add")}
					</Button>
					<Button variant="primary" onClick={handleSave} loading={updateMutation.isPending}>
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
							<TableHead className="w-20 text-right">{t("search.synonyms.tableActions")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row, index) => (
							<TableRow key={index}>
								<TableCell>
									<input
										type="text"
										value={row.synonym}
										onChange={(e) => handleChange(index, "synonym", e.target.value)}
										className="p-2.5 rounded text-sm w-full border bg-background"
										placeholder="e.g. sneakers"
									/>
								</TableCell>
								<TableCell>
									<input
										type="text"
										value={row.root}
										onChange={(e) => handleChange(index, "root", e.target.value)}
										className="p-2.5 rounded text-sm w-full border bg-background"
										placeholder="e.g. shoes"
									/>
								</TableCell>
								<TableCell className="text-right">
									<Button variant="ghost" size="sm" onClick={() => handleRemoveRow(index)}>
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
