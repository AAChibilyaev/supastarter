"use client";

import { Button, Card, CardContent, cn } from "@repo/ui";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	CheckIcon,
	EyeIcon,
	FileUpIcon,
	ListFilterIcon,
	SearchIcon,
	Settings2Icon,
	SlidersHorizontalIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FacetsPanel, type FacetConfig } from "../panels/FacetsPanel";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FieldDef {
	name: string;
	type: string;
	facet: boolean;
	sort: boolean;
	index: boolean;
}

interface StepInfo {
	id: number;
	key: string;
	icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepInfo[] = [
	{ id: 1, key: "selectIndex", icon: SearchIcon },
	{ id: 2, key: "fields", icon: FileUpIcon },
	{ id: 3, key: "searchConfig", icon: Settings2Icon },
	{ id: 4, key: "facets", icon: ListFilterIcon },
	{ id: 5, key: "preview", icon: EyeIcon },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface SearchConfigWizardProps {
	organizationId: string;
	onComplete?: (data: {
		indexSlug: string;
		queryBy: string[];
		facetFields: string[];
		defaultSortField?: string;
		theme: "light" | "dark" | "auto";
		placeholder: string;
		resultsPerPage: number;
		showThumbnails: boolean;
		showSearchButton: boolean;
		searchButtonText: string;
		accentColor: string;
		keyboardShortcut: boolean;
	}) => void;
	isSaving?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SearchConfigWizard({
	organizationId,
	onComplete,
	isSaving,
}: SearchConfigWizardProps) {
	const t = useTranslations("search.configurator");
	const [currentStep, setCurrentStep] = useState(1);

	// Step 1 state
	const [selectedIndexSlug, setSelectedIndexSlug] = useState<string | null>(null);

	// Step 2 state: schema fields
	const [fields, setFields] = useState<FieldDef[]>([]);

	// Step 3 state: search config
	const [searchableFields, setSearchableFields] = useState<string[]>([]);
	const [fieldWeights, setFieldWeights] = useState<Record<string, number>>({});
	const [typoTolerance, setTypoTolerance] = useState(1);
	const [prefixSearch, setPrefixSearch] = useState(true);
	const [infixSearch, setInfixSearch] = useState<"off" | "fallback" | "always">("fallback");
	const [exactMatch, setExactMatch] = useState(true);

	// Step 4 state: facet config
	const [facetConfig, setFacetConfig] = useState<FacetConfig[]>([]);

	// Widget UI config
	const [theme, setTheme] = useState<"light" | "dark" | "auto">("auto");
	const [placeholder, setPlaceholder] = useState("Search products...");
	const [resultsPerPage, setResultsPerPage] = useState(20);
	const [showThumbnails, setShowThumbnails] = useState(true);
	const [showSearchButton, setShowSearchButton] = useState(true);
	const [searchButtonText, setSearchButtonText] = useState("Search");
	const [accentColor, setAccentColor] = useState("#6366f1");
	const [keyboardShortcut, setKeyboardShortcut] = useState(true);

	// Fetch indexes for step 1
	const { data: indexes, isLoading: indexesLoading } = useQuery({
		...orpc.search.listIndexes.queryOptions({
			input: { organizationId },
		}),
		enabled: Boolean(organizationId),
	});

	// Load existing widget config when an index is selected (pre-populate defaults)
	const { data: existingConfig } = useQuery({
		...orpc.search.widgetConfig.queryOptions({
			input: {
				organizationId,
				indexSlug: selectedIndexSlug ?? "",
			},
		}),
		enabled: Boolean(organizationId) && Boolean(selectedIndexSlug),
		retry: false,
	});

	// Populate form fields from saved config, if any
	useEffect(() => {
		if (!existingConfig?.config) return;
		const cfg = existingConfig.config;

		// Step 3: search config
		if (cfg.queryBy.length > 0) {
			setSearchableFields(cfg.queryBy);
		}
		// Step 4: facet config (field names only → basic FacetConfig objects)
		if (cfg.facetFields.length > 0) {
			setFacetConfig(
				cfg.facetFields.map((name) => ({
					fieldName: name,
					displayName: name,
					sortOrder: "count" as const,
					maxValues: 10,
					multiSelect: true,
				})),
			);
		}
		// Step 5: widget appearance
		setTheme(cfg.theme);
		setPlaceholder(cfg.placeholder === "Search..." ? "Search products..." : cfg.placeholder);
		setResultsPerPage(cfg.resultsPerPage);
		setShowThumbnails(cfg.showThumbnails);
		setShowSearchButton(cfg.showSearchButton);
		setSearchButtonText(cfg.searchButtonText);
		setAccentColor(cfg.accentColor);
		setKeyboardShortcut(cfg.keyboardShortcut);
	}, [existingConfig]);

	const activeIndex = useMemo(() => {
		if (!selectedIndexSlug || !indexes) return null;
		return indexes.find((i) => i.slug === selectedIndexSlug) ?? null;
	}, [indexes, selectedIndexSlug]);

	// Pre-populate fields from selected index schema
	const handleIndexSelect = (slug: string) => {
		setSelectedIndexSlug(slug);
		const index = indexes?.find((i) => i.slug === slug);
		if (index && "schema" in index) {
			const schema = (index as any).schema as Record<string, unknown> | null;
			if (schema && typeof schema === "object" && schema.fields) {
				const schemaFields = (schema.fields as Record<string, unknown>[]) ?? [];
				if (schemaFields.length > 0) {
					const parsed: FieldDef[] = schemaFields.map((f: Record<string, unknown>) => ({
						name: String((f.name as string | undefined) ?? ""),
						type: String((f.type as string | undefined) ?? "string"),
						facet: Boolean(f.facet),
						sort: Boolean(f.sort),
						index: Boolean(f.index ?? true),
					}));
					setFields(parsed);
					setSearchableFields(parsed.filter((f) => f.index).map((f) => f.name));
				}
			}
		}
		// Move to next step
		setCurrentStep(2);
	};

	const facetFields = fields.filter((f) => f.facet).map((f) => f.name);

	const canProceed = (): boolean => {
		switch (currentStep) {
			case 1:
				return selectedIndexSlug !== null;
			case 2:
				return fields.length > 0;
			case 3:
				return searchableFields.length > 0;
			case 4:
				return true;
			case 5:
				return true;
			default:
				return false;
		}
	};

	const handleNext = () => {
		if (currentStep < 5) {
			setCurrentStep((s) => s + 1);
		} else if (onComplete && selectedIndexSlug) {
			onComplete({
				indexSlug: selectedIndexSlug,
				queryBy: searchableFields,
				facetFields,
				defaultSortField: fields.find((f) => f.sort)?.name,
				theme,
				placeholder,
				resultsPerPage,
				showThumbnails,
				showSearchButton,
				searchButtonText,
				accentColor,
				keyboardShortcut,
			});
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
						<StepSelectIndex
							indexes={indexes ?? []}
							isLoading={indexesLoading}
							selectedSlug={selectedIndexSlug}
							onSelect={handleIndexSelect}
							t={t}
						/>
					)}
					{currentStep === 2 && <StepSchema fields={fields} onChange={setFields} t={t} />}
					{currentStep === 3 && (
						<StepSearchConfig
							fields={fields}
							searchableFields={searchableFields}
							fieldWeights={fieldWeights}
							typoTolerance={typoTolerance}
							prefixSearch={prefixSearch}
							infixSearch={infixSearch}
							exactMatch={exactMatch}
							onChange={(patch) => {
								if (patch.searchableFields !== undefined)
									setSearchableFields(patch.searchableFields);
								if (patch.fieldWeights !== undefined)
									setFieldWeights(patch.fieldWeights);
								if (patch.typoTolerance !== undefined)
									setTypoTolerance(patch.typoTolerance);
								if (patch.prefixSearch !== undefined)
									setPrefixSearch(patch.prefixSearch);
								if (patch.infixSearch !== undefined)
									setInfixSearch(patch.infixSearch);
								if (patch.exactMatch !== undefined) setExactMatch(patch.exactMatch);
							}}
							t={t}
						/>
					)}
					{currentStep === 4 && (
						<StepFacets
							fields={fields}
							configs={facetConfig}
							onChange={setFacetConfig}
							t={t}
						/>
					)}
					{currentStep === 5 && (
						<StepPreview
							selectedIndexSlug={selectedIndexSlug ?? ""}
							activeIndexName={activeIndex?.displayName ?? ""}
							searchableFields={searchableFields}
							facetFields={facetFields}
							defaultSortField={fields.find((f) => f.sort)?.name}
							theme={theme}
							placeholder={placeholder}
							resultsPerPage={resultsPerPage}
							showThumbnails={showThumbnails}
							accentColor={accentColor}
							onThemeChange={setTheme}
							onPlaceholderChange={setPlaceholder}
							onResultsPerPageChange={setResultsPerPage}
							onShowThumbnailsChange={setShowThumbnails}
							onAccentColorChange={setAccentColor}
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
				<Button onClick={handleNext} disabled={!canProceed() || isSaving}>
					{isSaving ? t("saving") : currentStep === 5 ? t("finish") : t("next")}
				</Button>
			</div>
		</div>
	);
}

// ─── Step 1: Select Index ─────────────────────────────────────────────────────

interface StepSelectIndexProps {
	indexes: Array<{ slug: string; displayName: string; apiKeysCount: number }>;
	isLoading: boolean;
	selectedSlug: string | null;
	onSelect: (slug: string) => void;
	t: (key: string) => string;
}

function StepSelectIndex({ indexes, isLoading, selectedSlug, onSelect, t }: StepSelectIndexProps) {
	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-semibold">{t("step1Title")}</h3>
				<p className="text-sm text-muted-foreground">{t("step1Description")}</p>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{[...Array(3)].map((_, i) => (
						<Skeleton key={i} className="h-20 w-full rounded-lg" />
					))}
				</div>
			) : indexes.length === 0 ? (
				<div className="py-12 space-y-3 text-center">
					<SearchIcon className="size-10 mx-auto text-muted-foreground/40" />
					<p className="text-sm text-muted-foreground">{t("noIndexes")}</p>
					<p className="text-xs text-muted-foreground/60">{t("noIndexesHint")}</p>
				</div>
			) : (
				<div className="space-y-2">
					{indexes.map((index) => (
						<Card
							key={index.slug}
							className={cn(
								"cursor-pointer border-2 transition-colors hover:border-primary/50",
								selectedSlug === index.slug && "border-primary",
							)}
							onClick={() => onSelect(index.slug)}
						>
							<CardContent className="gap-4 p-4 sm:flex-row sm:items-center flex flex-col">
								<div className="min-w-0 flex-1">
									<p className="font-medium">{index.displayName}</p>
									<p className="text-sm text-muted-foreground">
										{index.apiKeysCount} keys
									</p>
								</div>
								<div className="gap-2 flex shrink-0 items-center">
									<span className="text-xs text-muted-foreground">
										slug: {index.slug}
									</span>
									{selectedSlug === index.slug && (
										<CheckIcon className="size-5 text-primary" />
									)}
								</div>
							</CardContent>
						</Card>
					))}
					<p className="text-xs pt-2 text-muted-foreground">{t("createIndexHint")}</p>
				</div>
			)}
		</div>
	);
}

// ─── Step 2: Schema ──────────────────────────────────────────────────────────

interface StepSchemaProps {
	fields: FieldDef[];
	onChange: (fields: FieldDef[]) => void;
	t: (key: string) => string;
}

function StepSchema({ fields, onChange, t }: StepSchemaProps) {
	const toggleField = (idx: number, key: "facet" | "sort" | "index") => {
		const updated = fields.map((f, i) => (i === idx ? { ...f, [key]: !f[key] } : f));
		onChange(updated);
	};

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-semibold">{t("step2Title")}</h3>
				<p className="text-sm text-muted-foreground">{t("step2Description")}</p>
			</div>

			{fields.length === 0 ? (
				<div className="py-12 text-center">
					<p className="text-sm text-muted-foreground">{t("schemaEmpty")}</p>
					<p className="text-xs text-muted-foreground/60">{t("schemaEmptyHint")}</p>
				</div>
			) : (
				<Card className="overflow-x-auto rounded-md border">
					<CardContent className="p-0">
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
										<td className="px-4 py-2 font-mono text-xs">
											{field.name}
										</td>
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
												{field.index && (
													<CheckIcon className="size-4 p-0.5" />
												)}
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
												{field.facet && (
													<CheckIcon className="size-4 p-0.5" />
												)}
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
												{field.sort && (
													<CheckIcon className="size-4 p-0.5" />
												)}
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// ─── Step 3: Search Config ───────────────────────────────────────────────────

interface StepSearchConfigProps {
	fields: FieldDef[];
	searchableFields: string[];
	fieldWeights: Record<string, number>;
	typoTolerance: number;
	prefixSearch: boolean;
	infixSearch: "off" | "fallback" | "always";
	exactMatch: boolean;
	onChange: (
		patch: Partial<{
			searchableFields: string[];
			fieldWeights: Record<string, number>;
			typoTolerance: number;
			prefixSearch: boolean;
			infixSearch: "off" | "fallback" | "always";
			exactMatch: boolean;
		}>,
	) => void;
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

	const stringFields = fields.filter((f) => f.type === "string" || f.type.startsWith("string["));

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">{t("step3Title")}</h3>
				<p className="text-sm text-muted-foreground">{t("step3Description")}</p>
			</div>

			<div className="space-y-3">
				<h4 className="text-sm font-medium">{t("searchableFields")}</h4>
				{stringFields.length > 0 ? (
					<Card className="overflow-x-auto rounded-md border">
						<CardContent className="p-0">
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
											<td className="px-4 py-2 font-mono text-xs">
												{field.name}
											</td>
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
														setWeight(
															field.name,
															Number(e.target.value),
														)
													}
													disabled={
														!searchableFields.includes(field.name)
													}
													className="h-7 w-16 rounded px-2 text-xs border border-input bg-background disabled:opacity-40"
												/>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</CardContent>
					</Card>
				) : (
					<p className="py-4 text-sm text-center text-muted-foreground">
						{t("noStringFields")}
					</p>
				)}
			</div>

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

// ─── Step 4: Facets ──────────────────────────────────────────────────────────

interface StepFacetsProps {
	fields: FieldDef[];
	configs: FacetConfig[];
	onChange: (configs: FacetConfig[]) => void;
	t: (key: string) => string;
}

function StepFacets({ fields, configs, onChange, t }: StepFacetsProps) {
	const facetFieldNames = fields.filter((f) => f.facet).map((f) => f.name);

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-semibold">{t("step4Title")}</h3>
				<p className="text-sm text-muted-foreground">{t("step4Description")}</p>
			</div>
			<FacetsPanel facetFields={facetFieldNames} configs={configs} onChange={onChange} />
		</div>
	);
}

// ─── Step 5: Preview ─────────────────────────────────────────────────────────

interface StepPreviewProps {
	selectedIndexSlug: string;
	activeIndexName: string;
	searchableFields: string[];
	facetFields: string[];
	defaultSortField?: string;
	theme: "light" | "dark" | "auto";
	placeholder: string;
	resultsPerPage: number;
	showThumbnails: boolean;
	accentColor: string;
	onThemeChange: (v: "light" | "dark" | "auto") => void;
	onPlaceholderChange: (v: string) => void;
	onResultsPerPageChange: (v: number) => void;
	onShowThumbnailsChange: (v: boolean) => void;
	onAccentColorChange: (v: string) => void;
	t: (key: string) => string;
}

function StepPreview({
	selectedIndexSlug,
	activeIndexName,
	searchableFields,
	facetFields,
	defaultSortField,
	theme,
	placeholder,
	resultsPerPage,
	showThumbnails,
	accentColor,
	onThemeChange,
	onPlaceholderChange,
	onResultsPerPageChange,
	onShowThumbnailsChange,
	onAccentColorChange,
	t,
}: StepPreviewProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">{t("step5Title")}</h3>
				<p className="text-sm text-muted-foreground">{t("step5Description")}</p>
			</div>

			{/* Configuration summary */}
			<Card>
				<CardContent className="p-4 space-y-4">
					<div>
						<p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
							{t("summaryIndex")}
						</p>
						<p className="text-sm font-medium">
							{activeIndexName || selectedIndexSlug}
						</p>
					</div>
					<div className="gap-4 sm:grid-cols-2 grid">
						<div>
							<p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
								{t("summarySearchFields")}
							</p>
							<p className="text-sm">{searchableFields.join(", ") || "—"}</p>
						</div>
						<div>
							<p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
								{t("summaryFacetFields")}
							</p>
							<p className="text-sm">{facetFields.join(", ") || "—"}</p>
						</div>
						{defaultSortField && (
							<div>
								<p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
									{t("summaryDefaultSort")}
								</p>
								<p className="text-sm">{defaultSortField}</p>
							</div>
						)}
						<div>
							<p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
								{t("summaryResultsPerPage")}
							</p>
							<p className="text-sm">{resultsPerPage}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Widget appearance settings */}
			<Card>
				<CardContent className="p-4 space-y-4">
					<div className="gap-2 flex items-center">
						<SlidersHorizontalIcon className="size-4 text-muted-foreground" />
						<p className="text-sm font-medium">{t("widgetAppearance")}</p>
					</div>
					<div className="gap-4 sm:grid-cols-2 grid">
						<div className="space-y-1.5">
							<label className="text-xs text-muted-foreground">{t("theme")}</label>
							<select
								value={theme}
								onChange={(e) =>
									onThemeChange(e.target.value as "light" | "dark" | "auto")
								}
								className="h-8 rounded px-2 text-xs w-full border border-input bg-background"
							>
								<option value="light">{t("themeLight")}</option>
								<option value="dark">{t("themeDark")}</option>
								<option value="auto">{t("themeAuto")}</option>
							</select>
						</div>
						<div className="space-y-1.5">
							<label className="text-xs text-muted-foreground">
								{t("accentColor")}
							</label>
							<div className="gap-2 flex items-center">
								<input
									type="color"
									value={accentColor}
									onChange={(e) => onAccentColorChange(e.target.value)}
									className="size-8 rounded cursor-pointer border border-input"
								/>
								<input
									type="text"
									value={accentColor}
									onChange={(e) => onAccentColorChange(e.target.value)}
									className="h-8 rounded px-2 text-xs font-mono flex-1 border border-input bg-background"
								/>
							</div>
						</div>
						<div className="space-y-1.5">
							<label className="text-xs text-muted-foreground">
								{t("placeholder")}
							</label>
							<input
								type="text"
								value={placeholder}
								onChange={(e) => onPlaceholderChange(e.target.value)}
								className="h-8 rounded px-2 text-xs w-full border border-input bg-background"
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-xs text-muted-foreground">
								{t("resultsPerPage")}
							</label>
							<input
								type="number"
								min={5}
								max={50}
								value={resultsPerPage}
								onChange={(e) => onResultsPerPageChange(Number(e.target.value))}
								className="h-8 rounded px-2 text-xs w-full border border-input bg-background"
							/>
						</div>
					</div>
					<label className="gap-2 text-sm flex items-center">
						<input
							type="checkbox"
							checked={showThumbnails}
							onChange={(e) => onShowThumbnailsChange(e.target.checked)}
							className="size-4 rounded border-input accent-primary"
						/>
						{t("showThumbnails")}
					</label>
				</CardContent>
			</Card>

			{/* Widget code snippet preview */}
			<Card>
				<CardContent className="p-4 space-y-3">
					<div className="gap-2 flex items-center">
						<SearchIcon className="size-4 text-muted-foreground" />
						<p className="text-sm font-medium">{t("embedCode")}</p>
					</div>
					<pre className="p-3 text-xs font-mono leading-relaxed overflow-x-auto rounded-md bg-muted">
						{`<script
  src="http://localhost:3000/api/widget/widget.js"
  data-base-url="http://localhost:3000"
  data-index-slug="${selectedIndexSlug}"
  data-theme="${theme}"
  data-placeholder="${placeholder}"
  data-results-per-page="${resultsPerPage}"
  data-accent-color="${accentColor}"
  ${!showThumbnails ? '  data-show-thumbnails="false"\n' : ""}  data-query-by="${searchableFields.join(",")}"
  ${facetFields.length > 0 ? `  data-facets="${facetFields.join(",")}"` : ""}
  ${defaultSortField ? `  data-sort="${defaultSortField}"` : ""}
></script>`}
					</pre>
					<p className="text-xs text-muted-foreground">{t("embedHint")}</p>
				</CardContent>
			</Card>

			<Button variant="outline" size="sm" asChild>
				<Link href={`/getting-started`}>{t("skipToGettingStarted")}</Link>
			</Button>
		</div>
	);
}
