"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useTranslations } from "next-intl";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ── Types ───────────────────────────────────────────────────────

interface IndexHealthDataPoint {
	date: string;
	documents: number;
	searches: number;
}

interface IndexHealthChartProps {
	data: IndexHealthDataPoint[];
	isLoading?: boolean;
}

// ── Main component ───────────────────────────────────────────────

export function IndexHealthChart({ data, isLoading }: IndexHealthChartProps) {
	const t = useTranslations("indexing.dashboard");

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("indexHealth")}</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-64 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (data.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("indexHealth")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-64 text-sm flex items-center justify-center text-muted-foreground">
						{t("noData")}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="gap-2 text-base flex items-center">
					{t("indexHealth")}
					<span className="font-normal text-xs text-muted-foreground">{t("last7Days")}</span>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div style={{ width: "100%", height: 300 }}>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
							<XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
							<YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
							<Tooltip />
							<Bar
								dataKey="documents"
								name={t("documents")}
								fill="var(--color-primary, hsl(var(--primary)))"
								radius={[4, 4, 0, 0]}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}
