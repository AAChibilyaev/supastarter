"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { useTranslations } from "next-intl";
import { useFormatter } from "next-intl";
import { useMemo } from "react";

import { EmptyState } from "./EmptyState";

interface FailedQuery {
	query: string;
	count: number;
}

interface FailedQueriesTableProps {
	zeroResultQueries: FailedQuery[];
	totalSearches: number;
}

/**
 * Card showing search queries that returned zero results.
 * Helps users identify content gaps and relevancy issues.
 */
export function FailedQueriesTable({ zeroResultQueries, totalSearches }: FailedQueriesTableProps) {
	const t = useTranslations();
	const format = useFormatter();

	const hasData = Array.isArray(zeroResultQueries) && zeroResultQueries.length > 0;
	const totalFailed = useMemo(
		() => zeroResultQueries.reduce((sum, q) => sum + q.count, 0),
		[zeroResultQueries],
	);
	const failedRate = totalSearches > 0 ? ((totalFailed / totalSearches) * 100).toFixed(1) : "0.0";

	// Sort by count descending
	const sorted = useMemo(
		() => [...zeroResultQueries].sort((a, b) => b.count - a.count),
		[zeroResultQueries],
	);

	const totalCount = sorted.reduce((sum, q) => sum + q.count, 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>{t("search.analytics.failedQueries")}</span>
					{hasData && (
						<span className="text-sm font-normal text-muted-foreground">
							{failedRate}% {t("search.analytics.ofTotalSearches")} &middot;{" "}
							{format.number(totalFailed)} {t("search.analytics.totalFailedQueries")}
						</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{hasData ? (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12">{t("search.analytics.rankColumn")}</TableHead>
								<TableHead>{t("search.analytics.queryColumn")}</TableHead>
								<TableHead className="text-right">{t("search.analytics.countColumn")}</TableHead>
								<TableHead className="text-right">{t("search.analytics.percentColumn")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sorted.map((row, index) => {
								const percent =
									totalCount > 0 ? ((row.count / totalCount) * 100).toFixed(1) : "0.0";
								return (
									<TableRow key={row.query}>
										<TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
										<TableCell className="font-mono text-sm">{row.query}</TableCell>
										<TableCell className="text-right tabular-nums">
											{format.number(row.count)}
										</TableCell>
										<TableCell className="text-xs text-right text-muted-foreground tabular-nums">
											{percent}%
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				) : (
					<EmptyState variant="inline" description={t("search.analytics.noFailedQueries")} />
				)}
			</CardContent>
		</Card>
	);
}
