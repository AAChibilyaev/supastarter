"use client";

import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { Textarea } from "@repo/ui/components/textarea";
import { toastError } from "@repo/ui/components/toast";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import type { QueryRule } from "./query-rule-types";

// ─── Default values ────────────────────────────────────────────────────────

function createEmptyRule(): QueryRule {
	return {
		id: crypto.randomUUID(),
		name: "",
		enabled: true,
		priority: 100,
		matchMode: "and",
		applyOnMultipleMatch: false,
		conditions: [{ field: "query", operator: "contains", value: "" }],
		actions: [{ type: "pin", documentId: "", position: 1 }],
	};
}

// ─── Step components ────────────────────────────────────────────────────────

function ConditionsStep({
	rule,
	onChange,
}: {
	rule: QueryRule;
	onChange: (rule: QueryRule) => void;
}) {
	const t = useTranslations();

	const addCondition = () => {
		onChange({
			...rule,
			conditions: [...rule.conditions, { field: "query", operator: "contains", value: "" }],
		});
	};

	const removeCondition = (index: number) => {
		if (rule.conditions.length <= 1) return;
		onChange({
			...rule,
			conditions: rule.conditions.filter((_, i) => i !== index),
		});
	};

	const updateCondition = (index: number, field: string, value: string) => {
		const updated = rule.conditions.map((c, i) => (i === index ? { ...c, [field]: value } : c));
		onChange({ ...rule, conditions: updated });
	};

	return (
		<div className="space-y-4">
			<div className="gap-2 flex items-center">
				<Label>{t("search.queryRules.matchMode")}</Label>
				<Select
					value={rule.matchMode}
					onValueChange={(v) => onChange({ ...rule, matchMode: v as "and" | "or" })}
				>
					<SelectTrigger className="w-24">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="and">AND</SelectItem>
						<SelectItem value="or">OR</SelectItem>
					</SelectContent>
				</Select>
				<span className="text-sm text-foreground/60">
					{t("search.queryRules.matchModeHint")}
				</span>
			</div>

			<div className="space-y-3">
				{rule.conditions.map((condition, index) => (
					<div key={index} className="gap-2 p-3 flex items-start rounded-lg border">
						<div className="space-y-2 flex-1">
							<div className="gap-2 flex items-center">
								{index > 0 && (
									<span className="text-xs font-medium w-8 text-muted-foreground uppercase">
										{rule.matchMode}
									</span>
								)}
								<span className="text-sm font-medium">
									{t("search.queryRules.when")}
								</span>
								<Select
									value={condition.field}
									onValueChange={(v) => updateCondition(index, "field", v)}
								>
									<SelectTrigger className="w-36">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="query">
											{t("search.queryRules.fieldQuery")}
										</SelectItem>
										<SelectItem value="query_string">
											{t("search.queryRules.fieldQueryString")}
										</SelectItem>
										<SelectItem value="attribute">
											{t("search.queryRules.fieldAttribute")}
										</SelectItem>
									</SelectContent>
								</Select>

								<Select
									value={condition.operator}
									onValueChange={(v) => updateCondition(index, "operator", v)}
								>
									<SelectTrigger className="w-36">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="contains">
											{t("search.queryRules.opContains")}
										</SelectItem>
										<SelectItem value="not_contains">
											{t("search.queryRules.opNotContains")}
										</SelectItem>
										<SelectItem value="starts_with">
											{t("search.queryRules.opStartsWith")}
										</SelectItem>
										<SelectItem value="ends_with">
											{t("search.queryRules.opEndsWith")}
										</SelectItem>
										<SelectItem value="exact">
											{t("search.queryRules.opExact")}
										</SelectItem>
										<SelectItem value="is_empty">
											{t("search.queryRules.opIsEmpty")}
										</SelectItem>
										<SelectItem value="is_not_empty">
											{t("search.queryRules.opIsNotEmpty")}
										</SelectItem>
										<SelectItem value="regex">
											{t("search.queryRules.opRegex")}
										</SelectItem>
									</SelectContent>
								</Select>

								{condition.operator !== "is_empty" &&
									condition.operator !== "is_not_empty" && (
										<Input
											value={condition.value ?? ""}
											onChange={(e) =>
												updateCondition(index, "value", e.target.value)
											}
											placeholder={t("search.queryRules.valuePlaceholder")}
											className="flex-1"
										/>
									)}
							</div>
						</div>
						{rule.conditions.length > 1 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => removeCondition(index)}
							>
								<Trash2Icon className="size-4" />
							</Button>
						)}
					</div>
				))}
			</div>

			<Button variant="outline" size="sm" onClick={addCondition}>
				<PlusIcon className="size-4 mr-1" />
				{t("search.queryRules.addCondition")}
			</Button>
		</div>
	);
}

function ActionsStep({ rule, onChange }: { rule: QueryRule; onChange: (rule: QueryRule) => void }) {
	const t = useTranslations();

	const addAction = () => {
		onChange({
			...rule,
			actions: [...rule.actions, { type: "pin", documentId: "", position: 1 }],
		});
	};

	const removeAction = (index: number) => {
		if (rule.actions.length <= 1) return;
		onChange({
			...rule,
			actions: rule.actions.filter((_, i) => i !== index),
		});
	};

	const updateAction = (index: number, field: string, value: unknown) => {
		const updated = rule.actions.map((a, i) => (i === index ? { ...a, [field]: value } : a));
		onChange({ ...rule, actions: updated });
	};

	const renderActionFields = (action: QueryRule["actions"][number], index: number) => {
		switch (action.type) {
			case "pin":
				return (
					<div className="gap-2 flex items-center">
						<Input
							value={action.documentId ?? ""}
							onChange={(e) => updateAction(index, "documentId", e.target.value)}
							placeholder={t("search.queryRules.documentIdPlaceholder")}
							className="flex-1"
						/>
						<span className="text-sm text-foreground/60">
							{t("search.queryRules.atPosition")}
						</span>
						<Input
							type="number"
							value={action.position ?? 1}
							onChange={(e) =>
								updateAction(index, "position", parseInt(e.target.value) || 1)
							}
							className="w-20"
							min={1}
						/>
					</div>
				);
			case "hide":
				return (
					<Input
						value={action.documentId ?? ""}
						onChange={(e) => updateAction(index, "documentId", e.target.value)}
						placeholder={t("search.queryRules.documentIdPlaceholder")}
					/>
				);
			case "boost":
			case "bury":
				return (
					<div className="gap-2 flex items-center">
						<Input
							value={action.documentId ?? ""}
							onChange={(e) => updateAction(index, "documentId", e.target.value)}
							placeholder={t("search.queryRules.documentIdPlaceholder")}
							className="flex-1"
						/>
						{action.type === "boost" && (
							<>
								<span className="text-sm text-foreground/60">
									{t("search.queryRules.factor")}
								</span>
								<Input
									type="number"
									value={action.boostFactor ?? 1.5}
									onChange={(e) =>
										updateAction(
											index,
											"boostFactor",
											parseFloat(e.target.value) || 1.5,
										)
									}
									className="w-20"
									min={0.1}
									max={10}
									step={0.1}
								/>
							</>
						)}
					</div>
				);
			case "add_filter":
				return (
					<div className="gap-2 flex items-center">
						<Input
							value={action.filterField ?? ""}
							onChange={(e) => updateAction(index, "filterField", e.target.value)}
							placeholder={t("search.queryRules.filterFieldPlaceholder")}
							className="flex-1"
						/>
						<span className="text-sm text-foreground/60">=</span>
						<Input
							value={action.filterValue ?? ""}
							onChange={(e) => updateAction(index, "filterValue", e.target.value)}
							placeholder={t("search.queryRules.filterValuePlaceholder")}
							className="flex-1"
						/>
					</div>
				);
			case "redirect":
				return (
					<Input
						value={action.url ?? ""}
						onChange={(e) => updateAction(index, "url", e.target.value)}
						placeholder="https://example.com/sale"
					/>
				);
			case "show_message":
				return (
					<Textarea
						value={action.message ?? ""}
						onChange={(e) => updateAction(index, "message", e.target.value)}
						placeholder={t("search.queryRules.messagePlaceholder")}
					/>
				);
		}
	};

	return (
		<div className="space-y-4">
			<div className="space-y-3">
				{rule.actions.map((action, index) => (
					<div key={index} className="space-y-2 p-3 rounded-lg border">
						<div className="gap-2 flex items-center">
							<Select
								value={action.type}
								onValueChange={(v) =>
									updateAction(
										index,
										"type",
										v as QueryRule["actions"][number]["type"],
									)
								}
							>
								<SelectTrigger className="w-44">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="pin">
										{t("search.queryRules.actionPin")}
									</SelectItem>
									<SelectItem value="hide">
										{t("search.queryRules.actionHide")}
									</SelectItem>
									<SelectItem value="boost">
										{t("search.queryRules.actionBoost")}
									</SelectItem>
									<SelectItem value="bury">
										{t("search.queryRules.actionBury")}
									</SelectItem>
									<SelectItem value="add_filter">
										{t("search.queryRules.actionAddFilter")}
									</SelectItem>
									<SelectItem value="redirect">
										{t("search.queryRules.actionRedirect")}
									</SelectItem>
									<SelectItem value="show_message">
										{t("search.queryRules.actionShowMessage")}
									</SelectItem>
								</SelectContent>
							</Select>
							{rule.actions.length > 1 && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeAction(index)}
								>
									<Trash2Icon className="size-4" />
								</Button>
							)}
						</div>
						{renderActionFields(action, index)}
					</div>
				))}
			</div>

			<Button variant="outline" size="sm" onClick={addAction}>
				<PlusIcon className="size-4 mr-1" />
				{t("search.queryRules.addAction")}
			</Button>
		</div>
	);
}

function PriorityStep({
	rule,
	onChange,
}: {
	rule: QueryRule;
	onChange: (rule: QueryRule) => void;
}) {
	const t = useTranslations();

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Label>{t("search.queryRules.priorityLabel")}</Label>
				<p className="text-sm text-foreground/60">{t("search.queryRules.priorityHint")}</p>
				<Input
					type="number"
					value={rule.priority}
					onChange={(e) =>
						onChange({ ...rule, priority: parseInt(e.target.value) || 100 })
					}
					min={1}
					max={9999}
					className="w-32"
				/>
			</div>

			<div className="gap-2 flex items-center">
				<Switch
					checked={rule.applyOnMultipleMatch}
					onCheckedChange={(v) => onChange({ ...rule, applyOnMultipleMatch: v })}
				/>
				<div>
					<Label>{t("search.queryRules.applyMultipleLabel")}</Label>
					<p className="text-sm text-foreground/60">
						{t("search.queryRules.applyMultipleHint")}
					</p>
				</div>
			</div>
		</div>
	);
}

// ─── Preview step ──────────────────────────────────────────────────────────

function PreviewStep({ rule }: { rule: QueryRule }) {
	const t = useTranslations();
	const [testQuery, setTestQuery] = useState("");
	const [showPreview, setShowPreview] = useState(false);

	const togglePreview = useCallback(() => {
		setShowPreview((p) => !p);
	}, []);

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label>{t("search.queryRules.testQueryLabel")}</Label>
				<div className="gap-2 flex">
					<Input
						value={testQuery}
						onChange={(e) => setTestQuery(e.target.value)}
						placeholder={t("search.queryRules.testQueryPlaceholder")}
						className="flex-1"
					/>
					<Button
						variant="secondary"
						onClick={() => setTestQuery("")}
						disabled={!testQuery}
					>
						{t("search.queryRules.clear")}
					</Button>
				</div>
			</div>

			<Button variant="outline" onClick={togglePreview}>
				{t(
					showPreview
						? "search.queryRules.hideRuleSummary"
						: "search.queryRules.showRuleSummary",
				)}
			</Button>

			{showPreview && (
				<div className="md:grid-cols-2 gap-4 grid grid-cols-1">
					<div className="space-y-2 p-4 rounded-lg border bg-muted/30">
						<h4 className="font-medium text-sm">{t("search.queryRules.conditions")}</h4>
						{rule.conditions.map((condition, i) => (
							<div key={i} className="text-xs text-foreground/70">
								{i > 0 && (
									<span className="font-semibold mr-1 uppercase">
										{rule.matchMode}
									</span>
								)}
								{condition.field} {condition.operator}{" "}
								{condition.value ? `"${condition.value}"` : "(empty)"}
							</div>
						))}
					</div>
					<div className="space-y-2 p-4 rounded-lg border bg-muted/30">
						<h4 className="font-medium text-sm">{t("search.queryRules.actions")}</h4>
						{rule.actions.map((action, i) => (
							<div key={i} className="text-xs text-foreground/70">
								{action.type}
								{action.documentId ? `: ${action.documentId}` : ""}
								{action.url ? ` → ${action.url}` : ""}
								{action.message ? `: "${action.message}"` : ""}
								{action.filterField
									? `: ${action.filterField}=${action.filterValue}`
									: ""}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Main Dialog ───────────────────────────────────────────────────────────

interface RuleEditorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	rule?: QueryRule;
	onSave: (rule: QueryRule) => void;
}

export function RuleEditorDialog({ open, onOpenChange, rule, onSave }: RuleEditorDialogProps) {
	const t = useTranslations();
	const [step, setStep] = useState<"conditions" | "actions" | "priority" | "preview">(
		"conditions",
	);
	const [editing, setEditing] = useState<QueryRule>(rule ?? createEmptyRule());
	const isEditing = !!rule;

	// Reset state when dialog opens
	const handleOpenChange = (open: boolean) => {
		if (open) {
			setEditing(rule ?? createEmptyRule());
			setStep("conditions");
		}
		onOpenChange(open);
	};

	const handleSave = () => {
		if (!editing.name.trim()) {
			toastError(t("search.queryRules.nameRequired"));
			return;
		}
		if (editing.conditions.length === 0) {
			toastError(t("search.queryRules.conditionsRequired"));
			return;
		}
		if (editing.actions.length === 0) {
			toastError(t("search.queryRules.actionsRequired"));
			return;
		}
		onSave(editing);
		onOpenChange(false);
	};

	const steps = [
		{ key: "conditions", label: t("search.queryRules.stepConditions") },
		{ key: "actions", label: t("search.queryRules.stepActions") },
		{ key: "priority", label: t("search.queryRules.stepPriority") },
		{ key: "preview", label: t("search.queryRules.stepPreview") },
	] as const;

	const currentIndex = steps.findIndex((s) => s.key === step);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditing
							? t("search.queryRules.editRule")
							: t("search.queryRules.createRule")}
					</DialogTitle>
					<DialogDescription>
						{t("search.queryRules.dialogDescription")}
					</DialogDescription>
				</DialogHeader>

				{/* Rule name */}
				<div className="space-y-2">
					<Label>{t("search.queryRules.ruleName")}</Label>
					<Input
						value={editing.name}
						onChange={(e) => setEditing({ ...editing, name: e.target.value })}
						placeholder={t("search.queryRules.ruleNamePlaceholder")}
					/>
				</div>

				{/* Step indicator */}
				<div className="gap-1 flex">
					{steps.map((s, i) => (
						<button
							key={s.key}
							type="button"
							className={`text-xs py-1.5 flex-1 rounded-full text-center transition-colors ${
								i <= currentIndex
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground"
							}`}
							onClick={() => setStep(s.key)}
						>
							{s.label}
						</button>
					))}
				</div>

				{/* Step content */}
				<div className="min-h-[200px]">
					{step === "conditions" && (
						<ConditionsStep rule={editing} onChange={setEditing} />
					)}
					{step === "actions" && <ActionsStep rule={editing} onChange={setEditing} />}
					{step === "priority" && <PriorityStep rule={editing} onChange={setEditing} />}
					{step === "preview" && <PreviewStep rule={editing} />}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => {
							if (currentIndex > 0) {
								setStep(steps[currentIndex - 1].key);
							} else {
								onOpenChange(false);
							}
						}}
					>
						{currentIndex > 0
							? t("search.queryRules.back")
							: t("search.queryRules.cancel")}
					</Button>
					{currentIndex < steps.length - 1 ? (
						<Button onClick={() => setStep(steps[currentIndex + 1].key)}>
							{t("search.queryRules.next")}
						</Button>
					) : (
						<Button onClick={handleSave}>
							{isEditing
								? t("search.queryRules.saveRule")
								: t("search.queryRules.createRule")}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
