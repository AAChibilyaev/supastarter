"use client";

import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
import { Switch } from "@repo/ui/components/switch";
import { useTranslations } from "next-intl";
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type FieldType =
	| "string"
	| "int32"
	| "int64"
	| "float"
	| "bool"
	| "string[]"
	| "int32[]"
	| "int64[]"
	| "float[]"
	| "bool[]"
	| "object"
	| "object[]"
	| "auto"
	| "geopoint"
	| "geopoint[]"
	| "geojson";

export type SearchMode = "infix" | "prefix" | "exact";

export interface SchemaField {
	name: string;
	type: FieldType;
	facet?: boolean;
	optional?: boolean;
	index?: boolean;
	sort?: boolean;
	search?: SearchMode;
	defaultValue?: string;
	embed?: {
		from: string[];
		model_config?: {
			model_name?: string;
			api_key?: string;
			api_url?: string;
		};
	};
}

export const FIELD_TYPES: FieldType[] = [
	"string",
	"int32",
	"int64",
	"float",
	"bool",
	"string[]",
	"int32[]",
	"int64[]",
	"float[]",
	"bool[]",
	"object",
	"object[]",
	"auto",
	"geopoint",
	"geopoint[]",
	"geojson",
];

export const SEARCH_MODES: { value: SearchMode; label: string }[] = [
	{ value: "infix", label: "Infix" },
	{ value: "prefix", label: "Prefix" },
	{ value: "exact", label: "Exact" },
];

// ─── Props ──────────────────────────────────────────────────────────────────

interface FieldEditorProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	field: SchemaField;
	onSave: (field: SchemaField) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FieldEditor({ open, onOpenChange, field, onSave }: FieldEditorProps) {
	const t = useTranslations("search.collection.schemaEditor");
	const [draft, setDraft] = useState<SchemaField>({ ...field });

	const handleChange = (patch: Partial<SchemaField>) => {
		setDraft((prev) => ({ ...prev, ...patch }));
	};

	const handleSave = () => {
		if (!draft.name.trim()) return;
		onSave(draft);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{t("editField") || `Edit Field: ${field.name || t("unnamed") || "unnamed"}`}
					</DialogTitle>
				</DialogHeader>

				<div className="gap-4 grid">
					{/* Name */}
					<div className="gap-1.5 grid">
						<Label className="text-sm">{t("name") || "Name"}</Label>
						<Input
							value={draft.name}
							onChange={(e) => handleChange({ name: e.target.value })}
							className="font-mono text-sm"
							placeholder="field_name"
						/>
					</div>

					<div className="gap-3 grid grid-cols-2">
						{/* Type */}
						<div className="gap-1.5 grid">
							<Label className="text-sm">{t("type") || "Type"}</Label>
							<Select
								value={draft.type}
								onValueChange={(v) => handleChange({ type: v as FieldType })}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{FIELD_TYPES.map((ft) => (
										<SelectItem key={ft} value={ft}>
											{ft}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Search Mode */}
						<div className="gap-1.5 grid">
							<Label className="text-sm">{t("searchMode") || "Search mode"}</Label>
							<Select
								value={draft.search ?? "infix"}
								onValueChange={(v) => handleChange({ search: v as SearchMode })}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SEARCH_MODES.map((m) => (
										<SelectItem key={m.value} value={m.value}>
											{m.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Default Value */}
					<div className="gap-1.5 grid">
						<Label className="text-sm">{t("defaultValue") || "Default value"}</Label>
						<Input
							value={draft.defaultValue ?? ""}
							onChange={(e) => handleChange({ defaultValue: e.target.value })}
							className="font-mono text-xs"
							placeholder={t("defaultValuePlaceholder") || "Optional default value"}
						/>
					</div>

					{/* Toggle switches */}
					<div className="gap-3 grid grid-cols-2">
						<div className="gap-2 flex items-center">
							<Switch
								checked={draft.facet ?? false}
								onCheckedChange={(v) => handleChange({ facet: v })}
							/>
							<Label className="text-sm">{t("facet") || "Facet"}</Label>
						</div>
						<div className="gap-2 flex items-center">
							<Switch
								checked={draft.sort ?? false}
								onCheckedChange={(v) => handleChange({ sort: v })}
							/>
							<Label className="text-sm">{t("sort") || "Sort"}</Label>
						</div>
						<div className="gap-2 flex items-center">
							<Switch
								checked={draft.optional ?? false}
								onCheckedChange={(v) => handleChange({ optional: v })}
							/>
							<Label className="text-sm">{t("optional") || "Optional"}</Label>
						</div>
						<div className="gap-2 flex items-center">
							<Switch
								checked={draft.index ?? true}
								onCheckedChange={(v) => handleChange({ index: v })}
							/>
							<Label className="text-sm">{t("indexed") || "Indexed"}</Label>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("cancel") || "Cancel"}
					</Button>
					<Button variant="primary" onClick={handleSave}>
						{t("save") || "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
