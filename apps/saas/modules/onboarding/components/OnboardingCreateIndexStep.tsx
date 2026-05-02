"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Button } from "@repo/ui/components/button";
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
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useCreateSearchIndexMutation } from "@search/lib/api";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";

const slugify = (input: string) =>
	input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 64) || "my-index";

const formSchema = z.object({
	displayName: z.string().min(1).max(120),
	slug: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase letters, digits, and dashes"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
	onCompleted: (indexSlug: string) => void;
}

export function OnboardingCreateIndexStep({ onCompleted }: Props) {
	const t = useTranslations();
	const { activeOrganization } = useActiveOrganization();
	const createIndex = useCreateSearchIndexMutation();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: { displayName: "", slug: "" },
	});

	if (!activeOrganization) {
		return <p className="text-sm text-foreground/60">{t("onboarding.createIndex.noOrg")}</p>;
	}

	const onSubmit = form.handleSubmit(async ({ displayName, slug }) => {
		try {
			await createIndex.mutateAsync({
				organizationId: activeOrganization.id,
				displayName,
				slug,
				fields: [{ name: "id", type: "string", facet: false, optional: false }],
			});
			toastSuccess(t("onboarding.createIndex.success"));
			onCompleted(slug);
		} catch {
			toastError(t("onboarding.createIndex.error"));
		}
	});

	return (
		<Form {...form}>
			<form className="gap-6 flex flex-col" onSubmit={onSubmit}>
				<FormField
					control={form.control}
					name="displayName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("onboarding.createIndex.nameLabel")}</FormLabel>
							<FormControl>
								<Input
									{...field}
									placeholder="My Store Products"
									onChange={(e) => {
										field.onChange(e);
										const current = form.getValues("slug");
										if (
											!current ||
											current ===
												slugify(form.getValues("displayName").slice(0, -1))
										) {
											form.setValue("slug", slugify(e.target.value), {
												shouldValidate: true,
											});
										}
									}}
								/>
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
							<FormLabel>{t("onboarding.createIndex.slugLabel")}</FormLabel>
							<FormControl>
								<Input {...field} placeholder="my-store-products" />
							</FormControl>
							<FormDescription>
								{t("onboarding.createIndex.slugHint")}
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" loading={form.formState.isSubmitting}>
					{t("onboarding.createIndex.submit")}
					<ArrowRightIcon className="ml-2 size-4" />
				</Button>
			</form>
		</Form>
	);
}
