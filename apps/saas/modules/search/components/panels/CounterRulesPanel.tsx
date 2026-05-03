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
import { BarChart3Icon, PlusIcon, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";

interface CounterRulesPanelProps {
	organizationId: string;
	slug: string;
}

interface NewCounterRule {
	name: string;
	sourceCollection: string;
	eventType: string;
	eventWeight: string;
	eventName: string;
	counterField: string;
}

const defaultNewRule: NewCounterRule = {
	name: "",
	sourceCollection: "",
	eventType: "click",
	eventWeight: "1",
	eventName: "",
	counterField: "",
};

export function CounterRulesPanel({ organizationId, slug }: CounterRulesPanelProps) {
	const t = useTranslations("search");
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [newRule, setNewRule] = useState<NewCounterRule>({ ...defaultNewRule });

	const { data: schemaData } = useQuery(
		orpc.search.schema.get.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);

	const numericFields =
		schemaData?.fields?.filter(
			(f) => f.type === "int32" || f.type === "int64" || f.type === "float",
		) ?? [];

	const { data: rulesData, isLoading } = useQuery(
		orpc.search.analyticsRules.list.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	const counterRules = (rulesData ?? []).filter((r) => r.type === "counter");

	const createMutation = useMutation({
		...orpc.search.analyticsRules.create.mutationOptions(),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: orpc.search.analyticsRules.list.key(),
			});
			toastSuccess(t("counterRules.created"));
			setDialogOpen(false);
			setNewRule({ ...defaultNewRule });
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("counterRules.createError"));
		},
	});

	const deleteMutation = useMutation({
		...orpc.search.analyticsRules.delete.mutationOptions(),
		onSuccess: (result) => {
			if (result.success) {
				void queryClient.invalidateQueries({
					queryKey: orpc.search.analyticsRules.list.key(),
				});
				toastSuccess(t("counterRules.deleted"));
			} else {
				toastError(t("counterRules.deleteError"));
			}
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("counterRules.deleteError"));
		},
	});

	const handleCreate = () => {
		if (!newRule.name || !newRule.sourceCollection || !newRule.counterField) {
			toastError(t("counterRules.required"));
			return;
		}

		const eventName = newRule.eventName || `${newRule.name}-event`;

		createMutation.mutate({
			organizationId,
			name: newRule.name,
			type: "counter",
			params: {
				source: {
					collections: [newRule.sourceCollection],
					events: [
						{
							type: newRule.eventType,
							weight: Number.parseInt(newRule.eventWeight, 10) || 1,
							name: eventName,
						},
					],
				},
				destination: {
					collection: newRule.sourceCollection,
					counter_field: newRule.counterField,
				},
			},
		});
	};

	const handleDelete = (ruleName: string) => {
		confirm({
			title: t("counterRules.deleteConfirmTitle"),
			description: t("counterRules.deleteConfirmDesc", { name: ruleName }),
			confirmLabel: t("counterRules.deleteConfirmAction"),
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
							<h3 className="text-lg font-medium">{t("counterRules.title")}</h3>
							<p className="text-sm text-muted-foreground">{t("counterRules.description")}</p>
						</div>
						<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
							<DialogTrigger asChild>
								<Button>
									<PlusIcon className="mr-2 h-4 w-4" />
									{t("counterRules.createRule")}
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-lg">
								<DialogHeader>
									<DialogTitle>{t("counterRules.createDialogTitle")}</DialogTitle>
									<DialogDescription>{t("counterRules.createDialogDesc")}</DialogDescription>
								</DialogHeader>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label>{t("counterRules.ruleName")}</Label>
										<Input
											placeholder="products-click-counter"
											value={newRule.name}
											onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
										/>
									</div>
									<div className="space-y-2">
										<Label>{t("counterRules.sourceCollection")}</Label>
										<Select
											value={newRule.sourceCollection}
											onValueChange={(v) => setNewRule({ ...newRule, sourceCollection: v })}
										>
											<SelectTrigger>
												<SelectValue placeholder={t("counterRules.selectCollection")} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={slug}>{slug}</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="gap-4 grid grid-cols-2">
										<div className="space-y-2">
											<Label>{t("counterRules.eventType")}</Label>
											<Select
												value={newRule.eventType}
												onValueChange={(v) => setNewRule({ ...newRule, eventType: v })}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="click">{t("counterRules.eventClick")}</SelectItem>
													<SelectItem value="conversion">
														{t("counterRules.eventConversion")}
													</SelectItem>
													<SelectItem value="visit">{t("counterRules.eventVisit")}</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label>{t("counterRules.eventWeight")}</Label>
											<Input
												type="number"
												min="1"
												max="1000"
												value={newRule.eventWeight}
												onChange={(e) =>
													setNewRule({
														...newRule,
														eventWeight: e.target.value,
													})
												}
											/>
										</div>
									</div>
									<div className="space-y-2">
										<Label>{t("counterRules.eventName")}</Label>
										<Input
											placeholder={t("counterRules.eventNamePlaceholder")}
											value={newRule.eventName}
											onChange={(e) =>
												setNewRule({
													...newRule,
													eventName: e.target.value,
												})
											}
										/>
										<p className="text-xs text-muted-foreground">
											{t("counterRules.eventNameHint")}
										</p>
									</div>
									<div className="space-y-2">
										<Label>{t("counterRules.counterField")}</Label>
										<Select
											value={newRule.counterField}
											onValueChange={(v) => setNewRule({ ...newRule, counterField: v })}
										>
											<SelectTrigger>
												<SelectValue placeholder={t("counterRules.selectField")} />
											</SelectTrigger>
											<SelectContent>
												{numericFields.length === 0 && (
													<SelectItem value="__add_new__" disabled>
														{t("counterRules.noNumericFields")}
													</SelectItem>
												)}
												{numericFields.map((f) => (
													<SelectItem key={f.name} value={f.name}>
														{f.name} ({f.type})
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{!newRule.counterField && (
											<p className="text-xs text-muted-foreground">
												{t("counterRules.counterFieldHint")}
											</p>
										)}
									</div>
								</div>
								<DialogFooter>
									<Button variant="outline" onClick={() => setDialogOpen(false)}>
										{t("counterRules.cancel")}
									</Button>
									<Button onClick={handleCreate} loading={createMutation.isPending}>
										{t("counterRules.create")}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>

					{counterRules.length === 0 ? (
						<EmptyState
							icon={<BarChart3Icon className="h-8 w-8" />}
							description={t("counterRules.empty")}
						/>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("counterRules.name")}</TableHead>
									<TableHead>{t("counterRules.eventType")}</TableHead>
									<TableHead>{t("counterRules.counterField")}</TableHead>
									<TableHead className="w-[80px]">{t("counterRules.actions")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{counterRules.map((rule) => {
									const params = rule.params as Record<string, unknown>;
									const source = params?.source as
										| {
												collections?: string[];
												events?: Array<{ type?: string }>;
										  }
										| undefined;
									const destination = params?.destination as { counter_field?: string } | undefined;
									const eventType = source?.events?.[0]?.type ?? "-";
									const counterField = destination?.counter_field ?? "-";
									return (
										<TableRow key={rule.name}>
											<TableCell className="font-medium">{rule.name}</TableCell>
											<TableCell>{eventType}</TableCell>
											<TableCell>{counterField}</TableCell>
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

			{counterRules.length > 0 && (
				<Card>
					<CardContent className="p-6">
						<h4 className="mb-2 text-sm font-medium">{t("counterRules.usageTitle")}</h4>
						<div className="p-3 font-mono text-xs rounded-md bg-muted">
							<code>sort_by: counter_field_name:desc, _text_match:desc</code>
						</div>
						<p className="mt-2 text-xs text-muted-foreground">{t("counterRules.usageHint")}</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
