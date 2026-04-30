"use client";

import { Badge } from "@repo/ui/components/badge";
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

interface ProjectOverviewProps {
	organizationId: string;
	slug: string;
	displayName: string;
	version: number;
}

export function ProjectOverview({
	organizationId,
	slug,
	displayName,
	version,
}: ProjectOverviewProps) {
	const t = useTranslations();

	const { data: usage, isLoading: usageLoading } = useQuery(
		orpc.search.usage.queryOptions({ input: { organizationId, slug } }),
	);

	const { data: apiKeys } = useQuery(
		orpc.search.listApiKeys.queryOptions({ input: { organizationId, slug } }),
	);

	const hasApiKeys = apiKeys && apiKeys.length > 0;
	const hasUsage = usage && (usage.searches > 0 || usage.ingests > 0);

	const checklist = [
		{ key: "createIndex", done: true },
		{ key: "generateKey", done: hasApiKeys ?? false },
		{ key: "cmsModule", done: false, link: true },
		{ key: "fullSync", done: hasUsage ?? false },
		{ key: "testSearch", done: (usage?.searches ?? 0) > 0 },
		{ key: "enableWidget", done: false },
	];

	const doneCount = checklist.filter((c) => c.done).length;

	return (
		<div className="space-y-6">
			{/* Overview cards */}
			<div className="gap-4 md:grid-cols-2 lg:grid-cols-3 grid">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>{t("search.overview.indexVersion")}</CardDescription>
						<CardTitle className="text-2xl">{version}</CardTitle>
					</CardHeader>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription>{t("search.overview.apiKeys")}</CardDescription>
						<CardTitle className="text-2xl">
							{usageLoading ? (
								<Skeleton className="h-8 w-12" />
							) : (
								(apiKeys?.length ?? 0)
							)}
						</CardTitle>
					</CardHeader>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription>{t("search.overview.searches")}</CardDescription>
						<CardTitle className="text-2xl">
							{usageLoading ? (
								<Skeleton className="h-8 w-16" />
							) : (
								(usage?.searches ?? 0).toLocaleString()
							)}
						</CardTitle>
					</CardHeader>
				</Card>
			</div>

			{/* Setup checklist */}
			<Card>
				<CardHeader>
					<CardTitle>{t("search.checklist.title")}</CardTitle>
					<CardDescription>
						{doneCount}/{checklist.length} {t("search.checklist.completed")}
					</CardDescription>
					<Progress value={(doneCount / checklist.length) * 100} className="mt-2" />
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
								<div className="text-sm flex-1">
									{t(`search.checklist.${item.key}`)}
								</div>
								{item.done ? (
									<Badge variant="success" className="text-xs">
										{t("search.checklist.done")}
									</Badge>
								) : (
									<Badge variant="secondary" className="text-xs">
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
