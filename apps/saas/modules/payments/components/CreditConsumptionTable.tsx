"use client";

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
import { useLocale, useTranslations } from "next-intl";

import { useAiUsageEvents } from "../hooks/ai-wallet";
import { formatKopecks } from "../lib/format-kopecks";

interface CreditConsumptionTableProps {
	organizationId?: string;
}

export function CreditConsumptionTable({ organizationId }: CreditConsumptionTableProps) {
	const t = useTranslations("settings.billing.aiCredits.consumption");
	const locale = useLocale();
	const { data: events, isLoading } = useAiUsageEvents({
		organizationId,
		limit: 20,
	});

	const fmt = (amount: bigint | number | string) => formatKopecks(amount, { appLocale: locale });

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("title")}</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{isLoading ? (
					<div className="space-y-2 p-6">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
						<Skeleton className="h-4 w-4/6" />
					</div>
				) : !events || events.length === 0 ? (
					<p className="px-6 pb-6 text-sm text-muted-foreground">{t("empty")}</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("date")}</TableHead>
								<TableHead>{t("operation")}</TableHead>
								<TableHead>{t("provider")}</TableHead>
								<TableHead>{t("model")}</TableHead>
								<TableHead className="text-right">{t("tokens")}</TableHead>
								<TableHead className="text-right">{t("charge")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{events.map((event) => (
								<TableRow key={event.id}>
									<TableCell className="text-xs text-muted-foreground tabular-nums">
										{new Date(event.createdAt).toLocaleDateString(locale, {
											month: "short",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</TableCell>
									<TableCell className="font-medium capitalize">
										{event.operation.replace(/_/g, " ")}
									</TableCell>
									<TableCell>{event.provider}</TableCell>
									<TableCell className="max-w-40 font-mono text-xs truncate">
										{event.model}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{event.totalTokens.toLocaleString()}
									</TableCell>
									<TableCell className="font-medium text-right tabular-nums">
										{fmt(event.totalChargeKopecks)}
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
