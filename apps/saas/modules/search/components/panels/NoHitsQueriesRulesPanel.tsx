"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
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
import { PlusIcon, Trash2, SearchXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";

interface NoHitsQueriesRulesPanelProps {
	organizationId: string;
	slug: string;
}

interface NewRule {
	name: string;
	collection: string;
	destinationCollection: string;
}

const defaultNewRule: NewRule = {
	name: "",
	collection: "",
	destinationCollection: "",
};

export function NoHitsQueriesRulesPanel({ organizationId, slug }: NoHitsQueriesRulesPanelProps) {
	const t = useTranslations("search");
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [newRule, setNewRule] = useState<NewRule>({ ...defaultNewRule });

	const { data: rulesData, isLoading } = useQuery(
		orpc.search.analyticsRules.list.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	const nohitsRules = (rulesData ?? []).filter((r) => r.type === "nohits_queries");

	const createMutation = useMutation({
		...orpc.search.analyticsRules.create.mutationOptions(),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: orpc.search.analyticsRules.list.key(),
			});
			toastSuccess(t("nohitsQueries.created"));
			setDialogOpen(false);
			setNewRule({ ...defaultNewRule });
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("nohitsQueries.createError"));
		},
	});

	const deleteMutation = useMutation({
		...orpc.search.analyticsRules.delete.mutationOptions(),
		onSuccess: (result) => {
			if (result.success) {
				void queryClient.invalidateQueries({
					queryKey: orpc.search.analyticsRules.list.key(),
				});
				toastSuccess(t("nohitsQueries.deleted"));
			} else {
				toastError(t("nohitsQueries.deleteError"));
			}
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("nohitsQueries.deleteError"));
		},
	});

	const handleCreate = () => {
		if (!newRule.name || !newRule.collection || !newRule.destinationCollection) {
			toastError(t("nohitsQueries.required"));
			return;
		}

		createMutation.mutate({
			organizationId,
			name: newRule.name,
			type: "nohits_queries",
			params: {
				source: {
					collections: [newRule.collection],
				},
				destination: {
					collection: newRule.destinationCollection,
				},
			},
		});
	};

	const handleDelete = (ruleName: string) => {
		confirm({
			title: t("nohitsQueries.deleteConfirmTitle"),
			description: t("nohitsQueries.deleteConfirmDesc", { name: ruleName }),
			confirmLabel: t("nohitsQueries.deleteConfirmAction"),
			onConfirm: () => {
				deleteMutation.mutate({ organizationId, name: ruleName });
			},
		});
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="h-40 animate-pulse rounded bg-muted" />
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			<Card>
				<CardContent className="p-6">
					<div className="mb-4 flex items-center justify-between">
						<div>
							<h3 className="text-lg font-medium">{t("nohitsQueries.title")}</h3>
							<p className="text-sm text-muted-foreground">
								{t("nohitsQueries.description")}
							</p>
						</div>
						<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
							<DialogTrigger asChild>
								<Button>
									<PlusIcon className="mr-2 h-4 w-4" />
									{t("nohitsQueries.createRule")}
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-lg">
								<DialogHeader>
									<DialogTitle>
										{t("nohitsQueries.createDialogTitle")}
									</DialogTitle>
									<DialogDescription>
										{t("nohitsQueries.createDialogDesc")}
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label>{t("nohitsQueries.ruleName")}</Label>
										<Input
											placeholder="no-hit-queries-logger"
											value={newRule.name}
											onChange={(e) =>
												setNewRule({ ...newRule, name: e.target.value })
											}
										/>
									</div>
									<div className="space-y-2">
										<Label>{t("nohitsQueries.sourceCollection")}</Label>
										<Select
											value={newRule.collection}
											onValueChange={(v) =>
												setNewRule({ ...newRule, collection: v })
											}
										>
											<SelectTrigger>
												<SelectValue
													placeholder={t(
														"nohitsQueries.selectCollection",
													)}
												/>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={slug}>{slug}</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>{t("nohitsQueries.destinationCollection")}</Label>
										<Input
											placeholder="nohits_log"
											value={newRule.destinationCollection}
											onChange={(e) =>
												setNewRule({
													...newRule,
													destinationCollection: e.target.value,
												})
											}
										/>
										<p className="text-xs text-muted-foreground">
											{t("nohitsQueries.destinationHint")}
										</p>
									</div>
								</div>
								<DialogFooter>
									<Button variant="outline" onClick={() => setDialogOpen(false)}>
										{t("nohitsQueries.cancel")}
									</Button>
									<Button
										onClick={handleCreate}
										loading={createMutation.isPending}
									>
										{t("nohitsQueries.create")}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>

					{nohitsRules.length === 0 ? (
						<EmptyState
							icon={<SearchXIcon className="h-8 w-8" />}
							description={t("nohitsQueries.empty")}
						/>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("nohitsQueries.name")}</TableHead>
									<TableHead>{t("nohitsQueries.sourceCollection")}</TableHead>
									<TableHead>
										{t("nohitsQueries.destinationCollection")}
									</TableHead>
									<TableHead className="w-[80px]">
										{t("nohitsQueries.actions")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{nohitsRules.map((rule) => {
									const params = rule.params as Record<string, unknown>;
									const source = params?.source as
										| { collections?: string[] }
										| undefined;
									const destination = params?.destination as
										| { collection?: string }
										| undefined;
									const sourceCollection = source?.collections?.[0] ?? "-";
									const destCollection = destination?.collection ?? "-";
									return (
										<TableRow key={rule.name}>
											<TableCell className="font-medium">
												{rule.name}
											</TableCell>
											<TableCell>{sourceCollection}</TableCell>
											<TableCell>{destCollection}</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDelete(rule.name)}
													loading={deleteMutation.isPending}
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
