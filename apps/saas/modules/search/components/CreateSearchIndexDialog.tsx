"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/components/button";
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
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useCreateSearchIndexMutation } from "../lib/api";

const fieldSchema = z.object({
	name: z.string().min(1).max(64),
	type: z.enum([
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
	]),
	facet: z.boolean().optional(),
	optional: z.boolean().optional(),
});

const formSchema = z.object({
	slug: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase, digits and dashes only"),
	displayName: z.string().min(1).max(120),
	defaultSortingField: z.string().optional(),
	fieldsJson: z
		.string()
		.min(1)
		.refine(
			(value) => {
				try {
					const parsed = JSON.parse(value);
					return z.array(fieldSchema).safeParse(parsed).success;
				} catch {
					return false;
				}
			},
			{ message: "must be a valid JSON array of field definitions" },
		),
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_FIELDS_JSON = JSON.stringify(
	[
		{ name: "id", type: "string" },
		{ name: "title", type: "string" },
		{ name: "description", type: "string", optional: true },
		{ name: "tags", type: "string[]", facet: true, optional: true },
		{ name: "created_at", type: "int64", optional: true },
	],
	null,
	2,
);

interface CreateSearchIndexDialogProps {
	organizationId: string;
}

export function CreateSearchIndexDialog({ organizationId }: CreateSearchIndexDialogProps) {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const createMutation = useCreateSearchIndexMutation();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			slug: "",
			displayName: "",
			defaultSortingField: "",
			fieldsJson: DEFAULT_FIELDS_JSON,
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		try {
			const fields = JSON.parse(values.fieldsJson) as z.infer<typeof fieldSchema>[];
			await createMutation.mutateAsync({
				organizationId,
				slug: values.slug,
				displayName: values.displayName,
				defaultSortingField: values.defaultSortingField || undefined,
				fields,
			});
			toastSuccess(t("search.createIndex.success"));
			form.reset({
				slug: "",
				displayName: "",
				defaultSortingField: "",
				fieldsJson: DEFAULT_FIELDS_JSON,
			});
			setOpen(false);
		} catch (error) {
			toastError(error instanceof Error ? error.message : t("search.createIndex.error"));
		}
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="primary">{t("search.createIndex.trigger")}</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{t("search.createIndex.title")}</DialogTitle>
					<DialogDescription>{t("search.createIndex.description")}</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						<FormField
							control={form.control}
							name="displayName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("search.fields.displayName")}</FormLabel>
									<FormControl>
										<Input {...field} />
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
									<FormLabel>{t("search.fields.slug")}</FormLabel>
									<FormControl>
										<Input {...field} placeholder="products" />
									</FormControl>
									<FormDescription>
										{t("search.createIndex.slugHelp")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="defaultSortingField"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("search.fields.defaultSortingField")}</FormLabel>
									<FormControl>
										<Input {...field} placeholder="created_at" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="fieldsJson"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("search.fields.schema")}</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											rows={12}
											className="font-mono text-xs"
										/>
									</FormControl>
									<FormDescription>
										{t("search.createIndex.schemaHelp")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button
								type="submit"
								loading={form.formState.isSubmitting}
								variant="primary"
							>
								{t("search.createIndex.submit")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
