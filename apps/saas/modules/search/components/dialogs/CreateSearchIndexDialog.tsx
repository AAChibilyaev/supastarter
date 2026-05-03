"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Switch } from "@repo/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Textarea } from "@repo/ui/components/textarea";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@repo/ui/components/tooltip";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	BoxIcon,
	CalendarClockIcon,
	CheckIcon,
	HashIcon,
	HelpCircleIcon,
	KeyRoundIcon,
	ListIcon,
	PlusIcon,
	SparklesIcon,
	ToggleLeftIcon,
	Trash2Icon,
	TypeIcon,
	WandSparklesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useCreateSearchIndexMutation } from "../../lib/api";

const fieldTypes = [
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
] as const;

type FieldType = (typeof fieldTypes)[number];

const fieldSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "letters, digits and underscore"),
	type: z.enum(fieldTypes),
	facet: z.boolean().optional(),
	optional: z.boolean().optional(),
	index: z.boolean().optional(),
	sort: z.boolean().optional(),
});

type SchemaField = z.infer<typeof fieldSchema>;

const formSchema = z.object({
	displayName: z.string().min(1).max(120),
	slug: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase, digits and dashes only"),
	defaultSortingField: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const NUMERIC_TYPES: ReadonlySet<FieldType> = new Set(["int32", "int64", "float"]);

function isNumeric(type: FieldType) {
	return NUMERIC_TYPES.has(type);
}

function slugify(input: string): string {
	return input
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9-\s]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 64);
}

interface FieldTypeMeta {
	icon: typeof TypeIcon;
	group: "text" | "number" | "boolean" | "object" | "auto";
}

const TYPE_META: Record<FieldType, FieldTypeMeta> = {
	string: { icon: TypeIcon, group: "text" },
	"string[]": { icon: ListIcon, group: "text" },
	int32: { icon: HashIcon, group: "number" },
	int64: { icon: HashIcon, group: "number" },
	float: { icon: HashIcon, group: "number" },
	"int32[]": { icon: ListIcon, group: "number" },
	"int64[]": { icon: ListIcon, group: "number" },
	"float[]": { icon: ListIcon, group: "number" },
	bool: { icon: ToggleLeftIcon, group: "boolean" },
	"bool[]": { icon: ListIcon, group: "boolean" },
	object: { icon: BoxIcon, group: "object" },
	"object[]": { icon: BoxIcon, group: "object" },
	auto: { icon: SparklesIcon, group: "auto" },
};

interface Template {
	id: string;
	icon: typeof TypeIcon;
	displayName: string;
	slug: string;
	defaultSortingField: string;
	fields: SchemaField[];
}

const TEMPLATES: Template[] = [
	{
		id: "products",
		icon: BoxIcon,
		displayName: "Products",
		slug: "products",
		defaultSortingField: "created_at",
		fields: [
			{ name: "id", type: "string" },
			{ name: "title", type: "string" },
			{ name: "description", type: "string", optional: true },
			{ name: "price", type: "float", facet: true, sort: true },
			{ name: "categories", type: "string[]", facet: true, optional: true },
			{ name: "tags", type: "string[]", facet: true, optional: true },
			{ name: "in_stock", type: "bool", facet: true, optional: true },
			{ name: "created_at", type: "int64", sort: true, optional: true },
		],
	},
	{
		id: "articles",
		icon: TypeIcon,
		displayName: "Articles",
		slug: "articles",
		defaultSortingField: "published_at",
		fields: [
			{ name: "id", type: "string" },
			{ name: "title", type: "string" },
			{ name: "excerpt", type: "string", optional: true },
			{ name: "body", type: "string" },
			{ name: "author", type: "string", facet: true },
			{ name: "tags", type: "string[]", facet: true, optional: true },
			{ name: "published_at", type: "int64", sort: true },
		],
	},
	{
		id: "users",
		icon: HashIcon,
		displayName: "Users",
		slug: "users",
		defaultSortingField: "created_at",
		fields: [
			{ name: "id", type: "string" },
			{ name: "name", type: "string" },
			{ name: "email", type: "string" },
			{ name: "role", type: "string", facet: true, optional: true },
			{ name: "active", type: "bool", facet: true, optional: true },
			{ name: "created_at", type: "int64", sort: true, optional: true },
		],
	},
	{
		id: "blank",
		icon: WandSparklesIcon,
		displayName: "Blank",
		slug: "items",
		defaultSortingField: "",
		fields: [{ name: "id", type: "string" }],
	},
];

function HelpHint({ text }: { text: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					tabIndex={-1}
					aria-label="info"
					className="inline-flex items-center text-foreground/40 transition-colors hover:text-foreground/80"
				>
					<HelpCircleIcon className="size-3.5" />
				</button>
			</TooltipTrigger>
			<TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
		</Tooltip>
	);
}

interface CreateSearchIndexDialogProps {
	organizationId: string;
	trigger?: ReactNode;
}

export function CreateSearchIndexDialog({ organizationId, trigger }: CreateSearchIndexDialogProps) {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<"builder" | "json">("builder");
	const [slugTouched, setSlugTouched] = useState(false);
	const [fields, setFields] = useState<SchemaField[]>(TEMPLATES[0].fields);
	const [jsonText, setJsonText] = useState(() => JSON.stringify(TEMPLATES[0].fields, null, 2));
	const [jsonError, setJsonError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({});

	const createMutation = useCreateSearchIndexMutation();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			displayName: TEMPLATES[0].displayName,
			slug: TEMPLATES[0].slug,
			defaultSortingField: TEMPLATES[0].defaultSortingField,
		},
	});

	const displayName = form.watch("displayName");

	useEffect(() => {
		if (!slugTouched) {
			form.setValue("slug", slugify(displayName ?? ""), { shouldValidate: true });
		}
	}, [displayName, slugTouched, form]);

	const sortableOptions = useMemo(
		() =>
			fields
				.filter((f) => f.name && (isNumeric(f.type) || f.sort))
				.map((f) => ({ name: f.name, type: f.type })),
		[fields],
	);

	const errorCount = Object.keys(fieldErrors).length;
	const hasFieldErrors = errorCount > 0;

	const validateFields = (next: SchemaField[]): boolean => {
		const errors: Record<number, string> = {};
		const seen = new Set<string>();
		next.forEach((field, idx) => {
			const parsed = fieldSchema.safeParse(field);
			if (!parsed.success) {
				errors[idx] = parsed.error.issues[0]?.message ?? "invalid";
				return;
			}
			if (seen.has(field.name)) {
				errors[idx] = t("search.createIndex.errors.duplicateName");
				return;
			}
			seen.add(field.name);
		});
		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const updateField = (index: number, patch: Partial<SchemaField>) => {
		setFields((prev) => {
			const previous = prev[index];
			const next = prev.map((f, i) => (i === index ? { ...f, ...patch } : f));
			validateFields(next);
			if (previous && patch.name !== undefined && patch.name !== previous.name) {
				const currentSort = form.getValues("defaultSortingField");
				if (currentSort === previous.name) {
					form.setValue("defaultSortingField", patch.name, { shouldValidate: true });
				}
			}
			if (previous && patch.type !== undefined && patch.type !== previous.type) {
				const currentSort = form.getValues("defaultSortingField");
				const updated = next[index];
				if (
					updated &&
					currentSort === updated.name &&
					!isNumeric(updated.type) &&
					!updated.sort
				) {
					form.setValue("defaultSortingField", "", { shouldValidate: true });
				}
			}
			return next;
		});
	};

	const addField = () => {
		setFields((prev) => {
			const used = new Set(prev.map((f) => f.name));
			let counter = prev.length + 1;
			let candidate = `field_${counter}`;
			while (used.has(candidate)) {
				counter += 1;
				candidate = `field_${counter}`;
			}
			const next = [...prev, { name: candidate, type: "string" as FieldType }];
			validateFields(next);
			return next;
		});
	};

	const removeField = (index: number) => {
		setFields((prev) => {
			const removed = prev[index];
			const next = prev.filter((_, i) => i !== index);
			validateFields(next);
			if (removed && form.getValues("defaultSortingField") === removed.name) {
				form.setValue("defaultSortingField", "", { shouldValidate: true });
			}
			return next;
		});
	};

	const moveField = (index: number, direction: -1 | 1) => {
		setFields((prev) => {
			const target = index + direction;
			if (target < 0 || target >= prev.length) {
				return prev;
			}
			const next = [...prev];
			const [moved] = next.splice(index, 1);
			if (moved) {
				next.splice(target, 0, moved);
			}
			validateFields(next);
			return next;
		});
	};

	const applyTemplate = (template: Template) => {
		setFields(template.fields);
		setFieldErrors({});
		form.setValue("displayName", template.displayName);
		setSlugTouched(false);
		form.setValue("slug", template.slug, { shouldValidate: true });
		form.setValue("defaultSortingField", template.defaultSortingField);
		setJsonText(JSON.stringify(template.fields, null, 2));
		setJsonError(null);
	};

	const syncJsonFromBuilder = () => {
		setJsonText(JSON.stringify(fields, null, 2));
		setJsonError(null);
	};

	const syncBuilderFromJson = (): SchemaField[] | null => {
		try {
			const parsed = JSON.parse(jsonText);
			const result = z.array(fieldSchema).safeParse(parsed);
			if (!result.success) {
				setJsonError(
					result.error.issues[0]?.message ?? t("search.createIndex.errors.invalidJson"),
				);
				return null;
			}
			setJsonError(null);
			setFields(result.data);
			validateFields(result.data);
			return result.data;
		} catch (error) {
			setJsonError(
				error instanceof Error ? error.message : t("search.createIndex.errors.invalidJson"),
			);
			return null;
		}
	};

	const onTabChange = (value: string) => {
		if (value === "json" && mode === "builder") {
			syncJsonFromBuilder();
			setMode("json");
		} else if (value === "builder" && mode === "json") {
			const synced = syncBuilderFromJson();
			if (synced) {
				setMode("builder");
			}
		}
	};

	const onSubmit = form.handleSubmit(async (values) => {
		let activeFields = fields;
		if (mode === "json") {
			const synced = syncBuilderFromJson();
			if (!synced) {
				return;
			}
			activeFields = synced;
		}
		if (!activeFields.length) {
			toastError(t("search.createIndex.errors.empty"));
			return;
		}
		if (!validateFields(activeFields)) {
			toastError(t("search.createIndex.errors.fieldsInvalid"));
			return;
		}
		try {
			await createMutation.mutateAsync({
				organizationId,
				slug: values.slug,
				displayName: values.displayName,
				defaultSortingField: values.defaultSortingField || undefined,
				fields: activeFields,
			});
			toastSuccess(t("search.createIndex.success"));
			form.reset({
				displayName: TEMPLATES[0].displayName,
				slug: TEMPLATES[0].slug,
				defaultSortingField: TEMPLATES[0].defaultSortingField,
			});
			setFields(TEMPLATES[0].fields);
			setJsonText(JSON.stringify(TEMPLATES[0].fields, null, 2));
			setSlugTouched(false);
			setOpen(false);
		} catch (error) {
			toastError(error instanceof Error ? error.message : t("search.createIndex.error"));
		}
	});

	return (
		<TooltipProvider delayDuration={150}>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					{trigger ?? (
						<Button variant="primary">
							<PlusIcon className="size-4" />
							{t("search.createIndex.trigger")}
						</Button>
					)}
				</DialogTrigger>
				<DialogContent className="max-w-3xl sm:max-w-3xl max-h-[92vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{t("search.createIndex.title")}</DialogTitle>
						<DialogDescription>{t("search.createIndex.description")}</DialogDescription>
					</DialogHeader>

					<div className="-mx-1 gap-2 px-1 flex flex-wrap">
						<span className="text-xs font-medium text-foreground/60">
							{t("search.createIndex.startFromTemplate")}
						</span>
						{TEMPLATES.map((template) => {
							const Icon = template.icon;
							return (
								<button
									key={template.id}
									type="button"
									onClick={() => applyTemplate(template)}
									className="gap-1.5 px-3 py-1 text-xs font-medium inline-flex items-center rounded-full border bg-card text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
								>
									<Icon className="size-3.5" />
									{t(`search.createIndex.templates.${template.id}` as never)}
								</button>
							);
						})}
					</div>

					<Form {...form}>
						<form onSubmit={onSubmit} className="space-y-5">
							<div className="gap-4 sm:grid-cols-2 grid">
								<FormField
									control={form.control}
									name="displayName"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="gap-1.5 flex items-center">
												{t("search.fields.displayName")}
												<HelpHint
													text={t(
														"search.createIndex.tooltips.displayName",
													)}
												/>
											</FormLabel>
											<FormControl>
												<Input {...field} placeholder="Products" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="slug"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="gap-1.5 flex items-center">
												{t("search.fields.slug")}
												<HelpHint
													text={t("search.createIndex.tooltips.slug")}
												/>
												{!slugTouched && (
													<Badge
														status="info"
														className="ml-auto text-[10px]"
													>
														{t("search.createIndex.autoFromName")}
													</Badge>
												)}
											</FormLabel>
											<FormControl>
												<Input
													{...field}
													placeholder="products"
													onChange={(event) => {
														setSlugTouched(true);
														field.onChange(event);
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<Tabs value={mode} onValueChange={onTabChange}>
								<TabsList>
									<TabsTrigger value="builder">
										<WandSparklesIcon className="mr-1.5 size-3.5" />
										{t("search.createIndex.builder")}
									</TabsTrigger>
									<TabsTrigger value="json">
										<HashIcon className="mr-1.5 size-3.5" />
										{t("search.createIndex.json")}
									</TabsTrigger>
								</TabsList>

								<TabsContent value="builder" className="mt-4 space-y-3">
									<div className="flex items-center justify-between">
										<div>
											<Label className="gap-1.5 flex items-center">
												{t("search.createIndex.fieldsTitle")}
												<HelpHint
													text={t("search.createIndex.tooltips.fields")}
												/>
											</Label>
											<p className="text-xs text-foreground/60">
												{t("search.createIndex.fieldsCount", {
													count: fields.length,
												})}
											</p>
										</div>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={addField}
										>
											<PlusIcon className="size-3.5" />
											{t("search.createIndex.addField")}
										</Button>
									</div>

									<div className="space-y-2">
										{fields.length === 0 && (
											<Card className="rounded-lg border border-dashed">
												<CardContent className="p-6 text-sm text-center text-foreground/60">
													{t("search.createIndex.noFields")}
												</CardContent>
											</Card>
										)}
										{fields.map((field, index) => {
											const Icon = TYPE_META[field.type].icon;
											const error = fieldErrors[index];
											const isIdField = field.name === "id";
											return (
												<Card
													key={index}
													className="rounded-lg border bg-card/40 transition-colors hover:bg-card"
												>
													<CardContent className="p-3">
														<div className="gap-2 flex flex-wrap items-start">
															<div className="gap-1 flex flex-col">
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		moveField(index, -1)
																	}
																	disabled={index === 0}
																	className="h-5 w-5 p-0 text-foreground/50 hover:text-foreground"
																	aria-label={t(
																		"search.createIndex.moveUp",
																	)}
																>
																	<ArrowUpIcon className="size-3" />
																</Button>
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		moveField(index, 1)
																	}
																	disabled={
																		index === fields.length - 1
																	}
																	className="h-5 w-5 p-0 text-foreground/50 hover:text-foreground"
																	aria-label={t(
																		"search.createIndex.moveDown",
																	)}
																>
																	<ArrowDownIcon className="size-3" />
																</Button>
															</div>
															<div className="gap-2 flex min-w-[180px] flex-1 items-center">
																{isIdField ? (
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<KeyRoundIcon className="size-4 text-primary" />
																		</TooltipTrigger>
																		<TooltipContent className="max-w-xs text-xs">
																			{t(
																				"search.createIndex.tooltips.idField",
																			)}
																		</TooltipContent>
																	</Tooltip>
																) : (
																	<Icon className="size-4 text-foreground/50" />
																)}
																<Input
																	value={field.name}
																	placeholder="field_name"
																	onChange={(event) =>
																		updateField(index, {
																			name: event.target
																				.value,
																		})
																	}
																	className="h-9"
																/>
															</div>
															<div className="w-[180px]">
																<Select
																	value={field.type}
																	onValueChange={(value) =>
																		updateField(index, {
																			type: value as FieldType,
																		})
																	}
																>
																	<SelectTrigger>
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectGroup>
																			<SelectLabel>
																				{t(
																					"search.createIndex.typeGroups.text",
																				)}
																			</SelectLabel>
																			<SelectItem value="string">
																				string
																			</SelectItem>
																			<SelectItem value="string[]">
																				string[]
																			</SelectItem>
																		</SelectGroup>
																		<SelectGroup>
																			<SelectLabel>
																				{t(
																					"search.createIndex.typeGroups.number",
																				)}
																			</SelectLabel>
																			<SelectItem value="int32">
																				int32
																			</SelectItem>
																			<SelectItem value="int64">
																				int64
																			</SelectItem>
																			<SelectItem value="float">
																				float
																			</SelectItem>
																			<SelectItem value="int32[]">
																				int32[]
																			</SelectItem>
																			<SelectItem value="int64[]">
																				int64[]
																			</SelectItem>
																			<SelectItem value="float[]">
																				float[]
																			</SelectItem>
																		</SelectGroup>
																		<SelectGroup>
																			<SelectLabel>
																				{t(
																					"search.createIndex.typeGroups.boolean",
																				)}
																			</SelectLabel>
																			<SelectItem value="bool">
																				bool
																			</SelectItem>
																			<SelectItem value="bool[]">
																				bool[]
																			</SelectItem>
																		</SelectGroup>
																		<SelectGroup>
																			<SelectLabel>
																				{t(
																					"search.createIndex.typeGroups.advanced",
																				)}
																			</SelectLabel>
																			<SelectItem value="object">
																				object
																			</SelectItem>
																			<SelectItem value="object[]">
																				object[]
																			</SelectItem>
																			<SelectItem value="auto">
																				auto
																			</SelectItem>
																		</SelectGroup>
																	</SelectContent>
																</Select>
															</div>
															<div className="gap-3 flex flex-wrap items-center">
																<Tooltip>
																	<TooltipTrigger asChild>
																		<label className="gap-1.5 px-2 py-1 text-xs inline-flex cursor-pointer items-center rounded-md hover:bg-muted">
																			<Switch
																				checked={
																					field.facet ??
																					false
																				}
																				onCheckedChange={(
																					checked,
																				) =>
																					updateField(
																						index,
																						{
																							facet: checked,
																						},
																					)
																				}
																			/>
																			<span>
																				{t(
																					"search.createIndex.toggles.facet",
																				)}
																			</span>
																		</label>
																	</TooltipTrigger>
																	<TooltipContent className="max-w-xs text-xs">
																		{t(
																			"search.createIndex.tooltips.facet",
																		)}
																	</TooltipContent>
																</Tooltip>
																<Tooltip>
																	<TooltipTrigger asChild>
																		<label className="gap-1.5 px-2 py-1 text-xs inline-flex cursor-pointer items-center rounded-md hover:bg-muted">
																			<Switch
																				checked={
																					field.optional ??
																					false
																				}
																				onCheckedChange={(
																					checked,
																				) =>
																					updateField(
																						index,
																						{
																							optional:
																								checked,
																						},
																					)
																				}
																			/>
																			<span>
																				{t(
																					"search.createIndex.toggles.optional",
																				)}
																			</span>
																		</label>
																	</TooltipTrigger>
																	<TooltipContent className="max-w-xs text-xs">
																		{t(
																			"search.createIndex.tooltips.optional",
																		)}
																	</TooltipContent>
																</Tooltip>
																<Tooltip>
																	<TooltipTrigger asChild>
																		<label className="gap-1.5 px-2 py-1 text-xs inline-flex cursor-pointer items-center rounded-md hover:bg-muted">
																			<Switch
																				checked={
																					field.sort ??
																					false
																				}
																				onCheckedChange={(
																					checked,
																				) =>
																					updateField(
																						index,
																						{
																							sort: checked,
																						},
																					)
																				}
																			/>
																			<span>
																				{t(
																					"search.createIndex.toggles.sort",
																				)}
																			</span>
																		</label>
																	</TooltipTrigger>
																	<TooltipContent className="max-w-xs text-xs">
																		{t(
																			"search.createIndex.tooltips.sort",
																		)}
																	</TooltipContent>
																</Tooltip>
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		removeField(index)
																	}
																	className="text-foreground/60 hover:text-destructive"
																	aria-label={t(
																		"search.createIndex.removeField",
																	)}
																>
																	<Trash2Icon className="size-4" />
																</Button>
															</div>
														</div>
														{error && (
															<p className="mt-1.5 text-xs text-destructive">
																{error}
															</p>
														)}
													</CardContent>
												</Card>
											);
										})}
									</div>
								</TabsContent>

								<TabsContent value="json" className="mt-4 space-y-2">
									<Label className="gap-1.5 flex items-center">
										{t("search.fields.schema")}
										<HelpHint text={t("search.createIndex.tooltips.json")} />
									</Label>
									<Textarea
										rows={14}
										value={jsonText}
										onChange={(event) => {
											setJsonText(event.target.value);
											setJsonError(null);
										}}
										className="font-mono text-xs"
									/>
									{jsonError && (
										<p className="text-xs text-destructive">{jsonError}</p>
									)}
									<p className="text-xs text-foreground/60">
										{t("search.createIndex.schemaHelp")}
									</p>
								</TabsContent>
							</Tabs>

							<FormField
								control={form.control}
								name="defaultSortingField"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="gap-1.5 flex items-center">
											<CalendarClockIcon className="size-3.5 text-foreground/60" />
											{t("search.fields.defaultSortingField")}
											<HelpHint
												text={t("search.createIndex.tooltips.defaultSort")}
											/>
										</FormLabel>
										<FormControl>
											<Select
												value={field.value || "__none"}
												onValueChange={(value) =>
													field.onChange(value === "__none" ? "" : value)
												}
											>
												<SelectTrigger>
													<SelectValue
														placeholder={t("search.createIndex.noSort")}
													/>
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="__none">
														{t("search.createIndex.noSort")}
													</SelectItem>
													{sortableOptions.length === 0 ? (
														<SelectItem value="__hint" disabled>
															{t("search.createIndex.noSortableHint")}
														</SelectItem>
													) : (
														sortableOptions.map((option) => (
															<SelectItem
																key={option.name}
																value={option.name}
															>
																<span className="gap-2 flex items-center">
																	<HashIcon className="size-3.5 text-foreground/50" />
																	{option.name}
																	<span className="text-xs text-foreground/50">
																		{option.type}
																	</span>
																</span>
															</SelectItem>
														))
													)}
												</SelectContent>
											</Select>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<DialogFooter className="gap-2 sm:justify-between flex items-center justify-between">
								<p className="text-xs text-foreground/60">
									{hasFieldErrors ? (
										<span className="text-destructive">
											{t("search.createIndex.errorsCount", {
												count: errorCount,
											})}
										</span>
									) : (
										<>
											<CheckIcon className="mr-1 size-3 inline" />
											{t("search.createIndex.tenantHint")}
										</>
									)}
								</p>
								<Button
									type="submit"
									loading={
										form.formState.isSubmitting || createMutation.isPending
									}
									disabled={hasFieldErrors || fields.length === 0}
									variant="primary"
								>
									{t("search.createIndex.submit")}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}
