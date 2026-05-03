"use client";

import { Pagination } from "@shared/components/Pagination";
import { orpc } from "@shared/lib/orpc-query-utils";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

const ITEMS_PER_PAGE = 10;

type InvoiceStatus = string | null;

function getStatusBadge(status: InvoiceStatus) {
	if (status === "paid") {
		return "success" as const;
	}
	if (status === "open" || status === "draft") {
		return "warning" as const;
	}
	if (status === "void" || status === "uncollectible") {
		return "error" as const;
	}
	return "info" as const;
}

function getStatusLabel(status: InvoiceStatus, t: ReturnType<typeof useTranslations>) {
	if (status === "paid") {
		return t("settings.billing.invoices.paid");
	}
	if (status === "open" || status === "draft") {
		return t("settings.billing.invoices.pending");
	}
	if (status === "void" || status === "uncollectible") {
		return t("settings.billing.invoices.failed");
	}
	return status ?? "—";
}

export function InvoiceHistory({ organizationId }: { organizationId?: string }) {
	const t = useTranslations();
	const format = useFormatter();
	const [currentPage, setCurrentPage] = useState(1);
	const [cursorStack, setCursorStack] = useState<string[]>([]);

	const startingAfter = cursorStack[cursorStack.length - 1];

	const { data, isLoading } = useQuery(
		orpc.payments.listInvoices.queryOptions({
			input: {
				organizationId,
				limit: ITEMS_PER_PAGE,
				startingAfter,
			},
		}),
	);

	const invoices = data?.invoices ?? [];
	const hasMore = data?.hasMore ?? false;

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

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("settings.billing.invoices.title")}</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{isLoading ? (
					<div className="p-6 space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : invoices.length === 0 ? (
					<div className="p-6 text-center text-sm text-muted-foreground">
						{t("settings.billing.invoices.emptyState")}
					</div>
				) : (
					<>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Amount</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
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
											{format.number(invoice.amountPaid / 100, {
												style: "currency",
												currency: invoice.currency.toUpperCase(),
											})}
										</TableCell>
										<TableCell>
											<Badge status={getStatusBadge(invoice.status)}>
												{getStatusLabel(invoice.status, t)}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											{invoice.invoicePdf && (
												<Button
													variant="ghost"
													size="sm"
													asChild
												>
													<a
														href={invoice.invoicePdf}
														target="_blank"
														rel="noopener noreferrer"
														download
													>
														<DownloadIcon className="size-4 mr-1" />
														{t("settings.billing.invoices.downloadPdf")}
													</a>
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						{(currentPage > 1 || hasMore) && (
							<div className="p-4 flex items-center justify-center gap-4">
								<Button
									variant="ghost"
									size="sm"
									disabled={currentPage === 1}
									onClick={handlePrevPage}
								>
									Previous
								</Button>
								<span className="text-sm text-muted-foreground">
									Page {currentPage}
								</span>
								<Button
									variant="ghost"
									size="sm"
									disabled={!hasMore}
									onClick={handleNextPage}
								>
									Next
								</Button>
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
