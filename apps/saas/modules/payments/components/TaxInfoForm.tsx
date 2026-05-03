"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const taxIdTypes = [
	{ value: "vat", label: "VAT (EU)" },
	{ value: "ein", label: "EIN (US)" },
	{ value: "inn", label: "ИНН (RU)" },
] as const;

const taxInfoSchema = z.object({
	legalName: z.string().min(1, "Legal company name is required"),
	taxIdType: z.string().min(1, "Tax ID type is required"),
	taxId: z.string().min(1, "Tax ID is required"),
	companyAddress: z.string().min(1, "Company address is required"),
	invoiceEmail: z.string().email("Invalid email address"),
});

type TaxInfoFormValues = z.infer<typeof taxInfoSchema>;

export function TaxInfoForm({ organizationId }: { organizationId: string }) {
	const t = useTranslations("settings");
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery(
		orpc.payments.getTaxInfo.queryOptions({
			input: { organizationId },
		}),
	);

	const taxInfo = data?.taxInfo;

	const form = useForm<TaxInfoFormValues>({
		resolver: zodResolver(taxInfoSchema),
		defaultValues: {
			legalName: "",
			taxIdType: "",
			taxId: "",
			companyAddress: "",
			invoiceEmail: "",
		},
	});

	// Update form when data loads
	const isFormReady = !isLoading && taxInfo !== undefined;
	if (isFormReady && form.getValues("legalName") === "" && taxInfo) {
		form.reset({
			legalName: taxInfo.legalName ?? "",
			taxIdType: taxInfo.taxIdType ?? "",
			taxId: taxInfo.taxId ?? "",
			companyAddress: taxInfo.address ?? "",
			invoiceEmail: taxInfo.invoiceEmail ?? "",
		});
	}

	const updateMutation = useMutation(
		orpc.payments.updateTaxInfo.mutationOptions({
			onSuccess: () => {
				toast.success(t("billing.invoice.saveSuccess"));
				void queryClient.invalidateQueries({
					queryKey: orpc.payments.getTaxInfo.queryKey({ input: { organizationId } }),
				});
			},
			onError: (error) => {
				toast.error(error.message || t("billing.invoice.saveError"));
			},
		}),
	);

	const onSubmit = form.handleSubmit((values) => {
		updateMutation.mutate({
			organizationId,
			taxInfo: {
				legalName: values.legalName,
				taxIdType: values.taxIdType as "vat" | "ein" | "inn" | undefined,
				taxId: values.taxId,
				address: values.companyAddress,
				invoiceEmail: values.invoiceEmail,
			},
		});
	});

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("billing.invoice.taxInfo")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-9 w-32" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("billing.invoice.taxInfo")}</CardTitle>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						<FormField
							control={form.control}
							name="legalName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("billing.invoice.legalName")}</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder={t("billing.invoice.legalNamePlaceholder")}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="taxIdType"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("billing.invoice.taxIdType")}</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue
													placeholder={t(
														"billing.invoice.taxIdTypePlaceholder",
													)}
												/>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{taxIdTypes.map((type) => (
												<SelectItem key={type.value} value={type.value}>
													{type.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="taxId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("billing.invoice.taxId")}</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder={t("billing.invoice.taxIdPlaceholder")}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="companyAddress"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("billing.invoice.companyAddress")}</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											placeholder={t(
												"billing.invoice.companyAddressPlaceholder",
											)}
											rows={3}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="invoiceEmail"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("billing.invoice.invoiceEmail")}</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="email"
											placeholder={t(
												"billing.invoice.invoiceEmailPlaceholder",
											)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" variant="primary" loading={updateMutation.isPending}>
							{updateMutation.isPending
								? t("billing.invoice.saving")
								: t("billing.invoice.save")}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
