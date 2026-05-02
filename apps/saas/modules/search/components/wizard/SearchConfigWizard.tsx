"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import { CheckIcon, FileUpIcon, Settings2Icon, Table2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface StepInfo {
	id: number;
	key: string;
	icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepInfo[] = [
	{ id: 1, key: "dataSource", icon: FileUpIcon },
	{ id: 2, key: "schema", icon: Table2Icon },
	{ id: 3, key: "searchConfig", icon: Settings2Icon },
];

interface StepData {
	// Step 1: Data Source
	sourceType: "csv" | "json" | "cms" | "api" | null;
	// Step 2: Schema
	fields: Array<{
		name: string;
		type: string;
		facet: boolean;
		sort: boolean;
		index: boolean;
	}>;
	// Step 3: Search Config
	searchableFields: string[];
	fieldWeights: Record<string, number>;
	typoTolerance: number;
	prefixSearch: boolean;
	infixSearch: "off" | "fallback" | "always";
	exactMatch: boolean;
}

interface SearchConfigWizardProps {
	organizationId: string;
	onComplete?: (data: StepData) => void;
}

export function SearchConfigWizard({
	organizationId: _organizationId,
	onComplete,
}: SearchConfigWizardProps) {
	const t = useTranslations("search.configurator");
	const [currentStep, setCurrentStep] = useState(1);
	const [wizardData, setWizardData] = useState<StepData>({
		sourceType: null,
		fields: [],
		searchableFields: [],
		fieldWeights: {},
		typoTolerance: 1,
		prefixSearch: true,
		infixSearch: "fallback",
		exactMatch: true,
	});

	const updateData = (patch: Partial<StepData>) => {
		setWizardData((prev) => ({ ...prev, ...patch }));
	};

	const canProceed = (): boolean => {
		switch (currentStep) {
			case 1:
				return wizardData.sourceType !== null;
			case 2:
				return wizardData.fields.length > 0;
			case 3:
				return wizardData.searchableFields.length > 0;
			default:
				return false;
		}
	};

	const handleNext = () => {
		if (currentStep < 3) {
			setCurrentStep((s) => s + 1);
		} else if (onComplete) {
			onComplete(wizardData);
		}
	};

	const handleBack = () => {
		if (currentStep > 1) {
			setCurrentStep((s) => s - 1);
		}
	};

	return (
		<div className="space-y-6">
			{/* Step indicator */}
			<div className="gap-0 flex items-center">
				{STEPS.map((step, idx) => (
					<div key={step.id} className="gap-2 flex flex-1 items-center">
						<div
							className={cn(
								"gap-2 px-3 py-1.5 text-sm font-medium flex items-center rounded-full transition-colors",
								currentStep === step.id
									? "bg-primary text-primary-foreground"
									: currentStep > step.id
										? "bg-primary/10 text-primary"
										: "text-muted-foreground",
							)}
						>
							{currentStep > step.id ? (
								<CheckIcon className="size-4" />
							) : (
								<step.icon className="size-4" />
							)}
							<span className="sm:inline hidden">{t(`step${step.id}Title`)}</span>
						</div>
						{idx < STEPS.length - 1 && (
							<div
								className={cn(
									"h-px flex-1",
									currentStep > step.id ? "bg-primary" : "bg-border",
								)}
							/>
						)}
					</div>
				))}
			</div>

			{/* Step content */}
			<Card>
				<CardContent className="pt-6">
					{currentStep === 1 && (
						<StepDataSource
							value={wizardData.sourceType}
							onChange={(sourceType) => updateData({ sourceType })}
							t={t}
						/>
					)}
					{currentStep === 2 && (
						<StepSchema
							fields={wizardData.fields}
							onChange={(fields) => updateData({ fields })}
							t={t}
						/>
					)}
					{currentStep === 3 && (
						<StepSearchConfig
							fields={wizardData.fields}
							searchableFields={wizardData.searchableFields}
							fieldWeights={wizardData.fieldWeights}
							typoTolerance={wizardData.typoTolerance}
							prefixSearch={wizardData.prefixSearch}
							infixSearch={wizardData.infixSearch}
							exactMatch={wizardData.exactMatch}
							onChange={(patch) => updateData(patch)}
							t={t}
						/>
					)}
				</CardContent>
			</Card>

			{/* Navigation buttons */}
			<div className="gap-3 flex justify-between">
				<Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
					{t("back")}
				</Button>
				<Button onClick={handleNext} disabled={!canProceed()}>
					{currentStep === 3 ? t("finish") : t("next")}
				</Button>
			</div>
		</div>
	);
}

// ─── Step 1: Data Source ────────────────────────────────────────────────────

interface StepDataSourceProps {
	value: string | null;
	onChange: (value: "csv" | "json" | "cms" | "api") => void;
	t: (key: string) => string;
}

function StepDataSource({ value, onChange, t }: StepDataSourceProps) {
	const options = [
		{
			id: "csv" as const,
			icon: FileUpIcon,
			titleKey: "sourceCSV",
			descKey: "sourceCSVDesc",
		},
		{
			id: "json" as const,
			icon: FileUpIcon,
			titleKey: "sourceJSON",
			descKey: "sourceJSONDesc",
		},
		{
			id: "cms" as const,
			icon: FileUpIcon,
			titleKey: "sourceCMS",
			descKey: "sourceCMSDesc",
		},
		{
			id: "api" as const,
			icon: FileUpIcon,
			titleKey: "sourceAPI",
			descKey: "sourceAPIDesc",
		},
	];

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-semibold">{t("step1Title")}</h3>
				<p className="text-sm text-muted-foreground">{t("step1Description")}</p>
			</div>
			<div className="gap-4 md:grid-cols-2 grid">
				{options.map((opt) => (
					<Card
						key={opt.id}
						className={cn(
							"cursor-pointer border-2 transition-colors hover:border-primary/50",
							value === opt.id && "border-primary",
						)}
						onClick={() => onChange(opt.id)}
					>
						<CardContent className="gap-3 pt-6 flex items-start">
							<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
								<opt.icon className="size-5 text-primary" />
							</div>
							<div className="flex-1">
								<p className="font-medium">{t(opt.titleKey)}</p>
								<p className="mt-1 text-sm text-muted-foreground">
									{t(opt.descKey)}
								</p>
							</div>
							{value === opt.id && (
								<CheckIcon className="size-5 shrink-0 text-primary" />
							)}
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

// ─── Step 2: Schema ─────────────────────────────────────────────────────────

interface StepSchemaProps {
	fields: Array<{ name: string; type: string; facet: boolean; sort: boolean; index: boolean }>;
	onChange: (
		fields: Array<{
			name: string;
			type: string;
			facet: boolean;
			sort: boolean;
			index: boolean;
		}>,
	) => void;
	t: (key: string) => string;
}

function StepSchema({ fields, onChange, t }: StepSchemaProps) {
	const SAMPLE_FIELDS = [
		{ name: "name", type: "string", facet: true, sort: true, index: true },
		{ name: "price", type: "float", facet: true, sort: true, index: false },
		{ name: "category", type: "string", facet: true, sort: false, index: false },
		{ name: "description", type: "string", facet: false, sort: false, index: true },
		{ name: "sku", type: "string", facet: false, sort: false, index: true },
		{ name: "image_url", type: "string", facet: false, sort: false, index: false },
	];

	const handleAutoDetect = () => {
		onChange(SAMPLE_FIELDS);
	};

	const toggleField = (idx: number, key: "facet" | "sort" | "index") => {
		const updated = fields.map((f, i) =>
			i === idx ? { ...f, [key]: !f[key as keyof typeof f] } : f,
		);
		onChange(updated);
	};

	return (
		<div className="space-y-4">
			<div className="gap-2 flex items-start justify-between">
				<div>
					<h3 className="text-lg font-semibold">{t("step2Title")}</h3>
					<p className="text-sm text-muted-foreground">{t("step2Description")}</p>
				</div>
				{fields.length === 0 && (
					<Button variant="outline" size="sm" onClick={handleAutoDetect}>
						{t("autoDetect")}
					</Button>
				)}
			</div>

			{fields.length === 0 ? (
				<div className="py-12 text-center">
					<Table2Icon className="mb-3 size-10 mx-auto text-muted-foreground/40" />
					<p className="text-sm text-muted-foreground">{t("schemaEmpty")}</p>
					<p className="text-xs text-muted-foreground/60">{t("schemaEmptyHint")}</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-md border">
					<table className="text-sm w-full">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="px-4 py-2 font-medium text-left text-muted-foreground">
									{t("fieldName")}
								</th>
								<th className="px-4 py-2 font-medium text-left text-muted-foreground">
									{t("fieldType")}
								</th>
								<th className="px-4 py-2 font-medium text-center text-muted-foreground">
									{t("fieldSearch")}
								</th>
								<th className="px-4 py-2 font-medium text-center text-muted-foreground">
									{t("fieldFacet")}
								</th>
								<th className="px-4 py-2 font-medium text-center text-muted-foreground">
									{t("fieldSort")}
								</th>
							</tr>
						</thead>
						<tbody>
							{fields.map((field, idx) => (
								<tr key={field.name} className="border-b last:border-0">
									<td className="px-4 py-2 font-mono text-xs">{field.name}</td>
									<td className="px-4 py-2">
										<span className="rounded px-1.5 py-0.5 font-mono text-xs bg-muted">
											{field.type}
										</span>
									</td>
									<td className="px-4 py-2 text-center">
										<button
											type="button"
											onClick={() => toggleField(idx, "index")}
											className={cn(
												"size-5 rounded border transition-colors",
												field.index
													? "border-primary bg-primary text-primary-foreground"
													: "border-input",
											)}
										>
											{field.index && <CheckIcon className="size-4 p-0.5" />}
										</button>
									</td>
									<td className="px-4 py-2 text-center">
										<button
											type="button"
											onClick={() => toggleField(idx, "facet")}
											className={cn(
												"size-5 rounded border transition-colors",
												field.facet
													? "border-primary bg-primary text-primary-foreground"
													: "border-input",
											)}
										>
											{field.facet && <CheckIcon className="size-4 p-0.5" />}
										</button>
									</td>
									<td className="px-4 py-2 text-center">
										<button
											type="button"
											onClick={() => toggleField(idx, "sort")}
											className={cn(
												"size-5 rounded border transition-colors",
												field.sort
													? "border-primary bg-primary text-primary-foreground"
													: "border-input",
											)}
										>
											{field.sort && <CheckIcon className="size-4 p-0.5" />}
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

// ─── Step 3: Search Config ───────────────────────────────────────────────────

interface StepSearchConfigProps {
	fields: Array<{ name: string; type: string }>;
	searchableFields: string[];
	fieldWeights: Record<string, number>;
	typoTolerance: number;
	prefixSearch: boolean;
	infixSearch: "off" | "fallback" | "always";
	exactMatch: boolean;
	onChange: (patch: Partial<StepData>) => void;
	t: (key: string) => string;
}

function StepSearchConfig({
	fields,
	searchableFields,
	fieldWeights,
	typoTolerance,
	prefixSearch,
	infixSearch,
	exactMatch,
	onChange,
	t,
}: StepSearchConfigProps) {
	const toggleSearchable = (fieldName: string) => {
		const updated = searchableFields.includes(fieldName)
			? searchableFields.filter((f) => f !== fieldName)
			: [...searchableFields, fieldName];
		onChange({ searchableFields: updated });
	};

	const setWeight = (fieldName: string, weight: number) => {
		onChange({ fieldWeights: { ...fieldWeights, [fieldName]: weight } });
	};

	const stringFields = fields.filter((f) => f.type === "string" || f.type.startsWith("string"));

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">{t("step3Title")}</h3>
				<p className="text-sm text-muted-foreground">{t("step3Description")}</p>
			</div>

			{/* Searchable fields */}
			<div className="space-y-3">
				<h4 className="text-sm font-medium">{t("searchableFields")}</h4>
				<div className="overflow-x-auto rounded-md border">
					<table className="text-sm w-full">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="px-4 py-2 font-medium text-left text-muted-foreground">
									{t("fieldName")}
								</th>
								<th className="px-4 py-2 font-medium text-center text-muted-foreground">
									{t("searchable")}
								</th>
								<th className="px-4 py-2 font-medium text-left text-muted-foreground">
									{t("weight")}
								</th>
							</tr>
						</thead>
						<tbody>
							{stringFields.map((field) => (
								<tr key={field.name} className="border-b last:border-0">
									<td className="px-4 py-2 font-mono text-xs">{field.name}</td>
									<td className="px-4 py-2 text-center">
										<button
											type="button"
											onClick={() => toggleSearchable(field.name)}
											className={cn(
												"size-5 rounded border transition-colors",
												searchableFields.includes(field.name)
													? "border-primary bg-primary text-primary-foreground"
													: "border-input",
											)}
										>
											{searchableFields.includes(field.name) && (
												<CheckIcon className="size-4 p-0.5" />
											)}
										</button>
									</td>
									<td className="px-4 py-2">
										<input
											type="number"
											min={1}
											max={100}
											value={fieldWeights[field.name] ?? 1}
											onChange={(e) =>
												setWeight(field.name, Number(e.target.value))
											}
											disabled={!searchableFields.includes(field.name)}
											className="h-7 w-16 rounded px-2 text-xs border border-input bg-background disabled:opacity-40"
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{stringFields.length === 0 && (
					<p className="py-4 text-sm text-center text-muted-foreground">
						{t("noStringFields")}
					</p>
				)}
			</div>

			{/* Ranking options */}
			<div className="space-y-3">
				<h4 className="text-sm font-medium">{t("ranking")}</h4>
				<div className="gap-3 sm:grid-cols-2 grid">
					<div className="space-y-1.5">
						<label className="text-xs text-muted-foreground">
							{t("typoTolerance")}
						</label>
						<select
							value={typoTolerance}
							onChange={(e) => onChange({ typoTolerance: Number(e.target.value) })}
							className="h-7 rounded px-2 text-xs w-full border border-input bg-background"
						>
							<option value={0}>{t("typoOff")}</option>
							<option value={1}>{t("typo1")}</option>
							<option value={2}>{t("typo2")}</option>
							<option value={4}>{t("typo4")}</option>
						</select>
					</div>
					<div className="space-y-1.5">
						<label className="text-xs text-muted-foreground">{t("infixSearch")}</label>
						<select
							value={infixSearch}
							onChange={(e) =>
								onChange({
									infixSearch: e.target.value as "off" | "fallback" | "always",
								})
							}
							className="h-7 rounded px-2 text-xs w-full border border-input bg-background"
						>
							<option value="off">{t("infixOff")}</option>
							<option value="fallback">{t("infixFallback")}</option>
							<option value="always">{t("infixAlways")}</option>
						</select>
					</div>
				</div>
				<div className="gap-4 flex flex-wrap">
					<label className="gap-2 text-sm flex items-center">
						<input
							type="checkbox"
							checked={prefixSearch}
							onChange={(e) => onChange({ prefixSearch: e.target.checked })}
							className="size-4 rounded border-input accent-primary"
						/>
						{t("prefixSearch")}
					</label>
					<label className="gap-2 text-sm flex items-center">
						<input
							type="checkbox"
							checked={exactMatch}
							onChange={(e) => onChange({ exactMatch: e.target.checked })}
							className="size-4 rounded border-input accent-primary"
						/>
						{t("exactMatch")}
					</label>
				</div>
			</div>
		</div>
	);
}
