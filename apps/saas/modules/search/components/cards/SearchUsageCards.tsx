"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

interface SearchUsageCardsProps {
	organizationId: string;
}

export function SearchUsageCards({ organizationId }: SearchUsageCardsProps) {
	const t = useTranslations();

	const { data, isLoading, error } = useQuery(
		orpc.search.usageSummary.queryOptions({
			input: { organizationId, period: "last30" },
			enabled: !!organizationId,
		}),
	);

	if (isLoading) {
		return (
			<div className="gap-4 sm:grid-cols-2 grid">
				<Card>
					<CardHeader>
						<CardTitle className="h-5 w-24 animate-pulse rounded bg-foreground/10" />
					</CardHeader>
					<CardContent>
						<div className="mb-2 h-8 w-32 animate-pulse rounded bg-foreground/10" />
						<div className="h-2 animate-pulse rounded w-full bg-foreground/10" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="h-5 w-24 animate-pulse rounded bg-foreground/10" />
					</CardHeader>
					<CardContent>
						<div className="mb-2 h-8 w-32 animate-pulse rounded bg-foreground/10" />
						<div className="h-2 animate-pulse rounded w-full bg-foreground/10" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="rounded p-4 text-sm border text-center text-foreground/60">
				{t("search.usage.loadError")}
			</div>
		);
	}

	const searchesPercent = Math.min(Math.round((data.searchesUsed / data.searchesLimit) * 100), 100);
	const documentsPercent = Math.min(
		Math.round((data.documentsIndexed / data.documentsLimit) * 100),
		100,
	);

	return (
		<div className="gap-4 sm:grid-cols-2 grid">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("search.usage.searches")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<p className="text-2xl font-bold tabular-nums">
						{data.searchesUsed.toLocaleString()}
						<span className="text-base font-normal text-foreground/60">
							{" "}
							/ {data.searchesLimit.toLocaleString()}
						</span>
					</p>
					<Progress value={searchesPercent} />
					<p className="text-xs text-foreground/60">
						{searchesPercent}% {t("search.usage.ofLimit")}
					</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("search.usage.documents")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<p className="text-2xl font-bold tabular-nums">
						{data.documentsIndexed.toLocaleString()}
						<span className="text-base font-normal text-foreground/60">
							{" "}
							/ {data.documentsLimit.toLocaleString()}
						</span>
					</p>
					<Progress value={documentsPercent} />
					<p className="text-xs text-foreground/60">
						{documentsPercent}% {t("search.usage.ofLimit")}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
