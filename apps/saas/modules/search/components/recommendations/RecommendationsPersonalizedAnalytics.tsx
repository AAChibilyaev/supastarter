"use client";

import { Badge } from "@repo/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { ClockIcon, MousePointerClickIcon, SearchIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";

interface RecommendationsPersonalizedAnalyticsProps {
	organizationId: string;
}

interface RecommendationItem {
	productId: string;
	score: number;
	source: "collaborative" | "trending" | "similar_queries";
	matchedUsers?: number;
	reason?: string;
}

type PersonalizationMode = "collaborative" | "trending" | "hybrid";

const MODE_OPTIONS: PersonalizationMode[] = ["hybrid", "collaborative", "trending"];

export function RecommendationsPersonalizedAnalytics({
	organizationId,
}: RecommendationsPersonalizedAnalyticsProps) {
	const tr = useTranslations("search");

	const [mode, setMode] = useState<PersonalizationMode>("hybrid");

	const { data, isLoading, error } = useQuery(
		orpc.recommendations.personalizedFromAnalytics.queryOptions({
			input: {
				organizationId,
				mode,
				limit: 20,
			},
		}),
	);

	const recommendations: RecommendationItem[] = data?.recommendations ?? [];
	const profile = data?.profile;
	const hasProfile = profile?.hasProfile ?? false;
	const isLoadingProfile = isLoading && !data;

	const sourceLabel = (source: RecommendationItem["source"]): string => {
		switch (source) {
			case "collaborative":
				return tr("recommendations.analytics.sourceCollaborative");
			case "trending":
				return tr("recommendations.analytics.sourceTrending");
			case "similar_queries":
				return tr("recommendations.analytics.sourceSimilarQueries");
		}
	};

	const sourceBadgeVariant = (
		source: RecommendationItem["source"],
	): "info" | "success" | "warning" => {
		switch (source) {
			case "collaborative":
				return "info";
			case "trending":
				return "warning";
			case "similar_queries":
				return "success";
		}
	};

	return (
		<div className="space-y-4">
			{/* Mode Selector */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{tr("recommendations.analytics.modeTitle")}
					</CardTitle>
					<CardDescription>
						{tr("recommendations.analytics.modeDescription")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs value={mode} onValueChange={(v) => setMode(v as PersonalizationMode)}>
						<TabsList>
							{MODE_OPTIONS.map((m) => (
								<TabsTrigger key={m} value={m}>
									{tr(
										`recommendations.analytics.mode${m.charAt(0).toUpperCase() + m.slice(1)}`,
									)}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				</CardContent>
			</Card>

			{/* User Profile */}
			<Card>
				<CardHeader>
					<CardTitle className="gap-2 text-base flex items-center">
						<SparklesIcon className="size-4 text-primary" />
						{tr("recommendations.analytics.profileTitle")}
					</CardTitle>
					<CardDescription>
						{tr("recommendations.analytics.profileDescription")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoadingProfile && (
						<div className="space-y-2">
							<Skeleton className="h-4 w-48" />
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-64" />
						</div>
					)}

					{!isLoadingProfile && !hasProfile && (
						<EmptyState
							variant="inline"
							icon={<SearchIcon className="size-8" />}
							title={tr("recommendations.analytics.noProfileTitle")}
							description={tr("recommendations.analytics.noProfileDescription")}
						/>
					)}

					{!isLoadingProfile && hasProfile && profile && (
						<div className="gap-4 md:grid-cols-3 grid">
							<div className="space-y-1">
								<div className="gap-1.5 text-sm flex items-center text-muted-foreground">
									<MousePointerClickIcon className="size-3.5" />
									<span>{tr("recommendations.analytics.clickedProducts")}</span>
								</div>
								<p className="text-2xl font-semibold">
									{profile.clickedProductIds.length}
								</p>
							</div>

							<div className="space-y-1">
								<div className="gap-1.5 text-sm flex items-center text-muted-foreground">
									<SearchIcon className="size-3.5" />
									<span>{tr("recommendations.analytics.recentQueries")}</span>
								</div>
								<p className="text-2xl font-semibold">
									{profile.recentQueries.length}
								</p>
							</div>

							<div className="space-y-1">
								<div className="gap-1.5 text-sm flex items-center text-muted-foreground">
									<ClockIcon className="size-3.5" />
									<span>{tr("recommendations.analytics.totalEvents")}</span>
								</div>
								<p className="text-2xl font-semibold">{profile.totalEvents}</p>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Recommendations List */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{tr("recommendations.analytics.recommendationsTitle")}
					</CardTitle>
					<CardDescription>
						{tr("recommendations.analytics.recommendationsDescription", {
							count: recommendations.length,
						})}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading && (
						<div className="space-y-3">
							{[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-16 w-full rounded-lg" />
							))}
						</div>
					)}

					{!isLoading && error && (
						<EmptyState
							variant="inline"
							title={tr("recommendations.analytics.errorTitle")}
							description={tr("recommendations.analytics.errorDescription")}
						/>
					)}

					{!isLoading && !error && recommendations.length === 0 && (
						<EmptyState
							variant="inline"
							title={tr("recommendations.analytics.noRecommendationsTitle")}
							description={tr(
								"recommendations.analytics.noRecommendationsDescription",
							)}
						/>
					)}

					{!isLoading && recommendations.length > 0 && (
						<div className="space-y-2">
							{recommendations.map((rec) => (
								<div
									key={rec.productId}
									className="p-3 flex items-center justify-between rounded-lg border"
								>
									<div className="min-w-0 flex-1">
										<div className="gap-2 flex items-center">
											<span className="font-medium truncate">
												{rec.productId}
											</span>
											<Badge
												status={sourceBadgeVariant(rec.source)}
												className="shrink-0 text-[10px]"
											>
												{sourceLabel(rec.source)}
											</Badge>
										</div>
										{rec.reason && (
											<p className="mt-0.5 text-xs truncate text-muted-foreground">
												{rec.reason}
											</p>
										)}
									</div>
									<div className="ml-3 gap-3 flex shrink-0 items-center">
										<span className="text-sm text-muted-foreground">
											{rec.score.toFixed(2)}
										</span>
										{rec.matchedUsers !== undefined && (
											<span className="text-xs text-muted-foreground">
												{rec.matchedUsers} users
											</span>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
