"use client";

import { useSession } from "@auth/hooks/use-session";
import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function DashboardOverview() {
	const t = useTranslations();
	const { activeOrganization } = useActiveOrganization();
	const { user } = useSession();
	const orgId = activeOrganization?.id;

	const { data: planInfo, isLoading: planLoading } = useQuery({
		...orpc.entitlements.plan.queryOptions({ input: { organizationId: orgId ?? "" } }),
		enabled: Boolean(orgId),
	});

	const { data: indexes } = useQuery({
		...orpc.search.listIndexes.queryOptions({ input: { organizationId: orgId ?? "" } }),
		enabled: Boolean(orgId),
	});

	const hasApiKeys = false; // Simplified — real check would query keys
	const hasUsage = (planInfo?.usage.searches.current ?? 0) > 0;
	const slug = activeOrganization?.slug;

	if (!orgId || !slug) return null;

	if (planLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-64" />
				<div className="gap-4 md:grid-cols-3 grid">
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
				</div>
			</div>
		);
	}

	const planName = planInfo?.planName ?? "Free";
	const planStatus = planInfo?.status ?? "active";
	const searchesUsed = planInfo?.usage.searches.current ?? 0;
	const searchesLimit = planInfo?.usage.searches.limit ?? 0;
	const isUnlimitedSearches = planInfo?.usage.searches.isUnlimited ?? false;
	const docsUsed = planInfo?.usage.documents.current ?? 0;
	const docsLimit = planInfo?.usage.documents.limit ?? 0;
	const isUnlimitedDocs = planInfo?.usage.documents.isUnlimited ?? false;
	const searchPercent = isUnlimitedSearches
		? 0
		: searchesLimit > 0
			? Math.min(100, (searchesUsed / searchesLimit) * 100)
			: 0;
	const docPercent = isUnlimitedDocs
		? 0
		: docsLimit > 0
			? Math.min(100, (docsUsed / docsLimit) * 100)
			: 0;
	const indexesCount = indexes?.length ?? 0;

	const checklist = [
		{ key: "createIndex", done: indexesCount > 0, href: `/${slug}/search` },
		{ key: "generateKey", done: hasApiKeys, href: `/${slug}/search` },
		{ key: "importData", done: hasUsage, href: `/${slug}/search` },
		{ key: "installWidget", done: false, href: `/${slug}/search` },
		{ key: "testSearch", done: hasUsage, href: `/${slug}/search` },
	];
	const doneCount = checklist.filter((c) => c.done).length;

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{activeOrganization.name}</h1>
				<p className="mt-1 text-muted-foreground">{t("search.overview.title")}</p>
			</div>

			{/* Plan banner */}
			<Card
				className={`border-l-4 ${planStatus === "active" ? "border-l-primary" : "border-l-destructive"}`}
			>
				<CardContent className="pt-6 flex items-center justify-between">
					<div>
						<div className="gap-2 flex items-center">
							<span className="text-lg font-semibold">{planName}</span>
							{planStatus !== "active" && <Badge status="error">{planStatus}</Badge>}
						</div>
						<p className="text-sm mt-1 text-muted-foreground">
							{planInfo?.graceReadsUntil
								? t("search.overview.graceUntil", {
										date: new Date(
											planInfo.graceReadsUntil,
										).toLocaleDateString(),
									})
								: t("search.overview.active")}
						</p>
					</div>
					<Button variant="outline" asChild>
						<Link href={`/${slug}/settings/billing`}>
							{t("search.overview.managePlan")}
						</Link>
					</Button>
				</CardContent>
			</Card>

			{/* Usage cards */}
			<div className="gap-4 md:grid-cols-2 lg:grid-cols-4 grid">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>{t("search.overview.indexes")}</CardDescription>
						<CardTitle className="text-2xl">{indexesCount}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>{t("search.overview.searches")}</CardDescription>
						<CardTitle className="text-2xl">
							{isUnlimitedSearches
								? "∞"
								: `${searchesUsed.toLocaleString()} / ${searchesLimit.toLocaleString()}`}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{!isUnlimitedSearches && <Progress value={searchPercent} className="h-2" />}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>{t("search.overview.documents")}</CardDescription>
						<CardTitle className="text-2xl">
							{isUnlimitedDocs
								? "∞"
								: `${docsUsed.toLocaleString()} / ${docsLimit.toLocaleString()}`}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{!isUnlimitedDocs && <Progress value={docPercent} className="h-2" />}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>{t("search.overview.plan")}</CardDescription>
						<CardTitle className="text-2xl capitalize">{planName}</CardTitle>
					</CardHeader>
				</Card>
			</div>

			{/* Quick actions */}
			<div>
				<h2 className="text-xl font-semibold mb-4">{t("search.overview.quickActions")}</h2>
				<div className="gap-3 md:grid-cols-2 lg:grid-cols-3 grid">
					<Card className="cursor-pointer transition-colors hover:bg-accent/50">
						<Link href={`/${slug}/search`}>
							<CardHeader>
								<CardTitle className="text-base">
									{t("search.overview.manageIndexes")}
								</CardTitle>
								<CardDescription>
									{t("search.overview.manageIndexesDesc")}
								</CardDescription>
							</CardHeader>
						</Link>
					</Card>
					<Card className="cursor-pointer transition-colors hover:bg-accent/50">
						<Link href={`/${slug}/analytics`}>
							<CardHeader>
								<CardTitle className="text-base">
									{t("search.overview.viewAnalytics")}
								</CardTitle>
								<CardDescription>
									{t("search.overview.viewAnalyticsDesc")}
								</CardDescription>
							</CardHeader>
						</Link>
					</Card>
					<Card className="cursor-pointer transition-colors hover:bg-accent/50">
						<Link href={`/${slug}/connectors`}>
							<CardHeader>
								<CardTitle className="text-base">
									{t("search.overview.setupConnector")}
								</CardTitle>
								<CardDescription>
									{t("search.overview.setupConnectorDesc")}
								</CardDescription>
							</CardHeader>
						</Link>
					</Card>
				</div>
			</div>

			{/* Setup checklist */}
			<Card>
				<CardHeader>
					<CardTitle>{t("search.checklist.title")}</CardTitle>
					<CardDescription>
						{doneCount}/{checklist.length} {t("search.checklist.completed")}
					</CardDescription>
					<Progress value={(doneCount / checklist.length) * 100} className="mt-2 h-2" />
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{checklist.map((item) => (
							<div key={item.key} className="gap-3 flex items-center">
								<div
									className={`h-6 w-6 text-xs font-medium flex shrink-0 items-center justify-center rounded-full ${
										item.done
											? "bg-primary text-primary-foreground"
											: "bg-muted text-muted-foreground"
									}`}
								>
									{item.done ? "✓" : String(checklist.indexOf(item) + 1)}
								</div>
								<Link href={item.href} className="text-sm flex-1 hover:underline">
									{t(`search.checklist.${item.key}`)}
								</Link>
								{item.done ? (
									<Badge status="success" className="text-xs">
										{t("search.checklist.done")}
									</Badge>
								) : (
									<Badge status="info" className="text-xs">
										{t("search.checklist.pending")}
									</Badge>
								)}
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
