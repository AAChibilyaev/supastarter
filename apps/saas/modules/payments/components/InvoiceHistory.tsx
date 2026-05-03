"use client";

import { Button } from "@repo/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { toastError } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, FileTextIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

const PAGE_SIZE = 10;

export function InvoiceHistory({ purchaseId }: { purchaseId: string }) {
	const t = useTranslations();
	const format = useFormatter();
	const [page, setPage] = useState(0);

	const { data: invoices = [], isLoading } = useQuery(
		orpc.payments.listInvoices.queryOptions({
			input: { purchaseId },
		}),
	);

	const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages - 1);
	const pageInvoices = invoices.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

	if (isLoading) {
		return (
			<div className="p-6 text-sm rounded-lg border text-center text-foreground/60">
				{t("settings.billing.invoiceHistory.loading")}
			</div>
		);
	}

	if (invoices.length === 0) {
		return (
			<div className="p-6 rounded-lg border text-center">
				<FileTextIcon className="mb-2 size-8 mx-auto text-foreground/40" />
				<p className="text-sm text-foreground/60">
					{t("settings.billing.invoiceHistory.empty")}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("settings.billing.invoiceHistory.date")}</TableHead>
						<TableHead>{t("settings.billing.invoiceHistory.amount")}</TableHead>
						<TableHead>{t("settings.billing.invoiceHistory.status")}</TableHead>
						<TableHead className="text-right">
							{t("settings.billing.invoiceHistory.actions")}
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{pageInvoices.map((inv) => (
						<TableRow key={inv.id}>
							<TableCell className="whitespace-nowrap">
								{format.dateTime(new Date(inv.periodStart), {
									year: "numeric",
									month: "short",
									day: "numeric",
								})}
							</TableCell>
							<TableCell>
								{format.number(inv.amount / 100, {
									style: "currency",
									currency: inv.currency,
								})}
							</TableCell>
							<TableCell>
								<InvoiceStatusBadge status={inv.status} />
							</TableCell>
							<TableCell className="text-right">
								{inv.pdfUrl ? (
									<Button
										variant="secondary"
										size="sm"
										onClick={() => {
											try {
												window.open(inv.pdfUrl!, "_blank");
											} catch {
												toastError(
													t(
														"settings.billing.invoiceHistory.downloadError",
													),
												);
											}
										}}
									>
										<DownloadIcon className="mr-2 size-4" />
										{t("settings.billing.invoiceHistory.downloadPdf")}
									</Button>
								) : (
									<span className="text-xs text-foreground/40">
										{t("settings.billing.invoiceHistory.notAvailable")}
									</span>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{totalPages > 1 && (
				<div className="flex items-center justify-between">
					<p className="text-xs text-foreground/60">
						{t("settings.billing.invoiceHistory.pageInfo", {
							start: currentPage * PAGE_SIZE + 1,
							end: Math.min((currentPage + 1) * PAGE_SIZE, invoices.length),
							total: invoices.length,
						})}
					</p>
					<div className="gap-2 flex">
						<Button
							variant="secondary"
							size="sm"
							disabled={currentPage === 0}
							onClick={() => setPage((p) => p - 1)}
						>
							{t("settings.billing.invoiceHistory.previous")}
						</Button>
						<Button
							variant="secondary"
							size="sm"
							disabled={currentPage >= totalPages - 1}
							onClick={() => setPage((p) => p + 1)}
						>
							{t("settings.billing.invoiceHistory.next")}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
