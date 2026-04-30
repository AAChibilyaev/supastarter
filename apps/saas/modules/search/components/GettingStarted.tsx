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
import {
	BarChart3Icon,
	CableIcon,
	DatabaseIcon,
	KeyIcon,
	RocketIcon,
	SearchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface Step {
	key: string;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	href: string;
	done: boolean;
}

export function GettingStarted() {
	const t = useTranslations("gettingStarted");
	const { activeOrganization } = useActiveOrganization();
	const orgId = activeOrganization?.id;
	const slug = activeOrganization?.slug;

	const { data: indexes, isLoading: indexesLoading } = useQuery({
		...orpc.search.listIndexes.queryOptions({
			input: { organizationId: orgId ?? "" },
		}),
		enabled: Boolean(orgId),
	});

	const { data: planInfo, isLoading: planLoading } = useQuery({
		...orpc.entitlements.plan.queryOptions({
			input: { organizationId: orgId ?? "" },
		}),
		enabled: Boolean(orgId),
	});

	const { data: usage } = useQuery({
		...orpc.search.usage.queryOptions({
			input: { organizationId: orgId ?? "", windowDays: 30 },
		}),
		enabled: Boolean(orgId),
	});

	if (!orgId || !slug) return null;

	const isLoading = indexesLoading || planLoading;

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-10 w-72" />
				<Skeleton className="h-4 w-96" />
				{[...Array(5)].map((_, i) => (
					<Skeleton key={i} className="h-24 w-full" />
				))}
			</div>
		);
	}

	const hasIndexes = (indexes?.length ?? 0) > 0;
	const totalApiKeys = indexes?.reduce((sum, idx) => sum + (idx.apiKeysCount ?? 0), 0) ?? 0;
	const hasApiKeys = totalApiKeys > 0;
	const totalSearches =
		usage?.rows
			.filter((row) => row.type === "search")
			.reduce((sum, row) => sum + row.total, 0) ?? 0;
	const hasUsage = totalSearches > 0;
	const hasWidget = hasApiKeys && hasUsage; // widget is installable when both exist

	const PLAN_RELATED = `${slug}/settings/billing`;

	const steps: Step[] = [
		{
			key: "createIndex",
			label: t("step1Label"),
			description: t("step1Desc"),
			icon: DatabaseIcon,
			href: `/${slug}/search`,
			done: hasIndexes,
		},
		{
			key: "generateKey",
			label: t("step2Label"),
			description: t("step2Desc"),
			icon: KeyIcon,
			href: hasIndexes ? `/${slug}/search` : `/${slug}/search`,
			done: hasApiKeys,
		},
		{
			key: "importData",
			label: t("step3Label"),
			description: t("step3Desc"),
			icon: CableIcon,
			href: hasIndexes ? `/${slug}/search` : `/${slug}/search`,
			done: hasUsage,
		},
		{
			key: "installWidget",
			label: t("step4Label"),
			description: t("step4Desc"),
			icon: SearchIcon,
			href: hasIndexes ? `/${slug}/search` : `/${slug}/search`,
			done: hasWidget,
		},
		{
			key: "monitorAnalytics",
			label: t("step5Label"),
			description: t("step5Desc"),
			icon: BarChart3Icon,
			href: hasUsage ? `/${slug}/analytics` : `/${slug}/search`,
			done: hasUsage,
		},
	];

	const doneCount = steps.filter((s) => s.done).length;
	const totalSteps = steps.length;
	const allDone = doneCount === totalSteps;

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<div className="gap-2 flex items-center">
					<RocketIcon className="size-7 text-primary" />
					<h1 className="text-3xl font-bold tracking-tight">{t("welcome")}</h1>
				</div>
				<p className="mt-2 text-muted-foreground">
					{allDone ? t("allDone") : t("subtitle")}
				</p>
			</div>

			{/* Progress bar */}
			{!allDone && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">{t("progress")}</CardTitle>
						<CardDescription>
							{doneCount}/{totalSteps} {t("completed")}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Progress value={(doneCount / totalSteps) * 100} className="h-2" />
					</CardContent>
				</Card>
			)}

			{/* All done banner */}
			{allDone && (
				<Card className="border-l-4 border-l-primary">
					<CardContent className="pt-6">
						<div className="gap-4 flex items-center">
							<div className="size-12 flex items-center justify-center rounded-full bg-primary/10">
								<RocketIcon className="size-6 text-primary" />
							</div>
							<div className="flex-1">
								<h3 className="font-semibold text-lg">{t("allDoneTitle")}</h3>
								<p className="text-sm text-muted-foreground">{t("allDoneDesc")}</p>
							</div>
							<Button variant="outline" asChild>
								<Link href={`/${slug}/analytics`}>{t("viewAnalytics")}</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Steps */}
			<div className="space-y-4">
				{steps.map((step, index) => (
					<Link key={step.key} href={step.href} className="block">
						<Card
							className={`cursor-pointer transition-colors hover:bg-accent/50 ${
								step.done
									? "border-l-4 border-l-primary"
									: "border-l-4 border-l-muted-foreground/20"
							}`}
						>
							<CardContent className="pt-6">
								<div className="gap-4 flex items-start">
									{/* Step number */}
									<div
										className={`mt-0.5 size-10 text-sm font-bold flex shrink-0 items-center justify-center rounded-full ${
											step.done
												? "bg-primary text-primary-foreground"
												: "bg-muted text-muted-foreground"
										}`}
									>
										{step.done ? (
											<span className="text-base">✓</span>
										) : (
											<span>{index + 1}</span>
										)}
									</div>

									{/* Content */}
									<div className="min-w-0 flex-1">
										<div className="gap-2 flex items-center">
											<step.icon className="size-4 shrink-0 text-muted-foreground" />
											<h3 className="font-semibold">{step.label}</h3>
											{step.done ? (
												<Badge
													status="success"
													className="text-xs ml-auto shrink-0"
												>
													{t("done")}
												</Badge>
											) : (
												<Badge
													status="info"
													className="text-xs ml-auto shrink-0"
												>
													{t("pending")}
												</Badge>
											)}
										</div>
										<p className="mt-1 text-sm text-muted-foreground">
											{step.description}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>

			{/* Plan CTA */}
			<Card>
				<CardContent className="pt-6 gap-4 flex items-center justify-between">
					<div>
						<h3 className="font-semibold text-sm">{t("planCtaTitle")}</h3>
						<p className="text-sm text-muted-foreground">{t("planCtaDesc")}</p>
					</div>
					<Button variant="outline" asChild>
						<Link href={PLAN_RELATED}>{t("managePlan")}</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
