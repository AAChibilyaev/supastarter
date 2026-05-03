"use client";

import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

const SUPPORTED_CURRENCIES = [
	{ code: "USD", label: "US Dollar (USD)" },
	{ code: "EUR", label: "Euro (EUR)" },
	{ code: "RUB", label: "Russian Ruble (RUB)" },
	{ code: "GBP", label: "British Pound (GBP)" },
	{ code: "JPY", label: "Japanese Yen (JPY)" },
] as const;

export function PreferredCurrencySelector({
	organizationId,
	currentCurrency,
}: {
	organizationId: string;
	currentCurrency?: string;
}) {
	const t = useTranslations("settings.billing.invoiceHistory");
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);

	const mutation = useMutation(
		orpc.payments.setPreferredCurrency.mutationOptions({
			onSuccess: () => {
				// Invalidate both the currency and invoices queries
				queryClient.invalidateQueries({
					queryKey: orpc.payments.getPreferredCurrency.queryKey({
						input: { organizationId },
					}),
				});
				queryClient.invalidateQueries({
					queryKey: orpc.payments.listInvoices.queryKey({
						input: { organizationId },
					}),
				});
				setOpen(false);
			},
		}),
	);

	const handleSelect = (currency: string) => {
		const value = currency === "none" ? null : currency;
		mutation.mutate({
			organizationId,
			preferredCurrency: value,
		});
	};

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" disabled={mutation.isPending}>
					{currentCurrency
						? `${t("displayCurrency")}: ${currentCurrency}`
						: t("selectCurrency")}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>{t("displayCurrencyLabel")}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup
					value={currentCurrency ?? "none"}
					onValueChange={handleSelect}
				>
					<DropdownMenuRadioItem value="none">
						{t("originalCurrency")}
					</DropdownMenuRadioItem>
					{SUPPORTED_CURRENCIES.map((currency) => (
						<DropdownMenuRadioItem key={currency.code} value={currency.code}>
							{currency.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
