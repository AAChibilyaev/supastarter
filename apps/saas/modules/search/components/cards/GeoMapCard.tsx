"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { GlobeIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "./EmptyState";

interface GeoRegionData {
	region: string;
	searches: number;
	percentage: number;
}

interface GeoMapCardProps {
	data: GeoRegionData[];
}

const REGION_COLORS: Record<string, string> = {
	"North America": "#60a5fa",
	Europe: "#a78bfa",
	Asia: "#f472b6",
	"South America": "#34d399",
	Africa: "#fbbf24",
	Oceania: "#f97316",
};

function MapMarkers({ data, className }: { data: GeoRegionData[]; className?: string }) {
	const maxSearches = Math.max(...data.map((d) => d.searches));

	// Marker positions for each region (x, y on the 200x120 viewBox)
	const regionCentroids: Record<string, { x: number; y: number }> = {
		"North America": { x: 35, y: 25 },
		Europe: { x: 85, y: 22 },
		Asia: { x: 115, y: 25 },
		"South America": { x: 42, y: 68 },
		Africa: { x: 85, y: 55 },
		Oceania: { x: 160, y: 75 },
	};

	const maxRadius = 8;
	const minRadius = 3;

	return (
		<svg
			viewBox="0 0 200 120"
			className={className}
			fill="none"
			aria-hidden="true"
		>
			<WorldMapInner />
			{data.map((region) => {
				const centroid = regionCentroids[region.region];
				if (!centroid) return null;
				const radius =
					minRadius +
					(maxRadius - minRadius) * (region.searches / Math.max(maxSearches, 1));
				const color = REGION_COLORS[region.region] ?? "hsl(var(--primary))";

				return (
					<g key={region.region}>
						{/* Glow effect */}
						<circle
							cx={centroid.x}
							cy={centroid.y}
							r={radius * 2.5}
							fill={color}
							opacity={0.12}
						/>
						{/* Main dot */}
						<circle
							cx={centroid.x}
							cy={centroid.y}
							r={radius}
							fill={color}
							opacity={0.85}
						/>
						{/* Inner highlight */}
						<circle
							cx={centroid.x - radius * 0.25}
							cy={centroid.y - radius * 0.25}
							r={radius * 0.35}
							fill="white"
							opacity={0.3}
						/>
					</g>
				);
			})}
		</svg>
	);
}

function WorldMapInner() {
	return (
		<g
			className="text-muted-foreground/20"
			fill="currentColor"
			stroke="currentColor"
			strokeWidth="0.5"
		>
			<path d="M20 15 L45 10 L55 18 L52 30 L48 35 L38 38 L28 42 L22 38 L15 30 L12 22 Z" />
			<path d="M35 55 L42 50 L48 55 L50 65 L47 78 L42 85 L38 80 L35 72 L33 62 Z" />
			<path d="M75 20 L82 15 L90 18 L95 22 L92 28 L85 32 L78 30 L74 26 Z" />
			<path d="M78 42 L85 38 L92 42 L94 52 L91 62 L86 68 L80 65 L76 58 L74 50 Z" />
			<path d="M95 15 L105 10 L118 12 L128 18 L132 25 L128 35 L120 38 L110 36 L100 34 L95 28 L92 22 Z" />
			<path d="M150 70 L158 65 L168 68 L172 75 L168 82 L158 84 L150 80 Z" />
		</g>
	);
}

export function GeoMapCard({ data }: GeoMapCardProps) {
	const t = useTranslations();

	const hasData = data && data.length > 0;
	const totalSearches = hasData ? data.reduce((sum, d) => sum + d.searches, 0) : 0;

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between">
				<div className="gap-2 flex items-center">
					<GlobeIcon className="size-4 text-muted-foreground" strokeWidth={1.5} />
					<CardTitle className="text-base">{t("search.analytics.geoTitle")}</CardTitle>
				</div>
				{hasData && (
					<Badge variant="outline" className="text-xs tabular-nums">
						{totalSearches} {t("search.analytics.totalSearches").toLowerCase()}
					</Badge>
				)}
			</CardHeader>
			<CardContent>
				{hasData ? (
					<div className="space-y-4">
						{/* World map visualization */}
						<div className="h-48 relative w-full overflow-hidden rounded-lg border bg-gradient-to-b from-transparent via-background to-background">
							<MapMarkers data={data} className="h-full w-full" />
						</div>

						{/* Region breakdown table */}
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("search.analytics.regionColumn")}</TableHead>
									<TableHead className="text-right">
										{t("search.analytics.searchesColumn")}
									</TableHead>
									<TableHead className="text-right">
										{t("search.analytics.shareColumn")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data
									.sort((a, b) => b.searches - a.searches)
									.map((region) => {
										const color =
											REGION_COLORS[region.region] ??
											"hsl(var(--muted-foreground))";
										return (
											<TableRow key={region.region}>
												<TableCell>
													<div className="gap-2 flex items-center">
														<span
															className="size-2.5 inline-block rounded-full"
															style={{
																backgroundColor: color,
															}}
														/>
														<span className="text-sm">
															{region.region}
														</span>
													</div>
												</TableCell>
												<TableCell className="text-right tabular-nums">
													{region.searches.toLocaleString()}
												</TableCell>
												<TableCell className="text-right text-muted-foreground tabular-nums">
													{region.percentage.toFixed(1)}%
												</TableCell>
											</TableRow>
										);
									})}
							</TableBody>
						</Table>
					</div>
				) : (
					<EmptyState
						title={t("search.analytics.geoNoData")}
						description={t("search.analytics.geoNoDataDescription")}
						icon={GlobeIcon}
					/>
				)}
			</CardContent>
		</Card>
	);
}
