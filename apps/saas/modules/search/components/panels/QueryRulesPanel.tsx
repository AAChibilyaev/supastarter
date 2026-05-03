"use client";

import {
	DndContext,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Switch } from "@repo/ui/components/switch";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDownIcon, GripVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";
import type { QueryRule } from "../dialogs/query-rule-types";
import { RuleEditorDialog } from "../dialogs/RuleEditorDialog";

// ─── Sortable Rule Row ──────────────────────────────────────────────────────

function SortableRuleRow({
	rule,
	onToggle,
	onEdit,
	onDelete,
}: {
	rule: QueryRule;
	onToggle: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const t = useTranslations();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: rule.id,
	});
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const actionLabels: Record<string, string> = {
		pin: t("search.queryRules.actionPin"),
		hide: t("search.queryRules.actionHide"),
		boost: t("search.queryRules.actionBoost"),
		bury: t("search.queryRules.actionBury"),
		add_filter: t("search.queryRules.actionAddFilter"),
		redirect: t("search.queryRules.actionRedirect"),
		show_message: t("search.queryRules.actionShowMessage"),
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="gap-3 p-3 flex items-center rounded-lg border bg-card"
		>
			<button
				type="button"
				className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
				{...attributes}
				{...listeners}
			>
				<GripVerticalIcon className="size-4" />
			</button>

			<Switch checked={rule.enabled} onCheckedChange={onToggle} />

			<div className="min-w-0 flex-1">
				<div className="gap-2 flex items-center">
					<span
						className={`font-medium text-sm ${!rule.enabled ? "text-muted-foreground line-through" : ""}`}
					>
						{rule.name}
					</span>
					<span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
						#{rule.priority}
					</span>
				</div>
				<p className="text-xs mt-0.5 truncate text-foreground/60">
					{rule.conditions.length}{" "}
					{t("search.queryRules.conditionCount", { count: rule.conditions.length })} ·{" "}
					{rule.actions.length}{" "}
					{t("search.queryRules.actionCount", { count: rule.actions.length })} ·{" "}
					{rule.actions.map((a) => actionLabels[a.type] ?? a.type).join(", ")}
				</p>
			</div>

			<Button variant="ghost" size="sm" onClick={onEdit}>
				<PencilIcon className="size-4" />
			</Button>
			<Button variant="ghost" size="sm" onClick={onDelete}>
				<Trash2Icon className="size-4 text-destructive" />
			</Button>
		</div>
	);
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

interface QueryRulesPanelProps {
	organizationId: string;
	slug: string;
}

export function QueryRulesPanel({ organizationId, slug }: QueryRulesPanelProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingRule, setEditingRule] = useState<QueryRule | undefined>(undefined);

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

	const { data, isLoading } = useQuery(
		orpc.search.queryRules.get.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);

	const rules = data?.rules ?? [];

	const mutation = useMutation({
		...orpc.search.queryRules.update.mutationOptions(),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: orpc.search.queryRules.get.queryKey({
					input: { organizationId, slug },
				}),
			});
			toastSuccess(t("search.queryRules.saved"));
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("search.queryRules.error"));
		},
	});

	const handleSave = (rule: QueryRule) => {
		let updated: QueryRule[];
		const existingIndex = rules.findIndex((r) => r.id === rule.id);
		if (existingIndex >= 0) {
			updated = rules.map((r, i) => (i === existingIndex ? rule : r));
		} else {
			updated = [...rules, rule];
		}
		mutation.mutate({ organizationId, slug, rules: updated });
		setEditingRule(undefined);
	};

	const handleToggle = (ruleId: string) => {
		const updated = rules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
		mutation.mutate({ organizationId, slug, rules: updated });
	};

	const handleDelete = (rule: QueryRule) => {
		confirm({
			title: t("search.queryRules.deleteConfirmTitle"),
			message: t("search.queryRules.deleteConfirmMessage", { name: rule.name }),
			destructive: true,
			onConfirm: () => {
				const updated = rules.filter((r) => r.id !== rule.id);
				mutation.mutate({ organizationId, slug, rules: updated });
			},
		});
	};

	const handleEdit = (rule: QueryRule) => {
		setEditingRule(rule);
		setDialogOpen(true);
	};

	const handleCreate = () => {
		setEditingRule(undefined);
		setDialogOpen(true);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = rules.findIndex((r) => r.id === active.id);
		const newIndex = rules.findIndex((r) => r.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const reordered = [...rules];
		const [moved] = reordered.splice(oldIndex, 1);
		reordered.splice(newIndex, 0, moved);

		// Update priorities based on new ordering
		const withPriorities = reordered.map((r, i) => ({
			...r,
			priority: (i + 1) * 100,
		}));

		mutation.mutate({ organizationId, slug, rules: withPriorities });
	};

	if (isLoading) {
		return <div className="text-foreground/60">{t("search.loading")}</div>;
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>{t("search.queryRules.title")}</CardTitle>
				<Button onClick={handleCreate} size="sm">
					<PlusIcon className="size-4 mr-1" />
					{t("search.queryRules.createRule")}
				</Button>
			</CardHeader>
			<CardContent className="space-y-4">
				{rules.length === 0 ? (
					<EmptyState
						title={t("search.queryRules.empty")}
						description={t("search.queryRules.emptyDescription")}
						icon={ArrowUpDownIcon}
					/>
				) : (
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<SortableContext
							items={rules.map((r) => r.id)}
							strategy={verticalListSortingStrategy}
						>
							<div className="space-y-2">
								{rules.map((rule) => (
									<SortableRuleRow
										key={rule.id}
										rule={rule}
										onToggle={() => handleToggle(rule.id)}
										onEdit={() => handleEdit(rule)}
										onDelete={() => handleDelete(rule)}
									/>
								))}
							</div>
						</SortableContext>
					</DndContext>
				)}
			</CardContent>

			<RuleEditorDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				rule={editingRule}
				onSave={handleSave}
			/>
		</Card>
	);
}
