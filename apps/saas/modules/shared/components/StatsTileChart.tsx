"use client";

import { cn } from "@repo/ui";
import type { ChartConfig } from "@repo/ui/components/chart";
import { useMemo } from "react";

interface StatsTileChartProps {
	data: Array<{ month: string; [key: string]: string | number }>;
	dataKey: string;
	chartConfig: ChartConfig;
	gradientId: string;
	tooltipFormatter: (value: number | string) => React.ReactNode;
	className?: string;
}

export function StatsTileChart({
	data,
	dataKey,
	chartConfig,
	gradientId,
	tooltipFormatter: _tooltipFormatter,
	className,
}: StatsTileChartProps) {
	const chartColor = chartConfig[dataKey]?.color ?? "hsl(var(--primary))";

	const spark = useMemo(() => {
		const numericValues = data
			.map((point) => {
				const value = point[dataKey];
				return typeof value === "number" ? value : Number(value);
			})
			.filter((value) => Number.isFinite(value));

		if (numericValues.length === 0) {
			return null;
		}

		const max = Math.max(...numericValues);
		const min = Math.min(...numericValues);
		const range = Math.max(max - min, 1);
		const step = numericValues.length > 1 ? 100 / (numericValues.length - 1) : 100;

		const points = numericValues.map((value, index) => {
			const x = numericValues.length === 1 ? 50 : index * step;
			const y = 100 - ((value - min) / range) * 72 - 14;
			return {
				x,
				y,
				value,
			};
		});

		const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
		const area = `M ${points[0]?.x ?? 0} 100 L ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${points.at(-1)?.x ?? 100} 100 Z`;

		return {
			area,
			polyline,
			startValue: points[0]?.value ?? 0,
			endValue: points.at(-1)?.value ?? 0,
		};
	}, [data, dataKey]);

	if (!spark) {
		return <div className={cn("h-32 w-full rounded-md bg-muted/20", className)} />;
	}

	return (
		<div className={cn("h-32 w-full min-w-0", className)}>
			<svg
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				className="h-full w-full overflow-visible"
				role="img"
				aria-label={`${dataKey} sparkline`}
			>
				<defs>
					<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={chartColor} stopOpacity="0.3" />
						<stop offset="100%" stopColor={chartColor} stopOpacity="0.03" />
					</linearGradient>
				</defs>
				<line x1="0" y1="100" x2="100" y2="100" className="stroke-border" strokeWidth="1" />
				<path d={spark.area} fill={`url(#${gradientId})`} />
				<polyline
					fill="none"
					points={spark.polyline}
					stroke={chartColor}
					strokeWidth="2.5"
					strokeLinejoin="round"
					strokeLinecap="round"
				/>
			</svg>
			<div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
				<span>{spark.startValue}</span>
				<span>{spark.endValue}</span>
			</div>
		</div>
	);
}
