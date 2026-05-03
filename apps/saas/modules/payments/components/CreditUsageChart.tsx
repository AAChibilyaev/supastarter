"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@repo/ui/components/chart";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { useCreditUsageStats } from "../hooks/ai-wallet";
import { formatKopecks } from "../lib/format-kopecks";

interface CreditUsageChartProps {
	organizationId?: string;
}

type Period = "daily" | "weekly" | "monthly";

export function CreditUsageChart({ organizationId }: CreditUsageChartProps) {
	const t = useTranslations("settings.billing.aiCredits.chart");
	const tSettings = useTranslations("settings.billing");
	const [period, setPeriod] = useState<Period>("daily");

	const { data, isLoading } = useCreditUsageStats(organizationId ?? "", period);
	const hasData = data && data.buckets.length > 0;

	const displayData = (data?.buckets ?? []).map((b) => ({
		periodStart: new Date(b.periodStart).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		}),
		totalKopecks: Number(b.totalKopecks) / 100,
		events: b.events,
	}));

	const chartConfig = {
		totalKopecks: {
			label: t("kopecks"),
			color: "hsl(var(--chart-1))",
		},
	} satisfies ChartConfig;

	const periods: Period[] = ["daily", "weekly", "monthly"];

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>{t("title")}</CardTitle>
				<div className="gap-1 p-1 flex rounded-lg bg-muted">
					{periods.map((p) => (
						<button
							key={p}
							type="button"
							onClick={() => setPeriod(p)}
							className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
								period === p
									? "shadow-sm bg-background text-foreground"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{t(p)}
						</button>
					))}
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-64 w-full" />
				) : !hasData ? (
					<p className="py-12 text-sm text-center text-muted-foreground">
						{tSettings("invoiceHistory.emptyState")}
					</p>
				) : (
					<div className="h-64">
						<ChartContainer config={chartConfig}>
							<AreaChart
								data={displayData}
								margin={{
									top: 10,
									right: 10,
									left: 0,
									bottom: 0,
								}}
							>
								<CartesianGrid strokeDasharray="3 3" vertical={false} />
								<XAxis
									dataKey="periodStart"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									fontSize={12}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									fontSize={12}
									tickFormatter={(value: number) =>
										formatKopecks(String(value * 100), { locale: "en-US" })
									}
								/>
								<ChartTooltip
									cursor={false}
									content={
										<ChartTooltipContent
											formatter={(value: number) =>
												formatKopecks(String(value * 100))
											}
										/>
									}
								/>
								<Area
									type="monotone"
									dataKey="totalKopecks"
									stroke="var(--color-totalKopecks)"
									fill="var(--color-totalKopecks)"
									fillOpacity={0.15}
								/>
							</AreaChart>
						</ChartContainer>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
