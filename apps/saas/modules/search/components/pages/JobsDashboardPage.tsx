"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { ImportJobsPanel } from "../panels/ImportJobsPanel";
import { SyncJobsTable } from "../tables/SyncJobsTable";

interface JobsDashboardPageProps {
	organizationId: string;
}

function ReindexJobsTab({ organizationId }: { organizationId: string }) {
	const t = useTranslations("search");

	const { data: pipeline, isLoading } = useQuery(
		orpc.search.pipelineStatus.queryOptions({
			input: { organizationId },
		}),
	);

	if (isLoading) {
		return (
			<div className="p-6 text-foreground/60">{t("loading")}</div>
		);
	}

	const activeJobs = pipeline?.activeReindexJobs ?? [];

	if (activeJobs.length === 0) {
		return (
			<div className="p-6 text-foreground/60">{t("jobs.reindexEmpty")}</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("jobs.reindexJobId")}</TableHead>
						<TableHead>{t("jobs.reindexSlug")}</TableHead>
						<TableHead>{t("jobs.reindexProgress")}</TableHead>
						<TableHead>{t("jobs.reindexStarted")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{activeJobs.map((job) => {
						const pct =
							job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;
						return (
							<TableRow key={job.jobId}>
								<TableCell className="font-mono text-xs max-w-[180px] truncate">
									{job.jobId}
								</TableCell>
								<TableCell className="text-xs">{job.slug}</TableCell>
								<TableCell>
									<div className="flex items-center gap-2">
										<Badge status="info">
											{job.processed}/{job.total}
										</Badge>
										<span className="text-xs text-muted-foreground">{pct}%</span>
									</div>
								</TableCell>
								<TableCell className="text-xs whitespace-nowrap">
									{new Date(job.startedAt).toLocaleString()}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

function SyncJobsTab({ organizationId }: { organizationId: string }) {
	const t = useTranslations("search");

	const { data: syncJobs, isLoading } = useQuery(
		orpc.search.listConnectorSyncJobs.queryOptions({
			input: { organizationId },
		}),
	);

	if (!isLoading && (!syncJobs || syncJobs.length === 0)) {
		return (
			<div className="p-6 text-foreground/60">{t("jobs.syncJobsEmpty")}</div>
		);
	}

	return (
		<SyncJobsTable
			jobs={syncJobs ?? []}
			isLoading={isLoading}
		/>
	);
}

export function JobsDashboardPage({ organizationId }: JobsDashboardPageProps) {
	const t = useTranslations("search");

	return (
		<Tabs defaultValue="import" className="space-y-4">
			<TabsList>
				<TabsTrigger value="import">{t("jobs.importJobs")}</TabsTrigger>
				<TabsTrigger value="sync">{t("jobs.syncJobs")}</TabsTrigger>
				<TabsTrigger value="reindex">{t("jobs.reindex")}</TabsTrigger>
			</TabsList>

			<TabsContent value="import">
				<Card>
					<CardContent className="p-0">
						<ImportJobsPanel organizationId={organizationId} />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="sync">
				<Card>
					<CardContent className="p-0">
						<SyncJobsTab organizationId={organizationId} />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="reindex">
				<Card>
					<CardContent className="p-0">
						<ReindexJobsTab organizationId={organizationId} />
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>
	);
}
