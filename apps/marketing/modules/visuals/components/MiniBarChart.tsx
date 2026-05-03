interface BarData {
	label: string;
	value: number;
}

interface MiniBarChartProps {
	data: BarData[];
	height?: number;
	highlightLast?: boolean;
}

export function MiniBarChart({ data, height = 80, highlightLast = true }: MiniBarChartProps) {
	const max = Math.max(...data.map((d) => d.value));
	const barWidth = 100 / (data.length * 2 - 1);

	return (
		<svg
			viewBox={`0 0 100 ${height}`}
			preserveAspectRatio="none"
			className="w-full"
			style={{ height }}
			aria-hidden="true"
		>
			{data.map((d, i) => {
				const barH = (d.value / max) * (height - 8);
				const x = i * (barWidth * 2);
				const isLast = i === data.length - 1;
				const opacity = highlightLast && isLast ? "1" : "0.35";

				return (
					<rect
						key={d.label}
						x={`${x}%`}
						y={height - barH}
						width={`${barWidth}%`}
						height={barH}
						rx="3"
						fill="currentColor"
						opacity={opacity}
					/>
				);
			})}
		</svg>
	);
}
