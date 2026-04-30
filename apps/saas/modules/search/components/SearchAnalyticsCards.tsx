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
import { StatsTile } from "@shared/components/StatsTile";
import { StatsTileChart } from "@shared/components/StatsTileChart";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useFormatter } from "next-intl";

interface SearchAnalyticsCardsProps {
	organizationId: string;
}

export function SearchAnalyticsCards({ organizationId }: SearchAnalyticsCardsProps) {
	const t = useTranslations();
	const format = useFormatter();

	const { data, isLoading } = useQuery(
		orpc.search.analytics.queryOptions({
			input: { organizationId, period: "last30" },
			enabled: !!organizationId,
		}),
	);

	if (isLoading) {
		return <div className="py-8 text-center text-foreground/60">{t("search.loading")}</div>;
	}

	if (!data) {
		return null;
	}

	const chartData = data.searchesOverTime.map((d) => ({
		month: d.date,
		searches: d.count,
	}));

	return (
		<div className="space-y-6">
			{/* Summary tiles */}
			<div className="gap-4 sm:grid-cols-2 lg:grid-cols-4 grid">
				<StatsTile
					title={t("search.analytics.totalSearches")}
					value={data.totalSearches}
					valueFormat="number"
				/>
				<StatsTile
					title={t("search.analytics.totalSessions")}
					value={data.totalSessions}
					valueFormat="number"
				/>
				<StatsTile
					title={t("search.analytics.ctr")}
					value={data.ctr}
					valueFormat="percentage"
				/>
				<StatsTile
					title={t("search.analytics.zeroResults")}
					value={data.zeroResultQueries.length > 0 ? data.zeroResultQueries[0].count : 0}
					valueFormat="number"
				/>
			</div>

			{/* Searches over time chart */}
			{chartData.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>{t("search.analytics.searchesOverTime")}</CardTitle>
					</CardHeader>
					<CardContent>
						<StatsTileChart
							data={chartData}
							dataKey="searches"
							gradientId="searchGradient"
							chartConfig={{
								searches: {
									label: t("search.analytics.totalSearches"),
									color: "hsl(var(--chart-1))",
								},
							}}
							tooltipFormatter={(value) => format.number(Number(value))}
						/>
					</CardContent>
				</Card>
			)}

			{/* Top queries table */}
			<Card>
				<CardHeader>
					<CardTitle>{t("search.analytics.topQueries")}</CardTitle>
				</CardHeader>
				<CardContent>
					{data.topQueries.length === 0 ? (
						<p className="text-center text-foreground/60">
							{t("search.analytics.noData")}
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("search.analytics.queryColumn")}</TableHead>
									<TableHead className="text-right">
										{t("search.analytics.countColumn")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.topQueries.map((row) => (
									<TableRow key={row.query}>
										<TableCell className="font-mono">{row.query}</TableCell>
										<TableCell className="text-right">
											{format.number(row.count)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Top clicked products table */}
			<Card>
				<CardHeader>
					<CardTitle>{t("search.analytics.topClickedProducts")}</CardTitle>
				</CardHeader>
				<CardContent>
					{data.topClickedProducts.length === 0 ? (
						<p className="text-center text-foreground/60">
							{t("search.analytics.noData")}
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("search.analytics.productColumn")}</TableHead>
									<TableHead className="text-right">
										{t("search.analytics.clicksColumn")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.topClickedProducts.map((row) => (
									<TableRow key={row.productId}>
										<TableCell>{row.title}</TableCell>
										<TableCell className="text-right">
											{format.number(row.clicks)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
