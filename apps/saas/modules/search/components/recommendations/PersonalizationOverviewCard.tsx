"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { StatsTile } from "@shared/components/StatsTile";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	SearchIcon,
	MousePointerClickIcon,
	UsersIcon,
	BarChart3Icon,
	SparklesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "../cards/EmptyState";

interface PersonalizationOverviewCardProps {
	organizationId: string;
}

export function PersonalizationOverviewCard({ organizationId }: PersonalizationOverviewCardProps) {
	const tr = useTranslations("search");

	const { data, isLoading } = useQuery(
		orpc.recommendations.personalizationOverview.queryOptions({
			input: { organizationId, window: 7 },
		}),
	);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="gap-2 text-base flex items-center">
						<SparklesIcon className="size-4 text-primary" />
						{tr("recommendations.overview.title")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="space-y-2">
								<div className="h-4 w-20 animate-pulse rounded bg-muted" />
								<div className="h-8 w-16 animate-pulse rounded bg-muted" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!data) {
		return (
			<Card>
				<CardContent className="pt-6">
					<EmptyState
						variant="inline"
						icon={<BarChart3Icon className="size-8" />}
						title={tr("recommendations.overview.noDataTitle")}
						description={tr("recommendations.overview.noDataDescription")}
					/>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between">
				<CardTitle className="gap-2 text-base flex items-center">
					<SparklesIcon className="size-4 text-primary" />
					{tr("recommendations.overview.title")}
				</CardTitle>
				<Badge status={data.personalizationEnabled ? "success" : "info"}>
					{data.personalizationEnabled
						? tr("recommendations.overview.enabled")
						: tr("recommendations.overview.disabled")}
				</Badge>
			</CardHeader>
			<CardContent>
				<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid">
					<StatsTile
						title={tr("recommendations.overview.totalSearches")}
						value={data.totalSearches}
						valueFormat="number"
						context={tr("recommendations.overview.totalSearchesDesc")}
						icon={<SearchIcon className="size-4" />}
					/>
					<StatsTile
						title={tr("recommendations.overview.totalClicks")}
						value={data.totalClicks}
						valueFormat="number"
						context={tr("recommendations.overview.totalClicksDesc")}
						icon={<MousePointerClickIcon className="size-4" />}
					/>
					<StatsTile
						title={tr("recommendations.overview.uniqueUsers")}
						value={data.uniqueUsers}
						valueFormat="number"
						context={tr("recommendations.overview.uniqueUsersDesc")}
						icon={<UsersIcon className="size-4" />}
					/>
					<StatsTile
						title={tr("recommendations.overview.ctr")}
						value={data.ctr}
						valueFormat="percentage"
						context={tr("recommendations.overview.ctrDesc")}
						icon={<BarChart3Icon className="size-4" />}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
