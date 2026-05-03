"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@repo/ui/components/chart";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

function KpiCard({
	title,
	value,
	prefix = "",
	isLoading,
}: {
	title: string;
	value: string | number | undefined;
	prefix?: string;
	isLoading: boolean;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-8 w-24" />
				) : (
					<p className="font-semibold text-3xl tabular-nums">
						{prefix}
						{typeof value === "number"
							? value.toLocaleString(undefined, {
									maximumFractionDigits: 0,
								})
							: (value ?? "—")}
					</p>
				)}
			</CardContent>
		</Card>
	);
}

export function BillingAnalyticsSection() {
	const t = useTranslations("admin.billingAnalytics");
	const { data, isLoading } = useQuery(
		orpc.payments.billingAnalytics.queryOptions({
			input: {},
		}),
	);

	const chartConfig = {
		revenue: {
			label: t("revenue"),
			color: "hsl(var(--chart-1))",
		},
	} satisfies ChartConfig;

	return (
		<div className="gap-6 grid grid-cols-1">
			{/* KPI cards */}
			<div className="gap-4 md:grid-cols-3 grid grid-cols-1">
				<KpiCard
					title={t("mrr")}
					value={data?.currentMrr}
					prefix="$"
					isLoading={isLoading}
				/>
				<KpiCard
					title={t("activeSubscriptions")}
					value={data?.activeSubscriptions}
					isLoading={isLoading}
				/>
				<KpiCard
					title={t("churnRate")}
					value={data ? `${data.churnRateLastMonth}%` : undefined}
					isLoading={isLoading}
				/>
			</div>

			{/* Revenue chart */}
			<Card>
				<CardHeader>
					<CardTitle>{t("revenueChart")}</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<Skeleton className="h-64 w-full" />
					) : (
						<div className="h-64">
							<ChartContainer config={chartConfig}>
								<AreaChart
									data={data?.revenueByMonth ?? []}
									margin={{
										top: 10,
										right: 10,
										left: 0,
										bottom: 0,
									}}
								>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis
										dataKey="month"
										tickLine={false}
										axisLine={false}
										tickMargin={8}
									/>
									<YAxis
										tickLine={false}
										axisLine={false}
										tickMargin={8}
										tickFormatter={(value: number) => `$${value}`}
									/>
									<ChartTooltip
										cursor={false}
										content={<ChartTooltipContent />}
									/>
									<Area
										type="monotone"
										dataKey="revenue"
										stroke="var(--color-revenue)"
										fill="var(--color-revenue)"
										fillOpacity={0.15}
									/>
								</AreaChart>
							</ChartContainer>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Subscriptions by plan table */}
			<Card>
				<CardHeader>
					<CardTitle>{t("subscriptionsByPlan")}</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<Skeleton className="h-32 w-full" />
					) : (
						<div className="overflow-x-auto">
							<table className="text-sm w-full">
								<thead>
									<tr className="border-b text-left text-muted-foreground">
										<th className="pb-2 font-medium">{t("plan")}</th>
										<th className="pb-2 font-medium text-right">
											{t("subscribers")}
										</th>
										<th className="pb-2 font-medium text-right">
											{t("mrrPerPlan")}
										</th>
									</tr>
								</thead>
								<tbody>
									{(data?.subscriptionsByPlan ?? []).map((plan) => (
										<tr key={plan.planId} className="border-b last:border-b-0">
											<td className="py-2 capitalize">{plan.planId}</td>
											<td className="py-2 text-right tabular-nums">
												{plan.count}
											</td>
											<td className="py-2 font-mono text-right tabular-nums">
												$
												{plan.mrr.toLocaleString(undefined, {
													maximumFractionDigits: 2,
												})}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
