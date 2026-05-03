"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	AlertTriangleIcon,
	ClockIcon,
	MousePointerClickIcon,
	SearchIcon,
	SparklesIcon,
	UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";

interface TestPersonalizationPanelProps {
	organizationId: string;
}

export function TestPersonalizationPanel({ organizationId }: TestPersonalizationPanelProps) {
	const tr = useTranslations("search");
	const [userId, setUserId] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const { data, isLoading, error } = useQuery(
		orpc.recommendations.testPersonalization.queryOptions({
			input: {
				organizationId,
				anonymousUserId: userId.trim(),
				limit: 10,
			},
			enabled: submitted && userId.trim().length > 0,
		}),
	);

	const handleSubmit = () => {
		if (!userId.trim()) return;
		setSubmitted(true);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") handleSubmit();
	};

	const profile = data?.profile;
	const personalized = data?.personalized ?? [];
	const baseline = data?.baseline ?? [];
	const hasData = submitted && data;
	const isLoadingTest = isLoading && submitted;

	return (
		<div className="space-y-4">
			{/* User ID Input */}
			<Card>
				<CardHeader>
					<CardTitle className="gap-2 text-base flex items-center">
						<SearchIcon className="size-4 text-primary" />
						{tr("recommendations.test.title")}
					</CardTitle>
					<CardDescription>{tr("recommendations.test.description")}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="gap-3 flex items-end">
						<div className="flex-1">
							<Input
								placeholder={tr("recommendations.test.inputPlaceholder")}
								value={userId}
								onChange={(e) => {
									setUserId(e.target.value);
									if (submitted) setSubmitted(false);
								}}
								onKeyDown={handleKeyDown}
							/>
						</div>
						<Button onClick={handleSubmit} disabled={!userId.trim() || isLoadingTest}>
							{tr("recommendations.test.submit")}
						</Button>
					</div>
				</CardContent>
			</Card>

			{isLoadingTest && (
				<Card>
					<CardContent className="pt-6 space-y-4">
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-20 w-full rounded-lg" />
						<Skeleton className="h-20 w-full rounded-lg" />
					</CardContent>
				</Card>
			)}

			{error && !isLoadingTest && (
				<Card>
					<CardContent className="pt-6">
						<EmptyState
							variant="inline"
							icon={<AlertTriangleIcon className="size-8" />}
							title={tr("recommendations.test.errorTitle")}
							description={tr("recommendations.test.errorDescription")}
						/>
					</CardContent>
				</Card>
			)}

			{hasData && !isLoadingTest && profile && (
				<>
					{/* User Profile Summary */}
					<Card>
						<CardHeader>
							<CardTitle className="gap-2 text-base flex items-center">
								<UserIcon className="size-4 text-primary" />
								{tr("recommendations.test.profileTitle")}
								<Badge status={profile.hasProfile ? "success" : "warning"}>
									{profile.hasProfile
										? tr("recommendations.test.profileActive")
										: tr("recommendations.test.profileMinimal")}
								</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent>
							{!profile.hasProfile && (
								<EmptyState
									variant="inline"
									icon={<SearchIcon className="size-8" />}
									title={tr("recommendations.test.noProfileTitle")}
									description={tr("recommendations.test.noProfileDescription")}
								/>
							)}

							{profile.hasProfile && (
								<div className="gap-4 md:grid-cols-4 grid">
									<div className="space-y-1">
										<div className="gap-1.5 text-sm flex items-center text-muted-foreground">
											<MousePointerClickIcon className="size-3.5" />
											<span>{tr("recommendations.test.clickedProducts")}</span>
										</div>
										<p className="text-2xl font-semibold">{profile.clickedProductIds.length}</p>
									</div>
									<div className="space-y-1">
										<div className="gap-1.5 text-sm flex items-center text-muted-foreground">
											<SearchIcon className="size-3.5" />
											<span>{tr("recommendations.test.recentQueries")}</span>
										</div>
										<p className="text-2xl font-semibold">{profile.recentQueries.length}</p>
									</div>
									<div className="space-y-1">
										<div className="gap-1.5 text-sm flex items-center text-muted-foreground">
											<SparklesIcon className="size-3.5" />
											<span>{tr("recommendations.test.totalEvents")}</span>
										</div>
										<p className="text-2xl font-semibold">{profile.totalEvents}</p>
									</div>
									<div className="space-y-1">
										<div className="gap-1.5 text-sm flex items-center text-muted-foreground">
											<ClockIcon className="size-3.5" />
											<span>{tr("recommendations.test.lastActive")}</span>
										</div>
										<p className="text-sm font-medium">
											{profile.lastActive
												? new Date(profile.lastActive).toLocaleDateString()
												: tr("recommendations.test.notAvailable")}
										</p>
									</div>
								</div>
							)}

							{/* Category affinities */}
							{profile.categoryAffinities.length > 0 && (
								<div className="mt-4 space-y-2">
									<p className="text-sm font-medium text-muted-foreground">
										{tr("recommendations.test.categoryAffinities")}
									</p>
									<div className="gap-2 flex flex-wrap">
										{profile.categoryAffinities.map((cat) => (
											<Badge key={cat.key} status="info">
												{cat.key} ({(cat.weight * 100).toFixed(0)}%)
											</Badge>
										))}
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Comparison: Personalized vs Baseline */}
					<div className="gap-4 md:grid-cols-2 grid">
						{/* Personalized */}
						<Card>
							<CardHeader>
								<CardTitle className="gap-2 text-base flex items-center">
									<SparklesIcon className="size-4 text-primary" />
									{tr("recommendations.test.personalizedTitle")}
								</CardTitle>
								<CardDescription>
									{tr("recommendations.test.personalizedDescription")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								{personalized.length === 0 && (
									<EmptyState
										variant="inline"
										title={tr("recommendations.test.noPersonalized")}
										description={tr("recommendations.test.noPersonalizedDescription")}
									/>
								)}

								{personalized.length > 0 && (
									<div className="space-y-2">
										{personalized.map((rec) => (
											<div
												key={rec.productId}
												className="p-3 flex items-center justify-between rounded-lg border"
											>
												<div className="min-w-0 flex-1">
													<div className="gap-2 flex items-center">
														<span className="font-medium truncate">{rec.productId}</span>
														<Badge
															status={
																rec.source === "collaborative"
																	? "info"
																	: rec.source === "trending"
																		? "warning"
																		: "success"
															}
															className="shrink-0 text-[10px]"
														>
															{rec.source}
														</Badge>
													</div>
													{rec.reason && (
														<p className="mt-0.5 text-xs truncate text-muted-foreground">
															{rec.reason}
														</p>
													)}
												</div>
												<span className="ml-3 text-sm shrink-0 text-muted-foreground">
													{rec.score.toFixed(2)}
												</span>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Baseline (non-personalized) */}
						<Card>
							<CardHeader>
								<CardTitle className="gap-2 text-base flex items-center">
									<SearchIcon className="size-4 text-muted-foreground" />
									{tr("recommendations.test.baselineTitle")}
								</CardTitle>
								<CardDescription>{tr("recommendations.test.baselineDescription")}</CardDescription>
							</CardHeader>
							<CardContent>
								{baseline.length === 0 && (
									<EmptyState
										variant="inline"
										title={tr("recommendations.test.noBaseline")}
										description={tr("recommendations.test.noBaselineDescription")}
									/>
								)}

								{baseline.length > 0 && (
									<div className="space-y-2">
										{baseline.map((rec) => (
											<div
												key={rec.productId}
												className="p-3 flex items-center justify-between rounded-lg border"
											>
												<span className="font-medium truncate">{rec.productId}</span>
												<div className="gap-3 flex shrink-0 items-center">
													<span className="text-sm text-muted-foreground">
														{rec.score.toFixed(2)}
													</span>
													<span className="text-xs text-muted-foreground">
														{rec.clickCount} clicks
													</span>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</>
			)}

			{!submitted && !isLoadingTest && (
				<Card>
					<CardContent className="pt-6">
						<EmptyState
							variant="inline"
							icon={<SearchIcon className="size-8" />}
							title={tr("recommendations.test.readyToTest")}
							description={tr("recommendations.test.readyToTestDescription")}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
