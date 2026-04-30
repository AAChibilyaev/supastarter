"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
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
	CheckIcon,
	DatabaseIcon,
	GlobeIcon,
	KeyIcon,
	RocketIcon,
	SearchIcon,
	SparklesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ComponentType } from "react";

interface StepConfig {
	key: string;
	serverStep: number;
	labelKey: string;
	descKey: string;
	actionKey: string;
	icon: ComponentType<{ className?: string }>;
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
				<Skeleton className="h-12 w-80 rounded-3xl" />
				<Skeleton className="h-5 max-w-2xl w-full" />
				<div className="gap-4 xl:grid-cols-2 grid">
					{[...Array(6)].map((_, index) => (
						<Skeleton key={index} className="h-56 w-full rounded-3xl" />
					))}
				</div>
			</div>
		);
	}

	const serverSteps = onboarding?.steps ?? [];
	const isComplete = onboarding?.allCompleted ?? false;
	const completedCount = onboarding?.completedCount ?? 0;
	const totalSteps = onboarding?.totalSteps ?? 6;
	const percentComplete = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

	const stepConfigs: StepConfig[] = [
		{
			key: "createIndex",
			serverStep: 1,
			labelKey: "step1Label",
			descKey: "step1Desc",
			actionKey: "step1Action",
			icon: DatabaseIcon,
			href: `/${slug}/search`,
			done: serverSteps.find((step) => step.step === 1)?.completed ?? false,
		},
		{
			key: "connectSource",
			serverStep: 2,
			labelKey: "step2Label",
			descKey: "step2Desc",
			actionKey: "step2Action",
			icon: CableIcon,
			href: `/${slug}/connectors`,
			done: serverSteps.find((step) => step.step === 2)?.completed ?? false,
		},
		{
			key: "runSync",
			serverStep: 3,
			labelKey: "step3Label",
			descKey: "step3Desc",
			actionKey: "step3Action",
			icon: RocketIcon,
			href: `/${slug}/import-jobs`,
			done: serverSteps.find((step) => step.step === 3)?.completed ?? false,
		},
		{
			key: "testSearch",
			serverStep: 4,
			labelKey: "step4Label",
			descKey: "step4Desc",
			actionKey: "step4Action",
			icon: SearchIcon,
			href: `/${slug}/preview`,
			done: serverSteps.find((step) => step.step === 4)?.completed ?? false,
		},
		{
			key: "generateKey",
			serverStep: 5,
			labelKey: "step5Label",
			descKey: "step5Desc",
			actionKey: "step5Action",
			icon: KeyIcon,
			href: `/${slug}/api-keys`,
			done: serverSteps.find((step) => step.step === 5)?.completed ?? false,
		},
		{
			key: "embedWidget",
			serverStep: 6,
			labelKey: "step6Label",
			descKey: "step6Desc",
			actionKey: "step6Action",
			icon: GlobeIcon,
			href: `/${slug}/search?tab=widget`,
			done: serverSteps.find((step) => step.step === 6)?.completed ?? false,
		},
	];

	return (
		<div className="space-y-8">
			<Card className="shadow-sm overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-background to-secondary/80">
				<CardContent className="p-0">
					<div className="gap-6 p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)] lg:p-8 grid">
						<div className="space-y-5">
							<div className="gap-3 flex flex-wrap items-center">
								<Badge status="info" className="bg-primary/12 text-primary">
									<SparklesIcon className="mr-1 size-3 inline" />
									{t("title")}
								</Badge>
								<Badge
									status={isComplete ? "success" : "warning"}
									className="text-xs"
								>
									{isComplete ? t("done") : t("pending")}
								</Badge>
							</div>

							<div className="space-y-3">
								<div className="gap-3 flex items-center">
									<div className="size-12 shadow-sm flex items-center justify-center rounded-2xl bg-primary text-primary-foreground">
										<RocketIcon className="size-6" />
									</div>
									<div>
										<h1 className="text-3xl font-semibold tracking-tight text-balance">
											{t("welcome")}
										</h1>
									</div>
								</div>
								<p className="max-w-2xl text-base leading-7 text-pretty text-muted-foreground">
									{isComplete ? t("allDone") : t("subtitle")}
								</p>
							</div>

							<Alert
								variant={isComplete ? "success" : "primary"}
								className="backdrop-blur-sm rounded-3xl border-0 bg-background/80"
							>
								<BarChart3Icon />
								<AlertTitle>
									{isComplete ? t("allDoneTitle") : t("progress")}
								</AlertTitle>
								<AlertDescription>
									{isComplete ? t("allDoneDesc") : t("planCtaDesc")}
								</AlertDescription>
							</Alert>
						</div>

						<Card className="border-white/60 shadow-sm backdrop-blur-sm dark:border-white/10 bg-background/85 dark:bg-card/95">
							<CardHeader className="space-y-4">
								<div className="gap-3 flex items-center justify-between">
									<div>
										<CardTitle>{t("progress")}</CardTitle>
										<CardDescription>
											{completedCount} / {totalSteps} {t("completed")}
										</CardDescription>
									</div>
									<Badge
										status={isComplete ? "success" : "info"}
										className="text-sm normal-case"
									>
										{percentComplete}%
									</Badge>
								</div>
								<Progress
									value={percentComplete}
									className="h-2.5 rounded-full bg-primary/10"
								/>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="gap-3 p-4 flex flex-wrap items-center rounded-2xl border border-border/60 bg-primary/5">
									<Badge status="success" className="text-sm normal-case">
										{completedCount} / {totalSteps} {t("completed")}
									</Badge>
									<Badge
										status={isComplete ? "success" : "warning"}
										className="text-sm normal-case"
									>
										{isComplete ? t("done") : t("pending")}
									</Badge>
								</div>

								<div className="gap-3 flex flex-wrap">
									<Button variant="primary" asChild>
										<Link href={`/${slug}/overview`}>
											{t("skipToDashboard")}
										</Link>
									</Button>
									<Button variant="outline" asChild>
										<Link href={`/${slug}/settings/billing`}>
											{t("managePlan")}
										</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</CardContent>
			</Card>

			<div className="gap-4 xl:grid-cols-2 grid">
				{stepConfigs.map((step, index) => {
					const Icon = step.icon;
					return (
						<Card
							key={step.key}
							className={
								step.done
									? "shadow-sm border-primary/20 bg-primary/5"
									: "shadow-sm border-border/70 bg-card"
							}
						>
							<CardHeader className="gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
								<div className="min-w-0 gap-4 flex items-start">
									<div
										className={
											step.done
												? "size-12 shadow-sm flex shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
												: "size-12 flex shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary text-secondary-foreground"
										}
									>
										{step.done ? (
											<CheckIcon className="size-5" />
										) : (
											<span className="text-base font-semibold">
												{index + 1}
											</span>
										)}
									</div>
									<div className="min-w-0 space-y-2">
										<div className="gap-2 flex flex-wrap items-center">
											<div className="size-7 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground">
												<Icon className="size-4" />
											</div>
											<CardTitle className="text-lg leading-tight">
												{t(step.labelKey)}
											</CardTitle>
										</div>
										<CardDescription className="text-sm leading-6 text-pretty">
											{t(step.descKey)}
										</CardDescription>
									</div>
								</div>
								<Badge
									status={step.done ? "success" : "warning"}
									className="text-xs shrink-0"
								>
									{step.done ? t("done") : t("pending")}
								</Badge>
							</CardHeader>
							<CardContent>
								<div className="gap-3 p-4 sm:flex-row sm:items-center sm:justify-between flex flex-col rounded-2xl border border-border/60 bg-background/80">
									<div className="space-y-1">
										<p className="text-sm font-medium text-foreground">
											{t(step.actionKey)}
										</p>
										<p className="text-sm text-muted-foreground">
											{step.done ? t("allDone") : t("subtitle")}
										</p>
									</div>
									<Button variant={step.done ? "secondary" : "primary"} asChild>
										<Link href={step.href}>{t(step.actionKey)}</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			<Card className="shadow-sm border-border/70">
				<CardContent className="gap-4 p-6 lg:flex-row lg:items-center lg:justify-between flex flex-col">
					<div className="space-y-1">
						<h3 className="text-lg font-semibold">{t("planCtaTitle")}</h3>
						<p className="text-sm text-muted-foreground">{t("planCtaDesc")}</p>
					</div>
					<div className="gap-3 flex flex-wrap">
						<Button variant="outline" asChild>
							<Link href={`/${slug}/settings/billing`}>{t("managePlan")}</Link>
						</Button>
						<Button variant="ghost" asChild>
							<Link href={`/${slug}/overview`}>{t("viewAnalytics")}</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
