"use client";

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

export function BillingPlanInfo() {
	const t = useTranslations("settings.billing");
	const { activeOrganization } = useActiveOrganization();
	const orgId = activeOrganization?.id;
	const slug = activeOrganization?.slug;

	const { data: planInfo, isLoading } = useQuery({
		...orpc.entitlements.plan.queryOptions({
			input: { organizationId: orgId ?? "" },
		}),
		enabled: Boolean(orgId),
	});

	if (!orgId || !slug) return null;

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("activePlan.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-5 w-32" />
					<Skeleton className="h-4 w-64" />
					<Skeleton className="h-2 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (!planInfo) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("activePlan.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">{t("activePlan.notFound")}</p>
				</CardContent>
			</Card>
		);
	}

	const features: Array<{ key: string; enabled: boolean }> = Object.entries(
		planInfo.features,
	).map(([key, enabled]) => ({ key, enabled }));
	const searchesUsage = planInfo.usage.searches;
	const docsUsage = planInfo.usage.documents;
	const isStatusActive = planInfo.status === "active";
	const isStatusTrialing = planInfo.status === "trialing";

	return (
		<Card>
			<CardHeader>
				<div className="gap-2 flex items-center justify-between">
					<CardTitle>{t("activePlan.title")}</CardTitle>
					<Badge
						status={isStatusActive || isStatusTrialing ? "success" : "error"}
						className="text-xs"
					>
						{planInfo.status}
					</Badge>
				</div>
				<CardDescription>{t("activePlan.description")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Plan name */}
				<div>
					<p className="text-xl font-bold capitalize">{planInfo.planName}</p>
				</div>

				{/* Usage sections */}
				<div className="space-y-3">
					{/* Searches */}
					<div>
						<div className="mb-1 text-sm flex items-center justify-between">
							<span>{t("usage.searches")}</span>
							<span className="text-muted-foreground">
								{searchesUsage.isUnlimited
									? "∞"
									: `${searchesUsage.current.toLocaleString()} / ${searchesUsage.limit.toLocaleString()}`}
							</span>
						</div>
						{!searchesUsage.isUnlimited && (
							<Progress value={searchesUsage.percentUsed} className="h-2" />
						)}
					</div>

					{/* Documents */}
					<div>
						<div className="mb-1 text-sm flex items-center justify-between">
							<span>{t("usage.documents")}</span>
							<span className="text-muted-foreground">
								{docsUsage.isUnlimited
									? "∞"
									: `${docsUsage.current.toLocaleString()} / ${docsUsage.limit.toLocaleString()}`}
							</span>
						</div>
						{!docsUsage.isUnlimited && (
							<Progress value={docsUsage.percentUsed} className="h-2" />
						)}
					</div>
				</div>

				{/* Limits summary */}
				<div className="gap-2 sm:grid-cols-3 text-sm grid grid-cols-2">
					<div>
						<span className="block text-muted-foreground">
							{t("limits.maxIndexes")}
						</span>
						<span className="font-medium">{planInfo.limits.maxIndexes}</span>
					</div>
					<div>
						<span className="block text-muted-foreground">
							{t("limits.maxDocuments")}
						</span>
						<span className="font-medium">
							{planInfo.limits.maxDocuments === 0
								? "∞"
								: planInfo.limits.maxDocuments.toLocaleString()}
						</span>
					</div>
					<div>
						<span className="block text-muted-foreground">
							{t("limits.maxApiKeys")}
						</span>
						<span className="font-medium">{planInfo.limits.maxApiKeys}</span>
					</div>
					<div>
						<span className="block text-muted-foreground">{t("limits.rateLimit")}</span>
						<span className="font-medium">
							{planInfo.limits.rateLimitPerMinute}/min
						</span>
					</div>
					<div>
						<span className="block text-muted-foreground">
							{t("limits.maxSearchesPerMonth")}
						</span>
						<span className="font-medium">
							{planInfo.limits.maxSearchesPerMonth === 0
								? "∞"
								: planInfo.limits.maxSearchesPerMonth.toLocaleString()}
						</span>
					</div>
				</div>

				{/* Features */}
				<div>
					<h4 className="mb-2 text-sm font-semibold">{t("features.title")}</h4>
					<div className="gap-2 flex flex-wrap">
						{features.length === 0 && (
							<span className="text-xs text-muted-foreground">
								{t("features.none")}
							</span>
						)}
						{features.map((f) => (
							<Badge
								key={f.key}
								status={f.enabled ? "success" : "info"}
								className="text-xs capitalize"
							>
								{f.enabled ? f.key : `${f.key} (off)`}
							</Badge>
						))}
					</div>
				</div>

				{/* Upgrade CTA if not active */}
				{!isStatusActive && (
					<Button asChild variant="primary" className="w-full">
						<Link href={`/${slug}/settings/billing`}>{t("upgrade")}</Link>
					</Button>
				)}
			</CardContent>
		</Card>
	);
}

export function TochkaWalletSection({
	organizationId: _organizationId,
}: {
	organizationId: string;
}) {
	const t = useTranslations("settings.billing");

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("tochka.title")}</CardTitle>
				<CardDescription>{t("tochka.description")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-muted-foreground">{t("tochka.info")}</p>
				<div className="gap-3 flex items-center">
					<Button variant="outline" asChild>
						<Link href={`/settings/billing/ai-credits`}>{t("tochka.topup")}</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
