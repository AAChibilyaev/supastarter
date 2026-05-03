"use client";

import { useActivation } from "@onboarding/hooks/useActivation";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	RocketIcon,
	SparklesIcon,
	XCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

// ─── Health status config ──────────────────────────────────────────────────

const HEALTH_CONFIG: Record<
	string,
	{
		labelKey: string;
		icon: React.ComponentType<{ className?: string }>;
		variant: "success" | "warning" | "error" | "info";
	}
> = {
	activated: {
		labelKey: "search.activation.activated",
		icon: CheckCircleIcon,
		variant: "success",
	},
	healthy: { labelKey: "search.activation.healthy", icon: SparklesIcon, variant: "success" },
	"at-risk": {
		labelKey: "search.activation.atRisk",
		icon: AlertTriangleIcon,
		variant: "warning",
	},
	churned: { labelKey: "search.activation.churned", icon: XCircleIcon, variant: "error" },
	unknown: { labelKey: "search.activation.unknown", icon: AlertTriangleIcon, variant: "info" },
};

// ─── MilestonesCard ──────────────────────────────────────────────────────────

export function MilestonesCard() {
	const t = useTranslations();
	const { milestone, milestoneLabel, health, isActivated, checklist, isLoading } =
		useActivation();

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-32" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-2 w-full" />
					<Skeleton className="h-4 w-24" />
				</CardContent>
			</Card>
		);
	}

	const healthCfg = HEALTH_CONFIG[health] ?? HEALTH_CONFIG.unknown;
	const HealthIcon = healthCfg.icon;
	const badgeVariant = healthCfg.variant as "success" | "warning" | "error" | "info";

	return (
		<Card>
			<CardHeader className="gap-2 flex flex-row items-center justify-between">
				<div className="gap-2 flex items-center">
					<RocketIcon className="size-5 text-primary" />
					<CardTitle className="text-sm font-semibold">
						{t("search.activation.title")}
					</CardTitle>
				</div>
				<Badge status={badgeVariant} className="gap-1">
					<HealthIcon className="size-3" />
					{t(healthCfg.labelKey)}
				</Badge>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Milestone info */}
				<div className="space-y-1">
					<p className="text-sm">
						{t("search.activation.currentMilestone")}:{" "}
						<span className="font-semibold">{milestoneLabel}</span>
						<span className="text-muted-foreground">
							{" "}
							({milestone}/{5})
						</span>
					</p>
					<p className="text-xs text-muted-foreground">
						{isActivated
							? t("search.activation.activatedDescription")
							: t("search.activation.notActivatedDescription")}
					</p>
				</div>

				{/* Progress bar */}
				<div className="space-y-1">
					<div className="gap-2 flex items-center justify-between">
						<span className="text-xs text-muted-foreground">
							{t("search.activation.setupProgress")}
						</span>
						<span className="text-xs font-medium">
							{checklist.completedCount}/{checklist.totalSteps}
						</span>
					</div>
					<Progress value={checklist.percent} className="h-2" />
				</div>

				{/* Next step CTA */}
				{!isActivated && (
					<Button variant="primary" size="sm" asChild>
						<Link href="./getting-started">{t("search.activation.continueSetup")}</Link>
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
