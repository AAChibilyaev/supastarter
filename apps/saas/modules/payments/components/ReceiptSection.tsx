"use client";

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

export function ReceiptSection({ organizationId }: { organizationId: string }) {
	const t = useTranslations("settings");
	const format = useFormatter();

	const { data, isLoading } = useQuery(
		orpc.payments.listReceipts.queryOptions({
			input: { organizationId },
		}),
	);

	const receipts = data?.receipts ?? [];

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("billing.invoice.receipts")}</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{isLoading ? (
					<div className="p-6 space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : receipts.length === 0 ? (
					<div className="p-6 text-sm text-center text-muted-foreground">
						{t("billing.invoice.receiptsEmpty")}
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("billing.invoice.receiptDate")}</TableHead>
								<TableHead>{t("billing.invoice.receiptAmount")}</TableHead>
								<TableHead>{t("billing.invoice.receiptCurrency")}</TableHead>
								<TableHead>{t("billing.invoice.receiptStatus")}</TableHead>
								<TableHead className="text-right">
									{t("billing.invoice.receiptActions")}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{receipts.map((receipt) => (
								<TableRow key={receipt.id}>
									<TableCell className="text-sm">
										{format.dateTime(new Date(receipt.createdAt), {
											year: "numeric",
											month: "short",
											day: "numeric",
										})}
									</TableCell>
									<TableCell className="text-sm font-medium">
										{format.number(receipt.amount / 100, {
											style: "currency",
											currency: receipt.currency.toUpperCase(),
										})}
									</TableCell>
									<TableCell className="text-sm uppercase">
										{receipt.currency}
									</TableCell>
									<TableCell className="text-sm">{receipt.status}</TableCell>
									<TableCell className="text-right">
										{receipt.receiptPdf && (
											<Button variant="ghost" size="sm" asChild>
												<a
													href={receipt.receiptPdf}
													target="_blank"
													rel="noopener noreferrer"
													download
												>
													<DownloadIcon className="size-4 mr-1" />
													{t("billing.invoice.downloadReceipt")}
												</a>
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
