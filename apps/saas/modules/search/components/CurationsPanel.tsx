"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
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
import { useTranslations } from "next-intl";
import { useState } from "react";

interface CurationsPanelProps {
	organizationId: string;
	slug: string;
}

interface CurationRule {
	query: string;
	pinnedIds: string[];
	hiddenIds: string[];
}

export function CurationsPanel({ organizationId, slug }: CurationsPanelProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();

	const [rules, setRules] = useState<CurationRule[]>([]);
	const [initialized, setInitialized] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [formQuery, setFormQuery] = useState("");
	const [formPinned, setFormPinned] = useState("");
	const [formHidden, setFormHidden] = useState("");

	const { data, isLoading } = useQuery(
		orpc.search.curations.get.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);

	// Sync local state when data loads
	if (data && !initialized) {
		setRules(data);
		setInitialized(true);
	}

	const updateMutation = useMutation({
		...orpc.search.curations.update.mutationOptions(),
		onSuccess: (result) => {
			setRules(result);
			void queryClient.invalidateQueries({
				queryKey: orpc.search.curations.get.queryKey({
					input: { organizationId, slug },
				}),
			});
			toastSuccess(t("search.curations.saved"));
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("search.curations.error"));
		},
	});

	const handleSave = () => {
		updateMutation.mutate({ organizationId, slug, curations: rules });
	};

	const openAddDialog = () => {
		setEditingIndex(null);
		setFormQuery("");
		setFormPinned("");
		setFormHidden("");
		setDialogOpen(true);
	};

	const openEditDialog = (index: number) => {
		const rule = rules[index];
		setEditingIndex(index);
		setFormQuery(rule.query);
		setFormPinned(rule.pinnedIds.join(", "));
		setFormHidden(rule.hiddenIds.join(", "));
		setDialogOpen(true);
	};

	const handleDialogSave = () => {
		const rule: CurationRule = {
			query: formQuery.trim(),
			pinnedIds: formPinned
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean),
			hiddenIds: formHidden
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean),
		};

		if (!rule.query) return;

		const updated = [...rules];
		if (editingIndex !== null) {
			updated[editingIndex] = rule;
		} else {
			updated.push(rule);
		}
		setRules(updated);
		setDialogOpen(false);
	};

	const handleRemoveRule = (index: number) => {
		confirm({
			title: t("search.curations.removeConfirmTitle"),
			message: t("search.curations.removeConfirmMessage"),
			destructive: true,
			onConfirm: () => {
				setRules(rules.filter((_, i) => i !== index));
			},
		});
	};

	if (isLoading) {
		return <div className="text-foreground/60">{t("search.loading")}</div>;
	}

	return (
		<Card className="p-6 space-y-4">
			<div className="gap-4 flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold">{t("search.curations.title")}</h3>
					<p className="text-sm text-foreground/60">
						{t("search.curations.description")}
					</p>
				</div>
				<div className="gap-2 flex">
					<Dialog
						open={dialogOpen}
						onOpenChange={(next) => {
							setDialogOpen(next);
							if (!next) {
								setEditingIndex(null);
							}
						}}
					>
						<DialogTrigger asChild>
							<Button variant="outline" onClick={openAddDialog}>
								{t("search.curations.add")}
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{editingIndex !== null
										? t("search.curations.editTitle")
										: t("search.curations.addTitle")}
								</DialogTitle>
								<DialogDescription>
									{t("search.curations.dialogDescription")}
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4">
								<div className="space-y-2">
									<label className="text-sm font-medium">
										{t("search.curations.queryLabel")}
									</label>
									<input
										type="text"
										value={formQuery}
										onChange={(e) => setFormQuery(e.target.value)}
										className="p-2 rounded text-sm w-full border bg-background"
										placeholder={t("search.curations.queryPlaceholder")}
									/>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium">
										{t("search.curations.pinnedLabel")}
									</label>
									<input
										type="text"
										value={formPinned}
										onChange={(e) => setFormPinned(e.target.value)}
										className="p-2 rounded text-sm w-full border bg-background"
										placeholder={t("search.curations.pinnedPlaceholder")}
									/>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium">
										{t("search.curations.hiddenLabel")}
									</label>
									<input
										type="text"
										value={formHidden}
										onChange={(e) => setFormHidden(e.target.value)}
										className="p-2 rounded text-sm w-full border bg-background"
										placeholder={t("search.curations.hiddenPlaceholder")}
									/>
								</div>
							</div>
							<DialogFooter>
								<Button variant="primary" onClick={handleDialogSave}>
									{t("search.curations.dialogSave")}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<Button
						variant="primary"
						onClick={handleSave}
						loading={updateMutation.isPending}
					>
						{t("search.curations.save")}
					</Button>
				</div>
			</div>

			{rules.length === 0 ? (
				<p className="text-sm text-foreground/60">{t("search.curations.empty")}</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("search.curations.queryColumn")}</TableHead>
							<TableHead>{t("search.curations.pinnedColumn")}</TableHead>
							<TableHead>{t("search.curations.hiddenColumn")}</TableHead>
							<TableHead className="w-24 text-right">
								{t("search.curations.tableActions")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rules.map((rule, index) => (
							<TableRow key={index}>
								<TableCell className="font-medium">{rule.query}</TableCell>
								<TableCell className="text-xs max-w-[200px] truncate">
									{rule.pinnedIds.length > 0 ? rule.pinnedIds.join(", ") : "-"}
								</TableCell>
								<TableCell className="text-xs max-w-[200px] truncate">
									{rule.hiddenIds.length > 0 ? rule.hiddenIds.join(", ") : "-"}
								</TableCell>
								<TableCell className="text-right">
									<div className="gap-1 flex justify-end">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => openEditDialog(index)}
										>
											{t("search.curations.edit")}
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleRemoveRule(index)}
										>
											{t("search.curations.remove")}
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
