"use client";

import { InvoiceStatusBadge } from "@payments/components/InvoiceStatusBadge";
import { PreferredCurrencySelector } from "@payments/components/PreferredCurrencySelector";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

const ITEMS_PER_PAGE = 10;

export function InvoiceHistory({ organizationId }: { organizationId?: string }) {
	const t = useTranslations();
	const format = useFormatter();
	const [currentPage, setCurrentPage] = useState(1);
	const [cursorStack, setCursorStack] = useState<string[]>([]);

	const startingAfter = cursorStack[cursorStack.length - 1];

	// Fetch preferred currency for the organization
	const { data: prefCurrencyData } = useQuery(
		orpc.payments.getPreferredCurrency.queryOptions({
			input: { organizationId: organizationId ?? "" },
		}),
		{
			enabled: !!organizationId,
		},
	);

	const preferredCurrency = prefCurrencyData?.preferredCurrency ?? undefined;

	const { data, isLoading } = useQuery(
		orpc.payments.listInvoices.queryOptions({
			input: {
				organizationId,
				limit: ITEMS_PER_PAGE,
				startingAfter,
				preferredCurrency,
			},
		}),
	);

	const invoices = data?.invoices ?? [];
	const hasMore = data?.hasMore ?? false;
	const conversionApplied = data?.conversionApplied ?? false;

	const handleNextPage = () => {
		if (hasMore && invoices.length > 0) {
			const lastId = invoices[invoices.length - 1].id;
			setCursorStack((prev) => [...prev, lastId]);
			setCurrentPage((p) => p + 1);
		}
	};

	const handlePrevPage = () => {
		if (currentPage > 1) {
			setCursorStack((prev) => prev.slice(0, -1));
			setCurrentPage((p) => p - 1);
		}
	};

	const formatAmount = (amount: number, currency: string) => {
		return format.number(amount / 100, {
			style: "currency",
			currency: currency.toUpperCase(),
		});
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>{t("settings.billing.invoiceHistory.title")}</CardTitle>
				{organizationId && (
					<PreferredCurrencySelector
						organizationId={organizationId}
						currentCurrency={preferredCurrency}
					/>
				)}
			</CardHeader>
			<CardContent className="p-0">
				{isLoading ? (
					<div className="p-6 space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : invoices.length === 0 ? (
					<div className="p-6 text-sm text-center text-muted-foreground">
						{t("settings.billing.invoiceHistory.empty")}
					</div>
				) : (
					<>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>
										{t("settings.billing.invoiceHistory.date")}
									</TableHead>
									<TableHead>
										{t("settings.billing.invoiceHistory.amount")}
									</TableHead>
									{conversionApplied && (
										<TableHead>
											{t("settings.billing.invoiceHistory.convertedAmount")}
										</TableHead>
									)}
									<TableHead>
										{t("settings.billing.invoiceHistory.statusLabel")}
									</TableHead>
									<TableHead className="text-right">
										{t("settings.billing.invoiceHistory.actions")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{invoices.map((invoice) => (
									<TableRow key={invoice.id}>
										<TableCell className="text-sm">
											{invoice.date
												? format.dateTime(new Date(invoice.date * 1000), {
														year: "numeric",
														month: "short",
														day: "numeric",
													})
												: "—"}
										</TableCell>
										<TableCell className="text-sm font-medium">
											{formatAmount(invoice.amountPaid, invoice.currency)}
										</TableCell>
										{conversionApplied && invoice.convertedAmount && (
											<TableCell className="text-sm text-muted-foreground">
												<span className="font-medium">
													{formatAmount(
														invoice.convertedAmount.amount,
														invoice.convertedAmount.currency,
													)}
												</span>
												{invoice.convertedAmount.rate && (
													<span className="ml-1 text-xs text-muted-foreground">
														(1 {invoice.currency.toUpperCase()} ={" "}
														{format.number(
															invoice.convertedAmount.rate,
															{
																style: "decimal",
																minimumFractionDigits: 2,
																maximumFractionDigits: 4,
															},
														)}{" "}
														{invoice.convertedAmount.currency})
													</span>
												)}
											</TableCell>
										)}
										{conversionApplied && !invoice.convertedAmount && (
											<TableCell className="text-sm text-muted-foreground" />
										)}
										<TableCell>
											<InvoiceStatusBadge status={invoice.status ?? ""} />
										</TableCell>
										<TableCell className="text-right">
											{invoice.invoicePdf && (
												<Button variant="ghost" size="sm" asChild>
													<a
														href={invoice.invoicePdf}
														target="_blank"
														rel="noopener noreferrer"
														download
													>
														<DownloadIcon className="size-4 mr-1" />
														{t(
															"settings.billing.invoiceHistory.downloadPdf",
														)}
													</a>
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						{(currentPage > 1 || hasMore) && (
							<div className="p-4 gap-4 flex items-center justify-center">
								<Button
									variant="ghost"
									size="sm"
									disabled={currentPage === 1}
									onClick={handlePrevPage}
								>
									{t("settings.billing.invoiceHistory.previous")}
								</Button>
								<span className="text-sm text-muted-foreground">
									{t("settings.billing.invoiceHistory.page", {
										page: currentPage,
									})}
								</span>
								<Button
									variant="ghost"
									size="sm"
									disabled={!hasMore}
									onClick={handleNextPage}
								>
									{t("settings.billing.invoiceHistory.next")}
								</Button>
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
