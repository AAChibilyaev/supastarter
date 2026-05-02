"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";

import { IndexHealthChart } from "../dashboard/IndexHealthChart";
import { IndexStatusCards } from "../dashboard/IndexStatusCards";
import { LastSyncInfo } from "../dashboard/LastSyncInfo";

// ── Main component ───────────────────────────────────────────────

export function IndexManagementPage() {
	const t = useTranslations("indexing.dashboard");
	const params = useParams<{ organizationSlug: string; indexSlug: string }>();
	const { activeOrganization } = useActiveOrganization();

	const orgSlug = params.organizationSlug;
	const indexSlug = params.indexSlug;
	const orgId = activeOrganization?.id;

	// ── Fetch index info ───────────────────────────────────────────

	const { data: indexes, isLoading: indexesLoading } = useQuery(
		orpc.search.listIndexes.queryOptions({
			input: { organizationId: orgId ?? "" },
			enabled: Boolean(orgId),
		}),
	);

	const index = indexes?.find((idx) => idx.slug === indexSlug);

	// ── Fetch schema (doc count, fields) ───────────────────────────

	const { data: schemaData, isLoading: schemaLoading } = useQuery(
		orpc.search.schema.get.queryOptions({
			input: { organizationId: orgId ?? "", slug: indexSlug ?? "" },
			enabled: Boolean(orgId) && Boolean(indexSlug),
		}),
	);

	const numDocuments = schemaData?.numDocuments ?? 0;

	// ── Fetch recent activity (for sync timestamps) ────────────────

	const { data: activityData, isLoading: activityLoading } = useQuery(
		orpc.search.recentActivity.queryOptions({
			input: { organizationId: orgId ?? "", limit: 20 },
			enabled: Boolean(orgId),
		}),
	);

	const indexActivities =
		activityData?.activities?.filter((a) => a.indexSlug === indexSlug) ?? [];

	// Extract last full sync from activity data
	const lastFullSyncActivity = indexActivities.find((a) => a.kind === "sync_job");
	const lastFullSyncAt = lastFullSyncActivity?.createdAt ?? null;

	// ══ Mock data for now — will connect to real oRPC in Phase 8 ══

	// Index health chart data (last 7 days — placeholder)
	const healthChartData = [
		{ date: "Mon", documents: numDocuments, searches: 0 },
		{ date: "Tue", documents: numDocuments, searches: 0 },
		{ date: "Wed", documents: numDocuments, searches: 0 },
		{ date: "Thu", documents: numDocuments, searches: 0 },
		{ date: "Fri", documents: numDocuments, searches: 0 },
		{ date: "Sat", documents: numDocuments, searches: 0 },
		{ date: "Sun", documents: numDocuments, searches: 0 },
	];

	// Placeholder stats — will be replaced by oRPC in Phase 8
	const todaySearches = 0;
	const sizeBytes = null;
	const avgLatencyMs = null;

	// ── Loading state ──────────────────────────────────────────────

	if (!orgSlug || !indexSlug) return null;

	if (indexesLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-28 w-full" />
				<div className="gap-6 md:grid-cols-2 grid grid-cols-1">
					<Skeleton className="h-80" />
					<Skeleton className="h-48" />
				</div>
			</div>
		);
	}

	if (!index) {
		return (
			<div className="gap-4 py-20 flex flex-col items-center justify-center">
				<h2 className="font-semibold text-lg text-muted-foreground">
					{/* Collection not found */}
				</h2>
				<Link
					href={`/${orgSlug}/search/${indexSlug}`}
					className="text-sm text-primary hover:underline"
				>
					{t("backToCollection")}
				</Link>
			</div>
		);
	}

	// ── Render ────────────────────────────────────────────────────

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="gap-4 flex items-start">
				<Link
					href={`/${orgSlug}/search/${indexSlug}`}
					className="mt-1 text-muted-foreground hover:text-foreground"
				>
					<ChevronLeftIcon className="size-5" />
				</Link>
				<div className="min-w-0 flex-1">
					<div className="gap-2 flex flex-wrap items-center">
						<h1 className="font-bold text-2xl tracking-tight truncate">{t("title")}</h1>
						<Badge status={index.enabled ? "success" : "warning"}>
							v{index.version}
						</Badge>
					</div>
					<p className="text-sm mt-1 text-muted-foreground">
						{index.displayName ?? index.slug}
						{" \u00B7 "}
						{t("subtitle")}
					</p>
				</div>
			</div>

			{/* Status cards */}
			<IndexStatusCards
				numDocuments={numDocuments}
				todaySearches={todaySearches}
				sizeBytes={sizeBytes}
				avgLatencyMs={avgLatencyMs}
				version={index.version}
				isLive={index.enabled}
				isLoading={schemaLoading}
			/>

			{/* Health chart + sync info */}
			<div className="gap-6 md:grid-cols-2 grid grid-cols-1">
				<IndexHealthChart data={healthChartData} isLoading={schemaLoading} />
				<LastSyncInfo
					lastFullSyncAt={lastFullSyncAt}
					lastDeltaSyncAt={null}
					nextScheduledAt={null}
					isLoading={activityLoading}
				/>
			</div>

			{/* Placeholder for future action panels (Phase 2-5) */}
			<Card>
				<CardContent className="py-8 flex flex-col items-center justify-center">
					<p className="text-sm text-muted-foreground">{t("indexingProgress")}</p>
					<div className="gap-3 mt-4 flex">
						<Button variant="outline" disabled>
							{t("backToCollection")}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
