"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { useTranslations } from "next-intl";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface CtrTrendDataPoint {
	date: string;
	searches: number;
	clicks: number;
	ctr: number;
}

interface CtrTrendChartProps {
	data: CtrTrendDataPoint[];
}

export function CtrTrendChart({ data }: CtrTrendChartProps) {
	const t = useTranslations();

	const chartData = data.map((d) => ({
		...d,
		ctrPct: Math.round(d.ctr * 1000) / 10,
	}));

	const hasData = chartData.some((d) => d.searches > 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("search.analytics.ctrTrend")}</CardTitle>
			</CardHeader>
			<CardContent>
				{hasData ? (
					<ResponsiveContainer width="100%" height={200}>
						<LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
							<XAxis
								dataKey="date"
								tick={{ fontSize: 11 }}
								tickLine={false}
								axisLine={false}
								className="fill-muted-foreground"
							/>
							<YAxis
								tickFormatter={(v: number) => `${v}%`}
								tick={{ fontSize: 11 }}
								tickLine={false}
								axisLine={false}
								width={36}
								className="fill-muted-foreground"
							/>
							<Tooltip
								formatter={(value: number) => [`${value}%`, t("search.analytics.ctr")]}
								labelClassName="text-xs text-foreground"
								contentStyle={{
									fontSize: 12,
									borderRadius: 6,
									border: "1px solid hsl(var(--border))",
									background: "hsl(var(--popover))",
									color: "hsl(var(--popover-foreground))",
								}}
							/>
							<Line
								type="monotone"
								dataKey="ctrPct"
								stroke="hsl(var(--chart-1))"
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				) : (
					<p className="py-8 text-sm text-center text-muted-foreground">
						{t("search.analytics.noData")}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
