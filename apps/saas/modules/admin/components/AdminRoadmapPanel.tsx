"use client";

import { Badge } from "@repo/ui/components/badge";
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
import { Skeleton } from "@repo/ui/components/skeleton";
import { Textarea } from "@repo/ui/components/textarea";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CheckCircleIcon,
	ClockIcon,
	KanbanIcon,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import type { ComponentType } from "react";

const STATUS_ICONS: Record<string, ComponentType<{ className?: string }>> = {
	shipped: CheckCircleIcon,
	inProgress: ClockIcon,
	planned: KanbanIcon,
};

interface RoadmapItem {
	id: string;
	key: string;
	title: string;
	description: string;
	status: "shipped" | "inProgress" | "planned";
	quarter: string;
	iconName: string;
	voteCount: number;
	sortOrder: number;
	changelogSlug: string | null;
}

interface FormState {
	key: string;
	title: string;
	description: string;
	status: "shipped" | "inProgress" | "planned";
	quarter: string;
	iconName: string;
	sortOrder: number;
	changelogSlug: string;
}

const EMPTY_FORM: FormState = {
	key: "",
	title: "",
	description: "",
	status: "planned",
	quarter: "",
	iconName: "",
	sortOrder: 0,
	changelogSlug: "",
};

function RoadmapItemCard({
	item,
	onEdit,
	onDelete,
	onMoveUp,
	onMoveDown,
	isFirst,
	isLast,
}: {
	item: RoadmapItem;
	onEdit: (item: RoadmapItem) => void;
	onDelete: (id: string) => void;
	onMoveUp: (id: string) => void;
	onMoveDown: (id: string) => void;
	isFirst: boolean;
	isLast: boolean;
}) {
	const StatusIcon = STATUS_ICONS[item.status] ?? KanbanIcon;

	const statusBadgeVariant: Record<string, "success" | "info" | "warning" | "error"> = {
		shipped: "success",
		inProgress: "info",
		planned: "warning",
	};

	return (
		<Card className="rounded-md">
			<CardContent className="p-4 gap-3 flex items-center">
				<div className="gap-1 flex flex-col">
					<button
						type="button"
						onClick={() => onMoveUp(item.id)}
						disabled={isFirst}
						className="p-0.5 cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-20"
					>
						<ArrowUpIcon className="size-3" />
					</button>
					<button
						type="button"
						onClick={() => onMoveDown(item.id)}
						disabled={isLast}
						className="p-0.5 cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-20"
					>
						<ArrowDownIcon className="size-3" />
					</button>
				</div>

				<div className="gap-1 min-w-0 grid flex-1 grid-cols-1">
					<div className="gap-2 flex items-center">
						<StatusIcon className="size-4 text-muted-foreground" />
						<span className="font-medium text-sm truncate">{item.title}</span>
						<Badge
							status={statusBadgeVariant[item.status]}
							className="px-1.5 py-0 text-[10px]"
						>
							{item.status}
						</Badge>
						<span className="text-[11px] text-muted-foreground">{item.quarter}</span>
					</div>
					<p className="text-xs truncate text-muted-foreground">
						{item.key} &middot; {item.iconName} &middot; {item.voteCount} votes
					</p>
				</div>

				<div className="gap-1 flex shrink-0 items-center">
					<Button
						variant="ghost"
						size="icon"
						className="size-7"
						onClick={() => onEdit(item)}
					>
						<PencilIcon className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 text-destructive hover:text-destructive"
						onClick={() => onDelete(item.id)}
					>
						<Trash2Icon className="size-3.5" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function RoadmapItemForm({
	form,
	onChange,
	onSave,
	onCancel,
	isSaving,
	isEditing,
}: {
	form: FormState;
	onChange: (patch: Partial<FormState>) => void;
	onSave: () => void;
	onCancel: () => void;
	isSaving: boolean;
	isEditing: boolean;
}) {
	const t = useTranslations("admin.roadmap");

	return (
		<div className="gap-4 grid grid-cols-1">
			<div className="gap-2 grid grid-cols-2">
				<div className="gap-1.5 grid grid-cols-1">
					<Label htmlFor="key">{t("form.key")}</Label>
					<Input
						id="key"
						value={form.key}
						onChange={(e) => onChange({ key: e.target.value })}
						placeholder="e.g. vectorSearch"
					/>
				</div>
				<div className="gap-1.5 grid grid-cols-1">
					<Label htmlFor="iconName">{t("form.iconName")}</Label>
					<Input
						id="iconName"
						value={form.iconName}
						onChange={(e) => onChange({ iconName: e.target.value })}
						placeholder="e.g. SparklesIcon"
					/>
				</div>
			</div>

			<div className="gap-1.5 grid grid-cols-1">
				<Label htmlFor="title">{t("form.title")}</Label>
				<Input
					id="title"
					value={form.title}
					onChange={(e) => onChange({ title: e.target.value })}
				/>
			</div>

			<div className="gap-1.5 grid grid-cols-1">
				<Label htmlFor="description">{t("form.description")}</Label>
				<Textarea
					id="description"
					value={form.description}
					onChange={(e) => onChange({ description: e.target.value })}
					rows={3}
				/>
			</div>

			<div className="gap-2 grid grid-cols-2">
				<div className="gap-1.5 grid grid-cols-1">
					<Label htmlFor="status">{t("form.status")}</Label>
					<Select
						value={form.status}
						onValueChange={(v: "shipped" | "inProgress" | "planned") =>
							onChange({ status: v })
						}
					>
						<SelectTrigger id="status">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="shipped">{t("status.shipped")}</SelectItem>
							<SelectItem value="inProgress">{t("status.inProgress")}</SelectItem>
							<SelectItem value="planned">{t("status.planned")}</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="gap-1.5 grid grid-cols-1">
					<Label htmlFor="quarter">{t("form.quarter")}</Label>
					<Input
						id="quarter"
						value={form.quarter}
						onChange={(e) => onChange({ quarter: e.target.value })}
						placeholder="e.g. Q2 2026"
					/>
				</div>
			</div>

			<div className="gap-1.5 grid grid-cols-1">
				<Label htmlFor="changelogSlug">{t("form.changelogSlug")}</Label>
				<Input
					id="changelogSlug"
					value={form.changelogSlug}
					onChange={(e) => onChange({ changelogSlug: e.target.value })}
					placeholder={t("form.changelogSlugPlaceholder")}
				/>
			</div>

			<DialogFooter>
				<Button variant="outline" onClick={onCancel} disabled={isSaving}>
					{t("form.cancel")}
				</Button>
				<Button
					onClick={onSave}
					disabled={isSaving || !form.key || !form.title || !form.description}
				>
					{isSaving ? t("form.saving") : isEditing ? t("form.save") : t("form.create")}
				</Button>
			</DialogFooter>
		</div>
	);
}

export function AdminRoadmapPanel() {
	const t = useTranslations("admin.roadmap");
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [isSaving, setIsSaving] = useState(false);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	const { data, isLoading } = useQuery(orpc.admin.roadmap.list.queryOptions({ input: {} }));

	const items = useMemo(() => data?.items ?? [], [data?.items]);

	const handleAdd = useCallback(() => {
		setEditingItem(null);
		setForm({ ...EMPTY_FORM, sortOrder: items.length });
		setDialogOpen(true);
	}, [items.length]);

	const handleEdit = useCallback((item: RoadmapItem) => {
		setEditingItem(item);
		setForm({
			key: item.key,
			title: item.title,
			description: item.description,
			status: item.status,
			quarter: item.quarter,
			iconName: item.iconName,
			sortOrder: item.sortOrder,
			changelogSlug: item.changelogSlug ?? "",
		});
		setDialogOpen(true);
	}, []);

	const handleSave = useCallback(async () => {
		setIsSaving(true);
		try {
			if (editingItem) {
				await orpc.admin.roadmap.update.call({
					id: editingItem.id,
					...form,
					changelogSlug: form.changelogSlug || null,
				});
			} else {
				await orpc.admin.roadmap.create.call({
					...form,
					changelogSlug: form.changelogSlug || null,
				});
			}
			void queryClient.invalidateQueries({
				queryKey: orpc.admin.roadmap.list.queryOptions({ input: {} }).queryKey,
			});
			setDialogOpen(false);
		} catch (err) {
			console.error("Failed to save roadmap item", err);
		} finally {
			setIsSaving(false);
		}
	}, [editingItem, form, queryClient]);

	const handleDelete = useCallback(async (id: string) => {
		setDeleteConfirmId(id);
	}, []);

	const confirmDelete = useCallback(async () => {
		if (!deleteConfirmId) return;
		try {
			await orpc.admin.roadmap.delete.call({ id: deleteConfirmId });
			void queryClient.invalidateQueries({
				queryKey: orpc.admin.roadmap.list.queryOptions({ input: {} }).queryKey,
			});
		} catch (err) {
			console.error("Failed to delete roadmap item", err);
		}
		setDeleteConfirmId(null);
	}, [deleteConfirmId, queryClient]);

	const handleMoveUp = useCallback(
		async (id: string) => {
			const idx = items.findIndex((i) => i.id === id);
			if (idx <= 0) return;
			const newIds = items.map((i) => i.id);
			[newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]];
			try {
				await orpc.admin.roadmap.reorder.call({ ids: newIds });
				queryClient.invalidateQueries({
					queryKey: orpc.admin.roadmap.list.queryOptions({ input: {} }).queryKey,
				});
			} catch (err) {
				console.error("Failed to reorder roadmap items", err);
			}
		},
		[items, queryClient],
	);

	const handleMoveDown = useCallback(
		async (id: string) => {
			const idx = items.findIndex((i) => i.id === id);
			if (idx < 0 || idx >= items.length - 1) return;
			const newIds = items.map((i) => i.id);
			[newIds[idx], newIds[idx + 1]] = [newIds[idx + 1], newIds[idx]];
			try {
				await orpc.admin.roadmap.reorder.call({ ids: newIds });
				queryClient.invalidateQueries({
					queryKey: orpc.admin.roadmap.list.queryOptions({ input: {} }).queryKey,
				});
			} catch (err) {
				console.error("Failed to reorder roadmap items", err);
			}
		},
		[items, queryClient],
	);

	return (
		<div className="gap-6 grid grid-cols-1">
			{/* Toolbar */}
			<div className="gap-2 flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{t("itemsCount", { count: items.length })}
				</p>
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger asChild>
						<Button onClick={handleAdd}>
							<PlusIcon className="size-4 mr-1.5" />
							{t("addItem")}
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-lg">
						<DialogHeader>
							<DialogTitle>
								{editingItem ? t("editTitle") : t("createTitle")}
							</DialogTitle>
							<DialogDescription>
								{editingItem ? t("editDescription") : t("createDescription")}
							</DialogDescription>
						</DialogHeader>
						<RoadmapItemForm
							form={form}
							onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
							onSave={handleSave}
							onCancel={() => setDialogOpen(false)}
							isSaving={isSaving}
							isEditing={!!editingItem}
						/>
					</DialogContent>
				</Dialog>
			</div>

			{/* Delete confirmation */}
			<Dialog
				open={!!deleteConfirmId}
				onOpenChange={(o) => {
					if (!o) setDeleteConfirmId(null);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{t("confirmDelete.title")}</DialogTitle>
						<DialogDescription>{t("confirmDelete.message")}</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
							{t("confirmDelete.cancel")}
						</Button>
						<Button variant="destructive" onClick={confirmDelete}>
							{t("confirmDelete.confirm")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* List */}
			{isLoading ? (
				<div className="gap-2 grid grid-cols-1">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-14 w-full rounded-md" />
					))}
				</div>
			) : items.length === 0 ? (
				<Card>
					<CardContent className="p-8 text-center">
						<p className="text-sm text-muted-foreground">{t("empty")}</p>
					</CardContent>
				</Card>
			) : (
				<div className="gap-2 grid grid-cols-1">
					{items.map((item, index) => (
						<RoadmapItemCard
							key={item.id}
							item={item}
							onEdit={handleEdit}
							onDelete={handleDelete}
							onMoveUp={handleMoveUp}
							onMoveDown={handleMoveDown}
							isFirst={index === 0}
							isLast={index === items.length - 1}
						/>
					))}
				</div>
			)}
		</div>
	);
}
