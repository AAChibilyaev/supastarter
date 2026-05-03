import { MetricTile } from "../components/MetricTile";
import { MiniBarChart } from "../components/MiniBarChart";
import { VisualFrame } from "../components/VisualFrame";

const SEARCH_VOLUME = [
	{ label: "Mon", value: 14200 },
	{ label: "Tue", value: 18700 },
	{ label: "Wed", value: 16400 },
	{ label: "Thu", value: 21000 },
	{ label: "Fri", value: 19300 },
	{ label: "Sat", value: 11800 },
	{ label: "Sun", value: 17200 },
];

const TOP_QUERIES = [
	{ query: "nike air max 270", searches: 4812, ctr: "38%", up: true },
	{ query: "wireless headphones", searches: 3540, ctr: "29%", up: true },
	{ query: "macbook pro m3", searches: 2910, ctr: "22%", up: false },
	{ query: "standing desk", searches: 2280, ctr: "31%", up: true },
	{ query: "coffee maker", searches: 1760, ctr: "18%", up: false },
] as const;

export function AnalyticsDashboardVisual() {
	return (
		<VisualFrame className="p-5 md:p-6">
			{/* Header */}
			<div className="mb-5 flex items-center justify-between">
				<div>
					<p className="font-medium tracking-widest text-[11px] text-muted-foreground uppercase">
						Search Analytics
					</p>
					<p className="mt-0.5 text-sm text-foreground">Last 7 days</p>
				</div>
				<div className="gap-1.5 px-3 py-1 flex items-center rounded-full border border-border bg-muted">
					<span className="size-1.5 animate-pulse rounded-full bg-primary" />
					<span className="text-xs text-muted-foreground">Live</span>
				</div>
			</div>

			{/* Metric tiles */}
			<div className="gap-3 sm:grid-cols-4 grid grid-cols-2">
				<MetricTile label="Total searches" value="128.4K" delta="+18.2%" trend="up" />
				<MetricTile label="Zero results" value="3.2K" delta="-6.4%" trend="down" />
				<MetricTile label="CTR rank #1" value="24.6%" delta="+7.1%" trend="up" />
				<MetricTile label="Conversions" value="8.7%" delta="+3.3%" trend="up" />
			</div>

			{/* Chart + table */}
			<div className="mt-5 gap-4 md:grid-cols-[1fr_280px] grid">
				{/* Bar chart */}
				<div className="p-4 rounded-lg border border-border bg-muted/30">
					<p className="mb-3 font-medium tracking-wide text-[11px] text-muted-foreground uppercase">
						Search volume
					</p>
					<div className="text-primary">
						<MiniBarChart data={SEARCH_VOLUME} height={72} />
					</div>
					<div className="mt-2 flex justify-between">
						{SEARCH_VOLUME.map((d) => (
							<span key={d.label} className="text-[10px] text-muted-foreground">
								{d.label}
							</span>
						))}
					</div>
				</div>

				{/* Top queries */}
				<div className="p-4 rounded-lg border border-border bg-muted/30">
					<p className="mb-3 font-medium tracking-wide text-[11px] text-muted-foreground uppercase">
						Top queries
					</p>
					<div className="space-y-2.5">
						{TOP_QUERIES.map((q) => (
							<div key={q.query} className="gap-2 flex items-center justify-between">
								<p className="min-w-0 text-xs truncate text-foreground">
									{q.query}
								</p>
								<div className="gap-2 flex shrink-0 items-center">
									<span className="text-[10px] text-muted-foreground tabular-nums">
										{q.searches.toLocaleString()}
									</span>
									<span
										className={
											q.up
												? "text-[10px] text-primary"
												: "text-[10px] text-muted-foreground"
										}
									>
										{q.up ? "↑" : "↓"} {q.ctr}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</VisualFrame>
	);
}
