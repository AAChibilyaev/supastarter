"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangleIcon, RefreshCwIcon, RotateCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

interface ReindexPanelProps {
	organizationId: string;
	slug: string;
	indexId: string;
	hasActiveJob: boolean;
}

export function ReindexPanel({ organizationId, slug, indexId, hasActiveJob: _hasActiveJob }: ReindexPanelProps) {
	const t = useTranslations("search");
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();
	const [pollingActive, setPollingActive] = useState(false);

	// Poll for reindex job progress
	const { data: pipelineStatus, isLoading: statusLoading } = useQuery(
		orpc.search.pipelineStatus.queryOptions({
			input: { organizationId },
			refetchInterval: pollingActive ? 3000 : false,
		}),
	);

	const activeJobs = pipelineStatus?.activeReindexJobs ?? [];
	const currentJob = activeJobs.find((j) => j.slug === slug);

	useEffect(() => {
		if (currentJob && currentJob.processed < currentJob.total) {
			setPollingActive(true);
		} else if (currentJob && currentJob.processed >= currentJob.total) {
			setPollingActive(false);
		}
	}, [currentJob]);

	// Reindex mutation
	const reindexMutation = useMutation({
		...orpc.search.reindex.mutationOptions(),
		onSuccess: (result) => {
			toastSuccess(t("collection.reindexStarted"));
			setPollingActive(true);
			void queryClient.invalidateQueries({
				queryKey: orpc.search.pipelineStatus.queryKey({ input: { organizationId } }),
			});
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("collection.reindexError"));
		},
	});

	const handleReindex = () => {
		confirm({
			title: t("collection.confirmReindex"),
			message: t("collection.confirmReindexDesc"),
			confirmLabel: t("collection.reindex"),
			onConfirm: () => {
				reindexMutation.mutate({
					organizationId,
					slug,
				});
			},
		});
	};

	const progressPercent = currentJob
		? Math.round((currentJob.processed / currentJob.total) * 100)
		: 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="gap-2 text-base flex items-center">
					<RotateCcwIcon className="size-4" />
					{t("collection.reindex")}
				</CardTitle>
				<CardDescription>{t("collection.reindexDescription")}</CardDescription>
			</CardHeader>
			<CardContent>
				{/* Active job progress */}
				{currentJob && currentJob.processed < currentJob.total && (
					<div className="mb-4 space-y-3">
						<div className="gap-2 flex items-center">
							<RefreshCwIcon className="size-4 animate-spin text-primary" />
							<span className="text-sm font-medium">{t("collection.reindexInProgress")}</span>
						</div>

						{/* Progress bar */}
						<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-all duration-500"
								style={{ width: `${progressPercent}%` }}
							/>
						</div>

						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<span>
								{currentJob.processed} / {currentJob.total} {t("collection.reindexDocuments")}
							</span>
							<span>{progressPercent}%</span>
						</div>
					</div>
				)}

				{/* Completed job message */}
				{currentJob && currentJob.processed >= currentJob.total && currentJob.total > 0 && (
					<div className="mb-4">
						<Badge status="success">
							{t("collection.reindexCompleted")}
						</Badge>
						<p className="mt-2 text-xs text-muted-foreground">
							{currentJob.processed} {t("collection.reindexDocumentsProcessed")}
						</p>
					</div>
				)}

				{/* No active job */}
				{(!currentJob || currentJob.processed >= currentJob.total) && (
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							{t("collection.reindexIdle")}
						</p>

						{/* Advanced options info */}
						<div className="gap-2 p-3 flex items-start rounded-lg border border-amber-500/20 bg-amber-500/5">
							<AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
							<div>
								<p className="text-xs font-medium text-amber-600 dark:text-amber-400">
									{t("collection.reindexWarning")}
								</p>
								<p className="mt-0.5 text-xs text-muted-foreground">
									{t("collection.reindexWarningDesc")}
								</p>
							</div>
						</div>

						<Button
							variant="outline"
							onClick={handleReindex}
							disabled={reindexMutation.isPending}
						>
							<RotateCcwIcon className="mr-2 size-4" />
							{t("collection.reindexButton")}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
