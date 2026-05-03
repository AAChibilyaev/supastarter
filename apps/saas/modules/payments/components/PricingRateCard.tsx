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

import { usePricingRules } from "../hooks/ai-wallet";
import { formatKopecks } from "../lib/format-kopecks";

export function PricingRateCard() {
	const t = useTranslations("settings.billing.aiCredits.rateCard");
	const locale = useLocale();
	const { data: rules, isLoading } = usePricingRules();

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
				) : !rules || rules.length === 0 ? (
					<p className="px-6 pb-6 text-sm text-muted-foreground">{t("empty")}</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("operation")}</TableHead>
								<TableHead>{t("provider")}</TableHead>
								<TableHead>{t("model")}</TableHead>
								<TableHead className="text-right">{t("inputPer1M")}</TableHead>
								<TableHead className="text-right">{t("outputPer1M")}</TableHead>
								<TableHead className="text-right">{t("embeddingPer1M")}</TableHead>
								<TableHead className="text-right">{t("flatFee")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rules.map((rule) => (
								<TableRow key={rule.id}>
									<TableCell className="font-medium capitalize">
										{rule.operation.replace(/_/g, " ")}
									</TableCell>
									<TableCell>{rule.provider}</TableCell>
									<TableCell className="max-w-40 font-mono text-xs truncate">
										{rule.model}
									</TableCell>
									<TableCell className="text-xs text-right tabular-nums">
										{fmt(rule.inputPer1MTokensKopecks)}
									</TableCell>
									<TableCell className="text-xs text-right tabular-nums">
										{fmt(rule.outputPer1MTokensKopecks)}
									</TableCell>
									<TableCell className="text-xs text-right tabular-nums">
										{fmt(rule.embeddingPer1MTokensKopecks)}
									</TableCell>
									<TableCell className="text-xs text-right tabular-nums">
										{BigInt(rule.flatFeeKopecks) > 0n
											? fmt(rule.flatFeeKopecks)
											: "—"}
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
