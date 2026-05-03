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
import { Card } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

/** Single facet configuration */
export interface FacetConfig {
	fieldName: string;
	displayName: string;
	sortOrder: "count" | "alpha";
	maxValues: number;
	multiSelect: boolean;
}

interface FacetsPanelProps {
	facetFields: string[];
	configs: FacetConfig[];
	onChange: (configs: FacetConfig[]) => void;
	readOnly?: boolean;
}

// ─── Sortable Facet Row ─────────────────────────────────────────────────────

function SortableFacetRow({
	facet,
	index,
	onUpdate,
	onRemove,
	t,
}: {
	facet: FacetConfig;
	index: number;
	onUpdate: (index: number, patch: Partial<FacetConfig>) => void;
	onRemove: (index: number) => void;
	t: (key: string) => string;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: facet.fieldName,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"gap-3 p-3 flex items-center rounded-lg border bg-card transition-colors",
				isDragging && "shadow-lg opacity-50",
			)}
		>
			{/* Drag handle */}
			<button
				type="button"
				className="size-6 rounded flex shrink-0 cursor-grab items-center justify-center hover:bg-muted"
				{...attributes}
				{...listeners}
			>
				<GripVerticalIcon className="size-4 text-muted-foreground" />
			</button>

			{/* Field name (read-only) */}
			<div className="min-w-0 w-32 shrink-0">
				<p className="font-mono text-xs font-medium truncate">{facet.fieldName}</p>
			</div>

			{/* Display name */}
			<div className="min-w-0 flex-1">
				<input
					type="text"
					value={facet.displayName}
					onChange={(e) => onUpdate(index, { displayName: e.target.value })}
					placeholder={facet.fieldName}
					className="h-8 rounded px-2 text-xs w-full border border-input bg-background"
				/>
			</div>

			{/* Sort order */}
			<div className="w-28 shrink-0">
				<select
					value={facet.sortOrder}
					onChange={(e) =>
						onUpdate(index, { sortOrder: e.target.value as "count" | "alpha" })
					}
					className="h-8 rounded px-1 text-xs w-full border border-input bg-background"
				>
					<option value="count">{t("facetSortCount")}</option>
					<option value="alpha">{t("facetSortAlpha")}</option>
				</select>
			</div>

			{/* Max values */}
			<div className="w-16 shrink-0">
				<input
					type="number"
					min={1}
					max={1000}
					value={facet.maxValues}
					onChange={(e) =>
						onUpdate(index, { maxValues: Math.max(1, Number(e.target.value)) })
					}
					className="h-8 rounded px-2 text-xs w-full border border-input bg-background"
				/>
			</div>

			{/* Multi-select toggle */}
			<label className="gap-1.5 flex shrink-0 cursor-pointer items-center">
				<input
					type="checkbox"
					checked={facet.multiSelect}
					onChange={(e) => onUpdate(index, { multiSelect: e.target.checked })}
					className="size-4 rounded border-input accent-primary"
				/>
				<span className="text-xs text-muted-foreground">{t("facetMulti")}</span>
			</label>

			{/* Remove button */}
			<button
				type="button"
				onClick={() => onRemove(index)}
				className="size-7 rounded flex shrink-0 items-center justify-center hover:bg-destructive/10 hover:text-destructive"
			>
				<Trash2Icon className="size-4" />
			</button>
		</div>
	);
}

// ─── Empty state ────────────────────────────────────────────────────────────

function FacetsEmptyState({ t }: { t: (key: string) => string }) {
	return (
		<div className="py-12 text-center">
			<div className="mb-3 flex justify-center">
				<div className="size-10 flex items-center justify-center rounded-lg bg-muted">
					<GripVerticalIcon className="size-5 text-muted-foreground/40" />
				</div>
			</div>
			<p className="text-sm text-muted-foreground">{t("facetNoFields")}</p>
			<p className="mt-1 text-xs text-muted-foreground/60">{t("facetNoFieldsHint")}</p>
		</div>
	);
}

// ─── Columns Header ─────────────────────────────────────────────────────────

function FacetsHeader({ t }: { t: (key: string) => string }) {
	return (
		<div className="gap-3 px-3 pb-2 md:flex text-xs font-medium hidden items-center text-muted-foreground">
			<div className="w-6 shrink-0" />
			<div className="w-32 shrink-0">{t("facetField")}</div>
			<div className="flex-1">{t("facetDisplayName")}</div>
			<div className="w-28 shrink-0">{t("facetSort")}</div>
			<div className="w-16 shrink-0 text-center">{t("facetMax")}</div>
			<div className="shrink-0" style={{ width: 60 }} />
			<div className="w-7 shrink-0" />
		</div>
	);
}

// ─── FacetsPanel ────────────────────────────────────────────────────────────

export function FacetsPanel({
	facetFields,
	configs,
	onChange,
	readOnly = false,
}: FacetsPanelProps) {
	const t = useTranslations("search.configurator");
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = configs.findIndex((c) => c.fieldName === active.id);
		const newIndex = configs.findIndex((c) => c.fieldName === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const updated = [...configs];
		const [moved] = updated.splice(oldIndex, 1);
		updated.splice(newIndex, 0, moved);
		onChange(updated);
	};

	const handleUpdate = (index: number, patch: Partial<FacetConfig>) => {
		const updated = configs.map((c, i) => (i === index ? { ...c, ...patch } : c));
		onChange(updated);
	};

	const handleRemove = (index: number) => {
		const updated = configs.filter((_, i) => i !== index);
		onChange(updated);
	};

	const handleAddAll = () => {
		const existingNames = new Set(configs.map((c) => c.fieldName));
		const toAdd = facetFields.filter((f) => !existingNames.has(f));
		if (toAdd.length === 0) return;

		const newConfigs: FacetConfig[] = toAdd.map((fieldName) => ({
			fieldName,
			displayName: fieldName,
			sortOrder: "count" as const,
			maxValues: 10,
			multiSelect: true,
		}));
		onChange([...configs, ...newConfigs]);
	};

	if (facetFields.length === 0) {
		return <FacetsEmptyState t={t} />;
	}

	return (
		<div className="space-y-3">
			<div className="gap-2 flex items-center justify-between">
				<p className="text-xs text-muted-foreground">
					{t("facetFieldsAvailable", { count: facetFields.length })}
				</p>
				{!readOnly && (
					<Button variant="outline" size="sm" onClick={handleAddAll}>
						<PlusIcon className="mr-1 size-3" />
						{t("facetAddAll")}
					</Button>
				)}
			</div>

			{configs.length === 0 ? (
				<Card>
					<div className="p-6 text-center">
						<p className="text-sm text-muted-foreground">{t("facetNoneSelected")}</p>
						<Button
							variant="secondary"
							size="sm"
							className="mt-3"
							onClick={handleAddAll}
							disabled={readOnly}
						>
							{t("facetAddAll")}
						</Button>
					</div>
				</Card>
			) : (
				<div className="space-y-1">
					<FacetsHeader t={t} />
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<SortableContext
							items={configs.map((c) => c.fieldName)}
							strategy={verticalListSortingStrategy}
						>
							{configs.map((facet, idx) => (
								<SortableFacetRow
									key={facet.fieldName}
									facet={facet}
									index={idx}
									onUpdate={handleUpdate}
									onRemove={handleRemove}
									t={t}
								/>
							))}
						</SortableContext>
					</DndContext>
				</div>
			)}
		</div>
	);
}
