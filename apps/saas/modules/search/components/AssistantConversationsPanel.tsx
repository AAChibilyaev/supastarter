"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareIcon, TrendingUpIcon, AlertTriangleIcon, BarChart3Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

interface Props {
	organizationId: string;
}

function StatCard({
	icon: Icon,
	label,
	value,
	format = "number",
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: number;
	format?: "number" | "percent" | "decimal";
}) {
	const display =
		format === "percent"
			? `${(value * 100).toFixed(1)}%`
			: format === "decimal"
				? value.toFixed(1)
				: value.toString();

	return (
		<Card>
			<CardContent className="p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm text-muted-foreground">{label}</p>
						<p className="mt-1 text-2xl font-semibold">{display}</p>
					</div>
					<div className="rounded-full bg-primary/10 p-3">
						<Icon className="size-5 text-primary" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export function AssistantConversationsPanel({ organizationId }: Props) {
	const t = useTranslations("search.assistant.analytics");

	const now = useMemo(() => new Date(), []);
	const from = useMemo(() => {
		const d = new Date(now);
		d.setDate(d.getDate() - 30);
		return d;
	}, [now]);

	const { data, isLoading } = useQuery(
		orpc.assistant.analytics.queryOptions({
			input: {
				organizationId,
				from: from.toISOString(),
				to: now.toISOString(),
			},
		}),
	);

	if (isLoading) {
		return (
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<Card key={i}>
						<CardContent className="p-6">
							<div className="h-16 animate-pulse rounded bg-muted" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (!data || data.totalConversations === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-16 text-center">
					<MessageSquareIcon className="mb-4 size-12 text-muted-foreground/40" />
					<p className="font-medium">{t("empty")}</p>
					<p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("emptyDescription")}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					icon={MessageSquareIcon}
					label={t("totalConversations")}
					value={data.totalConversations}
				/>
				<StatCard
					icon={TrendingUpIcon}
					label={t("resolutionRate")}
					value={data.resolutionRate}
					format="percent"
				/>
				<StatCard
					icon={AlertTriangleIcon}
					label={t("escalationRate")}
					value={data.escalationRate}
					format="percent"
				/>
				<StatCard
					icon={BarChart3Icon}
					label={t("avgTurns")}
					value={data.avgTurnsToResolution}
					format="decimal"
				/>
			</div>

			{Object.keys(data.modeDistribution).length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>{t("modeDistribution")}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{Object.entries(data.modeDistribution)
								.sort(([, a], [, b]) => b - a)
								.map(([mode, count]) => {
									const pct = data.totalConversations > 0
										? Math.round((count / data.totalConversations) * 100)
										: 0;
									return (
										<div key={mode} className="space-y-1">
											<div className="flex justify-between text-sm">
												<span className="capitalize text-muted-foreground">
													{mode.replace(/_/g, " ")}
												</span>
												<span className="font-medium">{pct}%</span>
											</div>
											<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
												<div
													className="h-full rounded-full bg-primary transition-all"
													style={{ width: `${pct}%` }}
												/>
											</div>
										</div>
									);
								})}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
