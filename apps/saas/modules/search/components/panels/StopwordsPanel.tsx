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
import { BanIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";

interface StopwordsPanelProps {
	organizationId: string;
	slug: string;
}

export function StopwordsPanel({ organizationId, slug }: StopwordsPanelProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();

	const [words, setWords] = useState<string[]>([]);
	const [initialized, setInitialized] = useState(false);

	const { data, isLoading } = useQuery(
		orpc.search.stopwords.list.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);

	if (data && !initialized) {
		setWords(data.stopwords);
		setInitialized(true);
	}

	const updateMutation = useMutation({
		...orpc.search.stopwords.upsert.mutationOptions(),
		onSuccess: (result) => {
			setWords(result.stopwords);
			void queryClient.invalidateQueries({
				queryKey: orpc.search.stopwords.list.queryKey({
					input: { organizationId, slug },
				}),
			});
			toastSuccess(t("search.stopwords.saved"));
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("search.stopwords.error"));
		},
	});

	const handleSave = () => {
		const cleaned = words.map((w) => w.trim()).filter(Boolean);
		updateMutation.mutate({ organizationId, slug, stopwords: cleaned });
	};

	const handleAddRow = () => {
		setWords([...words, ""]);
	};

	const handleRemoveRow = (index: number) => {
		confirm({
			title: t("search.stopwords.removeConfirmTitle"),
			message: t("search.stopwords.removeConfirmMessage"),
			destructive: true,
			onConfirm: () => {
				setWords(words.filter((_, i) => i !== index));
			},
		});
	};

	const handleChange = (index: number, value: string) => {
		const updated = [...words];
		updated[index] = value;
		setWords(updated);
	};

	if (isLoading) {
		return <div className="text-foreground/60">{t("search.loading")}</div>;
	}

	return (
		<Card className="p-6 space-y-6">
			<div className="sm:flex-row sm:items-center sm:justify-between gap-4 flex flex-col">
				<div>
					<h3 className="text-lg font-semibold">{t("search.stopwords.title")}</h3>
					<p className="text-sm text-foreground/60">{t("search.stopwords.description")}</p>
				</div>
				<div className="gap-2 flex">
					<Button variant="outline" onClick={handleAddRow}>
						{t("search.stopwords.add")}
					</Button>
					<Button variant="primary" onClick={handleSave} loading={updateMutation.isPending}>
						{t("search.stopwords.save")}
					</Button>
				</div>
			</div>

			{words.length === 0 ? (
				<EmptyState
					title={t("search.stopwords.empty")}
					description={t("search.stopwords.emptyDescription")}
					icon={BanIcon}
				/>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("search.stopwords.wordColumn")}</TableHead>
							<TableHead className="w-20 text-right">
								{t("search.stopwords.tableActions")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{words.map((word, index) => (
							<TableRow key={index}>
								<TableCell>
									<input
										type="text"
										value={word}
										onChange={(e) => handleChange(index, e.target.value)}
										className="p-2.5 rounded text-sm w-full border bg-background"
										placeholder="e.g. the"
									/>
								</TableCell>
								<TableCell className="text-right">
									<Button variant="ghost" size="sm" onClick={() => handleRemoveRow(index)}>
										{t("search.stopwords.remove")}
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
