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
import {
	CheckIcon,
	DatabaseIcon,
	CableIcon,
	KeyIcon,
	SearchIcon,
	GlobeIcon,
	RocketIcon,
	BarChart3Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface StepConfig {
	key: string;
	serverStep: number;
	labelKey: string;
	descKey: string;
	actionKey: string;
	icon: React.ComponentType<{ className?: string }>;
	href: string;
	done: boolean;
}

export function GettingStarted({ organizationId }: { organizationId: string }) {
	const t = useTranslations("search.gettingStarted");
	const slug = useActiveOrganization()?.activeOrganization?.slug;

	const { data: onboarding, isLoading } = useQuery({
		...orpc.search.onboardingStatus.queryOptions({
			input: { organizationId },
		}),
		enabled: Boolean(organizationId),
	});

	if (!slug) return null;

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-10 w-72" />
				<Skeleton className="h-4 w-96" />
				{[...Array(6)].map((_, i) => (
					<Skeleton key={i} className="h-24 w-full" />
				))}
			</div>
		);
	}

	const serverSteps = onboarding?.steps ?? [];
	const isComplete = onboarding?.allCompleted ?? false;
	const completedCount = onboarding?.completedCount ?? 0;
	const totalSteps = onboarding?.totalSteps ?? 6;

	const stepConfigs: StepConfig[] = [
		{
			key: "createIndex",
			serverStep: 1,
			labelKey: "step1Label",
			descKey: "step1Desc",
			actionKey: "step1Action",
			icon: DatabaseIcon,
			href: `/${slug}/search`,
			done: serverSteps.find((s) => s.step === 1)?.completed ?? false,
		},
		{
			key: "connectSource",
			serverStep: 2,
			labelKey: "step2Label",
			descKey: "step2Desc",
			actionKey: "step2Action",
			icon: CableIcon,
			href: `/${slug}/connectors`,
			done: serverSteps.find((s) => s.step === 2)?.completed ?? false,
		},
		{
			key: "runSync",
			serverStep: 3,
			labelKey: "step3Label",
			descKey: "step3Desc",
			actionKey: "step3Action",
			icon: RocketIcon,
			href: `/${slug}/import-jobs`,
			done: serverSteps.find((s) => s.step === 3)?.completed ?? false,
		},
		{
			key: "testSearch",
			serverStep: 4,
			labelKey: "step4Label",
			descKey: "step4Desc",
			actionKey: "step4Action",
			icon: SearchIcon,
			href: `/${slug}/preview`,
			done: serverSteps.find((s) => s.step === 4)?.completed ?? false,
		},
		{
			key: "generateKey",
			serverStep: 5,
			labelKey: "step5Label",
			descKey: "step5Desc",
			actionKey: "step5Action",
			icon: KeyIcon,
			href: `/${slug}/api-keys`,
			done: serverSteps.find((s) => s.step === 5)?.completed ?? false,
		},
		{
			key: "embedWidget",
			serverStep: 6,
			labelKey: "step6Label",
			descKey: "step6Desc",
			actionKey: "step6Action",
			icon: GlobeIcon,
			href: `/${slug}/search?tab=widget`,
			done: serverSteps.find((s) => s.step === 6)?.completed ?? false,
		},
	];

	const percentComplete = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<div className="gap-2 flex items-center">
					<RocketIcon className="size-7 text-primary" />
					<h1 className="text-3xl font-bold tracking-tight">{t("welcome")}</h1>
				</div>
				<p className="mt-2 text-muted-foreground">
					{isComplete ? t("allDone") : t("subtitle")}
				</p>
			</div>

			{/* Progress bar */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">{t("progress")}</CardTitle>
					<CardDescription>
						{completedCount} / {totalSteps} {t("completed")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Progress value={percentComplete} className="h-2" />
				</CardContent>
			</Card>

			{/* All done banner */}
			{isComplete && (
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
								<Link href={`/${slug}/overview`}>{t("viewAnalytics")}</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Steps */}
			<div className="space-y-4">
				{stepConfigs.map((step, index) => {
					const Icon = step.icon;
					return (
						<Card
							key={step.key}
							className={`transition-colors ${
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
											<CheckIcon className="size-5" />
										) : (
											<span>{index + 1}</span>
										)}
									</div>

									{/* Content */}
									<div className="min-w-0 flex-1">
										<div className="gap-2 flex flex-wrap items-center">
											<Icon className="size-4 shrink-0 text-muted-foreground" />
											<h3 className="font-semibold">{t(step.labelKey)}</h3>
											{step.done ? (
												<Badge
													status="success"
													className="text-xs ml-auto shrink-0"
												>
													<CheckIcon className="size-3 mr-1 inline" />
													{t("done")}
												</Badge>
											) : (
												<Badge
													status="warning"
													className="text-xs ml-auto shrink-0"
												>
													{t("pending")}
												</Badge>
											)}
										</div>
										<p className="mt-1 text-sm text-muted-foreground">
											{t(step.descKey)}
										</p>
									</div>

									{/* Action */}
									<div className="shrink-0 self-center">
										{step.done ? (
											<Button variant="ghost" size="sm" disabled>
												<CheckIcon className="size-4 text-primary" />
											</Button>
										) : (
											<Button variant="outline" size="sm" asChild>
												<Link href={step.href}>{t(step.actionKey)}</Link>
											</Button>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Skip to dashboard and Plan CTA */}
			<div className="space-y-4">
				<div className="text-center">
					<Button variant="link" asChild>
						<Link href={`/${slug}/overview`}>{t("skipToDashboard")}</Link>
					</Button>
				</div>

				<Card>
					<CardContent className="pt-6 gap-4 flex items-center justify-between">
						<div>
							<h3 className="font-semibold text-sm">{t("planCtaTitle")}</h3>
							<p className="text-sm text-muted-foreground">{t("planCtaDesc")}</p>
						</div>
						<Button variant="outline" asChild>
							<Link href={`/${slug}/settings/billing`}>{t("managePlan")}</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
