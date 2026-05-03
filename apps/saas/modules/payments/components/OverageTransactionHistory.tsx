"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Badge } from "@repo/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";

import { useAiWalletTransactions } from "../hooks/ai-wallet";
import { formatKopecks } from "../lib/format-kopecks";

function getVariant(type: string): "success" | "warning" | "info" | "error" {
	switch (type) {
		case "topup":
		case "credit":
			return "success";
		case "usage_charge":
		case "debit":
			return "info";
		case "reservation":
			return "warning";
		case "reservation_release":
			return "success";
		default:
			return "info";
	}
}

export function OverageTransactionHistory() {
	const t = useTranslations("settings.billing");
	const locale = useLocale();
	const { activeOrganization } = useActiveOrganization();
	const orgId = activeOrganization?.id;

	const { data: transactions, isLoading } = useAiWalletTransactions(orgId);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("transactionHistory.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
				</CardContent>
			</Card>
		);
	}

	if (!transactions || transactions.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("transactionHistory.title")}</CardTitle>
					<CardDescription>{t("transactionHistory.empty")}</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("transactionHistory.title")}</CardTitle>
				<CardDescription>{t("transactionHistory.description")}</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("transactionHistory.date")}</TableHead>
							<TableHead>{t("transactionHistory.type")}</TableHead>
							<TableHead>{t("transactionHistory.source")}</TableHead>
							<TableHead className="text-right">
								{t("transactionHistory.amount")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{transactions.map((tx) => (
							<TableRow key={tx.id}>
								<TableCell className="text-sm text-muted-foreground">
									{format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}
								</TableCell>
								<TableCell>
									<Badge
										status={getVariant(tx.type)}
										className="text-xs capitalize"
									>
										{tx.type.replace(/_/g, " ")}
									</Badge>
								</TableCell>
								<TableCell className="text-sm text-muted-foreground capitalize">
									{tx.source.replace(/_/g, " ")}
								</TableCell>
								<TableCell
									className={`font-medium text-right tabular-nums ${
										tx.direction === "credit"
											? "text-success"
											: tx.direction === "debit"
												? "text-destructive"
												: ""
									}`}
								>
									{tx.direction === "credit"
										? "+"
										: tx.direction === "debit"
											? "−"
											: ""}
									{formatKopecks(tx.amountKopecks, { appLocale: locale })}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
