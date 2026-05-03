"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
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
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	ChevronDownIcon,
	ChevronRightIcon,
	DownloadIcon,
	PlusIcon,
	Trash2Icon,
	UploadIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type FieldType =
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

interface EmbedConfig {
	from: string[];
	model_config?: {
		model_name?: string;
		api_key?: string;
		api_url?: string;
	};
}

interface SchemaField {
	name: string;
	type: FieldType;
	facet?: boolean;
	optional?: boolean;
	index?: boolean;
	sort?: boolean;
	embed?: EmbedConfig;
}

const FIELD_TYPES: FieldType[] = [
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

const EMBEDDING_MODELS = [
	{ value: "openai/text-embedding-3-small", label: "OpenAI text-embedding-3-small" },
	{ value: "openai/text-embedding-3-large", label: "OpenAI text-embedding-3-large" },
	{ value: "openai/text-embedding-ada-002", label: "OpenAI text-embedding-ada-002" },
];

interface SchemaEditorPanelProps {
	organizationId: string;
	slug: string;
}

export function SchemaEditorPanel({ organizationId, slug }: SchemaEditorPanelProps) {
	const t = useTranslations("search.collection.schemaEditor");
	const tColl = useTranslations("search.collection");
	const tEmbed = useTranslations("search.autoEmbed");
	const queryClient = useQueryClient();

	const [draft, setDraft] = useState<SchemaField[]>([]);
	const [defaultSort, setDefaultSort] = useState<string>("");
	const [initialized, setInitialized] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [importJson, setImportJson] = useState("");
	const [diffOpen, setDiffOpen] = useState(false);
	const [tokenSeparatorsInput, setTokenSeparatorsInput] = useState("");
	const [symbolTokensInput, setSymbolTokensInput] = useState("");

	const { data: schemaData, isLoading: schemaLoading } = useQuery(
		orpc.search.schema.get.queryOptions({
			input: { organizationId, slug },
			enabled: Boolean(organizationId) && Boolean(slug),
		}),
	);

	const schemaFields = schemaData?.fields ?? [];
	const defaultSortingField = schemaData?.defaultSortingField ?? null;

	const tokenSeparators = tokenSeparatorsInput
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	const symbolTokensToIndex = symbolTokensInput
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);

	if (!initialized && (schemaFields.length > 0 || !schemaLoading)) {
		setDraft(
			schemaFields.map((f) => {
				const field: SchemaField = {
					name: f.name,
					type: f.type as FieldType,
					facet: f.facet,
					optional: f.optional,
					index: f.index,
					sort: f.sort,
				};
				if (f.embed && typeof f.embed === "object") {
					const embed = f.embed as EmbedConfig;
					field.embed = {
						from: embed.from ?? [],
						model_config: embed.model_config ?? {
							model_name: "openai/text-embedding-3-small",
						},
					};
				}
				return field;
			}),
		);
		setDefaultSort(defaultSortingField ?? "");
		setTokenSeparatorsInput((schemaData?.tokenSeparators ?? []).join(", "));
		setSymbolTokensInput((schemaData?.symbolTokensToIndex ?? []).join(", "));
		setInitialized(true);
	}

	const mutation = useMutation(
		orpc.search.schema.update.mutationOptions({
			onSuccess: () => {
				toastSuccess(t("saved"));
				void queryClient.invalidateQueries({
					queryKey: orpc.search.schema.get.queryOptions({
						input: { slug, organizationId },
					}).queryKey,
				});
			},
			onError: () => toastError(t("saveError")),
		}),
	);

	const reindexMutation = useMutation(
		orpc.search.reindex.mutationOptions({
			onSuccess: () => toastSuccess(t("reindexStarted")),
			onError: () => toastError(t("reindexError")),
		}),
	);

	const handleAddField = () => {
		setDraft((prev) => [...prev, { name: "", type: "string" as FieldType }]);
	};

	const handleRemove = (idx: number) => {
		setDraft((prev) => prev.filter((_, i) => i !== idx));
	};

	const handleChange = (idx: number, patch: Partial<SchemaField>) => {
		setDraft((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
	};

	const handleEmbedToggle = (idx: number, enabled: boolean) => {
		setDraft((prev) =>
			prev.map((f, i) => {
				if (i !== idx) return f;
				if (enabled) {
					return {
						...f,
						embed: {
							from: [],
							model_config: {
								model_name: "openai/text-embedding-3-small",
							},
						},
					};
				}
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { embed: _, ...rest } = f;
				return rest;
			}),
		);
	};

	const handleEmbedChange = (idx: number, patch: Partial<EmbedConfig>) => {
		setDraft((prev) =>
			prev.map((f, i) => {
				if (i !== idx) return f;
				return {
					...f,
					embed: {
						...f.embed,
						...patch,
						model_config: {
							...(f.embed?.model_config ?? {}),
							...(patch.model_config ?? {}),
						},
					} as EmbedConfig,
				};
			}),
		);
	};

	const handleSave = (triggerReindex: boolean) => {
		const validFields = draft.filter((f) => f.name.trim());
		mutation.mutate({
			organizationId,
			slug,
			fields: validFields as never,
			defaultSortingField: defaultSort || undefined,
			tokenSeparators: tokenSeparators.length > 0 ? tokenSeparators : undefined,
			symbolTokensToIndex: symbolTokensToIndex.length > 0 ? symbolTokensToIndex : undefined,
			triggerReindex,
		});
	};

	const handleExport = async () => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
			toastSuccess(t("exported"));
		} catch {
			toastError(t("exportError"));
		}
	};

	const handleImport = () => {
		try {
			const parsed = JSON.parse(importJson) as unknown;
			if (!Array.isArray(parsed)) {
				toastError(t("importMustBeArray"));
				return;
			}
			setDraft(parsed as SchemaField[]);
			setImportOpen(false);
			setImportJson("");
		} catch {
			toastError(t("invalidJson"));
		}
	};

	const addedFields = draft.filter((d) => !schemaFields.some((f) => f.name === d.name));
	const removedFields = schemaFields.filter((f) => !draft.some((d) => d.name === f.name));
	const hasDiff = addedFields.length > 0 || removedFields.length > 0;

	if (schemaLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-4 w-48" />
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
				</CardContent>
			</Card>
		);
	}

	const sortableFields = draft.filter(
		(f) => f.name && (f.sort || f.type === "int32" || f.type === "int64" || f.type === "float"),
	);

	return (
		<>
			<Card>
				<CardHeader>
					<div className="gap-2 flex flex-wrap items-start justify-between">
						<div>
							<CardTitle className="text-base">{tColl("schemaFields")}</CardTitle>
							<CardDescription>
								{slug} &mdash; {draft.length} {tColl("fields")}
							</CardDescription>
						</div>
						<div className="gap-2 flex flex-wrap">
							<Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
								<UploadIcon className="size-3.5" />
								{t("importJson")}
							</Button>
							<Button variant="outline" size="sm" onClick={handleExport}>
								<DownloadIcon className="size-3.5" />
								{t("exportJson")}
							</Button>
							{hasDiff && (
								<Button variant="outline" size="sm" onClick={() => setDiffOpen(true)}>
									{t("previewDiff")}
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Reindex warning */}
					<div className="gap-2 px-3 py-2 text-sm bg-warning/10 text-warning-foreground flex items-start rounded-md">
						<AlertTriangle className="mt-0.5 size-4 text-warning shrink-0" />
						<span>{t("reindexWarning")}</span>
					</div>

					{/* Default sort selector */}
					<div className="gap-3 flex flex-wrap items-center">
						<Label className="text-sm shrink-0 text-muted-foreground">{t("defaultSort")}</Label>
						<Select value={defaultSort} onValueChange={setDefaultSort}>
							<SelectTrigger className="w-48">
								<SelectValue placeholder={t("noDefaultSort")} />
							</SelectTrigger>
							<SelectContent>
								{sortableFields.map((f) => (
									<SelectItem key={f.name} value={f.name}>
										{f.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Token Separators */}
					<div className="gap-2 flex flex-col">
						<Label className="text-sm text-muted-foreground">{t("tokenSeparators")}</Label>
						<Input
							value={tokenSeparatorsInput}
							onChange={(e) => setTokenSeparatorsInput(e.target.value)}
							className="h-7 font-mono text-xs"
							placeholder="+, #, @"
						/>
					</div>

					{/* Symbol Tokens to Index */}
					<div className="gap-2 flex flex-col">
						<Label className="text-sm text-muted-foreground">{t("symbolTokensToIndex")}</Label>
						<Input
							value={symbolTokensInput}
							onChange={(e) => setSymbolTokensInput(e.target.value)}
							className="h-7 font-mono text-xs"
							placeholder="#, +"
						/>
					</div>

					{draft.length === 0 ? (
						<div className="py-8 text-center">
							<p className="mb-3 text-sm text-muted-foreground">{t("empty")}</p>
							<Button variant="outline" size="sm" onClick={handleAddField}>
								<PlusIcon className="size-3.5" />
								{t("addFirstField")}
							</Button>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="text-sm w-full">
								<thead>
									<tr className="border-b text-left text-muted-foreground">
										<th className="pb-2 pr-3 font-medium min-w-[140px]">{tColl("fieldName")}</th>
										<th className="pb-2 pr-3 font-medium min-w-[120px]">{tColl("fieldType")}</th>
										<th className="pb-2 pr-2 font-medium text-center">{tColl("fieldFacet")}</th>
										<th className="pb-2 pr-2 font-medium text-center">{tColl("fieldSort")}</th>
										<th className="pb-2 pr-2 font-medium text-center">{tColl("fieldIndex")}</th>
										<th className="pb-2 pr-2 font-medium text-center">{tColl("fieldOptional")}</th>
										<th className="pb-2 font-medium" />
									</tr>
								</thead>
								<tbody>
									{draft.map((field, idx) => (
										<tr key={idx} className="border-b last:border-0">
											<td className="py-1.5 pr-3">
												<Input
													value={field.name}
													onChange={(e) => handleChange(idx, { name: e.target.value })}
													className="h-7 font-mono text-xs"
													placeholder={t("unnamed")}
												/>
											</td>
											<td className="py-1.5 pr-3">
												<Select
													value={field.type}
													onValueChange={(v) => handleChange(idx, { type: v as FieldType })}
												>
													<SelectTrigger className="h-7 text-xs w-full">
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
											</td>
											<td className="py-1.5 pr-2 text-center">
												<Switch
													checked={field.facet ?? false}
													onCheckedChange={(v) => handleChange(idx, { facet: v })}
													className="scale-75"
												/>
											</td>
											<td className="py-1.5 pr-2 text-center">
												<Switch
													checked={field.sort ?? false}
													onCheckedChange={(v) => handleChange(idx, { sort: v })}
													className="scale-75"
												/>
											</td>
											<td className="py-1.5 pr-2 text-center">
												<Switch
													checked={field.index ?? true}
													onCheckedChange={(v) => handleChange(idx, { index: v })}
													className="scale-75"
												/>
											</td>
											<td className="py-1.5 pr-2 text-center">
												<Switch
													checked={field.optional ?? false}
													onCheckedChange={(v) => handleChange(idx, { optional: v })}
													className="scale-75"
												/>
											</td>
											<td className="py-1.5">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleRemove(idx)}
													className="size-7 p-0 text-muted-foreground hover:text-destructive"
												>
													<Trash2Icon className="size-3.5" />
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>

							{/* Auto-embed config sections */}
							<div className="mt-4 space-y-3">
								{draft.map((field, idx) => {
									if (field.type !== "float[]") return null;
									const isEmbedEnabled = Boolean(field.embed);
									return (
										<div key={`embed-${idx}`} className="overflow-hidden rounded-md border">
											<button
												type="button"
												onClick={() => handleEmbedToggle(idx, !isEmbedEnabled)}
												className="gap-2 px-3 py-2 text-xs flex w-full items-center justify-between bg-muted/30 transition-colors hover:bg-muted/50"
											>
												<span className="gap-2 flex items-center">
													{isEmbedEnabled ? (
														<ChevronDownIcon className="size-3.5 text-muted-foreground" />
													) : (
														<ChevronRightIcon className="size-3.5 text-muted-foreground" />
													)}
													<code className="font-mono">{field.name || t("unnamed")}</code>
													<span className="text-muted-foreground">
														&mdash; {tEmbed("autoEmbedTitle")}
													</span>
													{isEmbedEnabled && (
														<Badge status="info" className="px-1.5 py-0 text-[10px]">
															ON
														</Badge>
													)}
												</span>
												<Switch
													checked={isEmbedEnabled}
													onCheckedChange={(v) => handleEmbedToggle(idx, v)}
													onClick={(e) => e.stopPropagation()}
													className="scale-75"
												/>
											</button>
											{isEmbedEnabled && (
												<div className="gap-3 px-3 py-3 flex flex-wrap border-t bg-background">
													{/* Source Fields */}
													<div className="gap-1.5 flex min-w-[200px] flex-1 flex-col">
														<Label className="text-xs text-muted-foreground">
															{tEmbed("autoEmbedFrom")}
														</Label>
														<Input
															value={field.embed?.from?.join(", ") ?? ""}
															onChange={(e) =>
																handleEmbedChange(idx, {
																	from: e.target.value
																		.split(",")
																		.map((s) => s.trim())
																		.filter(Boolean),
																})
															}
															className="h-7 font-mono text-xs"
															placeholder="title, description"
														/>
														<p className="text-[10px] text-muted-foreground">
															{tEmbed("autoEmbedFromHint")}
														</p>
													</div>

													{/* Embedding Model */}
													<div className="gap-1.5 flex min-w-[200px] flex-1 flex-col">
														<Label className="text-xs text-muted-foreground">
															{tEmbed("autoEmbedModel")}
														</Label>
														<Select
															value={
																field.embed?.model_config?.model_name ??
																"openai/text-embedding-3-small"
															}
															onValueChange={(v) =>
																handleEmbedChange(idx, {
																	model_config: {
																		model_name: v,
																	},
																})
															}
														>
															<SelectTrigger className="h-7 text-xs w-full">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{EMBEDDING_MODELS.map((m) => (
																	<SelectItem key={m.value} value={m.value}>
																		{m.label}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>

													{/* API Key */}
													<div className="gap-1.5 flex min-w-[160px] flex-1 flex-col">
														<Label className="text-xs text-muted-foreground">
															{tEmbed("autoEmbedApiKey")}
														</Label>
														<Input
															value={field.embed?.model_config?.api_key ?? ""}
															onChange={(e) =>
																handleEmbedChange(idx, {
																	model_config: {
																		api_key: e.target.value || undefined,
																	},
																})
															}
															className="h-7 font-mono text-xs"
															type="password"
															placeholder={tEmbed("autoEmbedApiKeyHint")}
														/>
													</div>

													{/* API URL */}
													<div className="gap-1.5 flex min-w-[200px] flex-1 flex-col">
														<Label className="text-xs text-muted-foreground">
															{tEmbed("autoEmbedApiUrl")}
														</Label>
														<Input
															value={field.embed?.model_config?.api_url ?? ""}
															onChange={(e) =>
																handleEmbedChange(idx, {
																	model_config: {
																		api_url: e.target.value || undefined,
																	},
																})
															}
															className="h-7 font-mono text-xs"
															placeholder={tEmbed("autoEmbedApiUrlHint")}
														/>
													</div>

													{/* Warning */}
													<div className="w-full">
														<p className="text-warning gap-1 flex items-center text-[10px]">
															<AlertTriangle className="size-3" />
															{tEmbed("autoEmbedWarning")}
														</p>
													</div>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Footer */}
					<div className="gap-2 pt-2 flex flex-wrap items-center justify-between border-t">
						<Button variant="outline" size="sm" onClick={handleAddField}>
							<PlusIcon className="size-3.5" />
							{t("addField")}
						</Button>
						<div className="gap-2 flex">
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleSave(false)}
								loading={mutation.isPending}
							>
								{t("saveOnly")}
							</Button>
							<Button size="sm" onClick={() => handleSave(true)} loading={mutation.isPending}>
								{t("saveReindex")}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Import JSON dialog */}
			<Dialog open={importOpen} onOpenChange={setImportOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("importDialogTitle")}</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">{t("importDialogDesc")}</p>
					<Textarea
						value={importJson}
						onChange={(e) => setImportJson(e.target.value)}
						rows={8}
						className="font-mono text-xs"
						placeholder='[{"name": "title", "type": "string", "facet": false}]'
					/>
					<div className="gap-2 flex justify-end">
						<Button variant="outline" onClick={() => setImportOpen(false)}>
							{t("cancel")}
						</Button>
						<Button onClick={handleImport}>{t("importAction")}</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Diff preview dialog */}
			<Dialog open={diffOpen} onOpenChange={setDiffOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("diffTitle")}</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">{t("diffDesc")}</p>
					{!hasDiff ? (
						<p className="text-sm">{t("noChanges")}</p>
					) : (
						<div className="space-y-3 text-sm">
							{addedFields.length > 0 && (
								<div>
									<p className="mb-1 font-medium text-success">+ Added ({addedFields.length})</p>
									{addedFields.map((f) => (
										<div
											key={f.name}
											className="rounded px-2 py-1 font-mono text-xs bg-success/10 text-success"
										>
											{f.name}: {f.type}
										</div>
									))}
								</div>
							)}
							{removedFields.length > 0 && (
								<div>
									<p className="mb-1 font-medium text-destructive">
										- Removed ({removedFields.length})
									</p>
									{removedFields.map((f) => (
										<div
											key={f.name}
											className="rounded px-2 py-1 font-mono text-xs bg-destructive/10 text-destructive"
										>
											{f.name}: {f.type}
										</div>
									))}
								</div>
							)}
						</div>
					)}
					<div className="gap-2 flex justify-end">
						<Button variant="outline" onClick={() => setDiffOpen(false)}>
							{t("cancel")}
						</Button>
						<Button
							variant="outline"
							disabled={mutation.isPending || reindexMutation.isPending}
							loading={mutation.isPending && !reindexMutation.isPending}
							onClick={() => {
								const validFields = draft.filter((f) => f.name.trim());
								mutation.mutate(
									{
										organizationId,
										slug,
										fields: validFields as never,
										defaultSortingField: defaultSort || undefined,
										tokenSeparators: tokenSeparators.length > 0 ? tokenSeparators : undefined,
										symbolTokensToIndex:
											symbolTokensToIndex.length > 0 ? symbolTokensToIndex : undefined,
										triggerReindex: false,
									},
									{
										onSuccess: () => {
											reindexMutation.mutate({ organizationId, slug });
											setDiffOpen(false);
										},
									},
								);
							}}
						>
							{t("saveReindex")}
						</Button>
						<Button
							disabled={mutation.isPending || reindexMutation.isPending}
							loading={mutation.isPending || reindexMutation.isPending}
							onClick={() => {
								handleSave(false);
								setDiffOpen(false);
							}}
						>
							{t("saveOnly")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
