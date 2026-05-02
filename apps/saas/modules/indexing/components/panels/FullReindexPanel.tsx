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
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Label } from "@repo/ui/components/label";
import { Progress } from "@repo/ui/components/progress";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, InfoIcon, RefreshCwIcon, RotateCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormatter } from "next-intl";
import { useState } from "react";

const POLL_INTERVAL_MS = 3000;

interface FullReindexPanelProps {
	organizationId: string;
	indexSlug: string;
}

export function FullReindexPanel({ organizationId, indexSlug }: FullReindexPanelProps) {
	const t = useTranslations("indexing.reindex");
	const format = useFormatter();
	const [showConfirm, setShowConfirm] = useState(false);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [trackedJobId, setTrackedJobId] = useState<string | null>(null);
	const [detectSchema, setDetectSchema] = useState(true);
	const [regenerateEmbeddings, setRegenerateEmbeddings] = useState(false);

	// ── Trigger reindex mutation ──────────────────────────────────

	const reindexMutation = useMutation(
		orpc.indexing.reindex.mutationOptions({
			onSuccess: (data) => {
				setTrackedJobId(data.jobId);
				setShowConfirm(false);
				setShowAdvanced(false);
				toastSuccess(t("jobPending"));
			},
			onError: (error) => {
				toastError(error.message || t("errorSchemaRequired"));
				setShowConfirm(false);
			},
		}),
	);

	// ── Poll reindex status when tracking a job ──────────────────────

	const { data: jobStatus } = useQuery({
		...orpc.indexing.reindexStatus.queryOptions({
			input: { organizationId, jobId: trackedJobId ?? "" },
			enabled: Boolean(trackedJobId),
		}),
		refetchInterval: (query) => {
			const data = query.state.data;
			if (!data) return POLL_INTERVAL_MS;
			if (data.status === "completed" || data.status === "failed") {
				return false;
			}
			return POLL_INTERVAL_MS;
		},
	});

	// ── Derive status display ────────────────────────────────────────

	const isRunning = jobStatus?.status === "running";
	const isPending = jobStatus?.status === "pending";
	const isCompleted = jobStatus?.status === "completed";
	const isFailed = jobStatus?.status === "failed";
	const hasActiveJob = isRunning || isPending;
	const total = jobStatus?.total ?? 0;
	const processed = jobStatus?.processed ?? 0;
	const progressPct = total > 0 ? Math.round((processed / total) * 100) : 0;

	const statusText = isPending
		? t("jobPending")
		: isRunning
			? t("jobRunning", { processed: format.number(processed), total: format.number(total) })
			: isCompleted
				? t("jobCompleted")
				: isFailed
					? t("jobFailed")
					: t("noActiveJob");

	const statusVariant = isFailed
		? "error"
		: isCompleted
			? "success"
			: hasActiveJob
				? "info"
				: null;

	const handleStartReindex = () => {
		setShowConfirm(true);
	};

	const handleConfirm = () => {
		reindexMutation.mutate({
			organizationId,
			slug: indexSlug,
		});
	};

	const handleReset = () => {
		setTrackedJobId(null);
	};

	return (
		<>
			{/* Confirmation dialog */}
			<Dialog open={showConfirm} onOpenChange={setShowConfirm}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("confirmTitle")}</DialogTitle>
						<DialogDescription>{t("confirmDescription")}</DialogDescription>
					</DialogHeader>

					{showAdvanced && (
						<div className="space-y-3 p-4 rounded-lg border">
							<p className="text-sm font-medium">{t("advancedOptions")}</p>
							<div className="gap-2 flex items-center">
								<Checkbox
									id="detect-schema"
									checked={detectSchema}
									onCheckedChange={(checked) => setDetectSchema(checked === true)}
								/>
								<Label htmlFor="detect-schema">{t("detectSchema")}</Label>
							</div>
							<div className="gap-2 flex items-center">
								<Checkbox
									id="regenerate-embeddings"
									checked={regenerateEmbeddings}
									onCheckedChange={(checked) =>
										setRegenerateEmbeddings(checked === true)
									}
								/>
								<Label htmlFor="regenerate-embeddings">
									{t("regenerateEmbeddings")}
								</Label>
							</div>
							<div className="gap-2 text-sm flex items-center text-muted-foreground">
								<InfoIcon className="size-3.5 shrink-0" />
								<span>{t("aliasSwap")}</span>
							</div>
						</div>
					)}

					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="outline"
							onClick={() => setShowConfirm(false)}
							disabled={reindexMutation.isPending}
						>
							{t("cancel")}
						</Button>
						<Button
							variant="primary"
							onClick={handleConfirm}
							loading={reindexMutation.isPending}
						>
							{t("confirm")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Main panel */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>{t("title")}</span>
						{!hasActiveJob && !trackedJobId && (
							<Button
								variant="primary"
								size="sm"
								onClick={handleStartReindex}
								disabled={reindexMutation.isPending}
							>
								<RotateCcwIcon className="mr-1.5 size-4" />
								{t("startReindex")}
							</Button>
						)}
						{hasActiveJob && <Badge status={statusVariant}>{statusText}</Badge>}
						{isCompleted && (
							<Button variant="outline" size="sm" onClick={handleReset}>
								<RefreshCwIcon className="mr-1.5 size-4" />
								{t("startReindex")}
							</Button>
						)}
						{isFailed && (
							<Button variant="primary" size="sm" onClick={handleStartReindex}>
								<RotateCcwIcon className="mr-1.5 size-4" />
								{t("startReindex")}
							</Button>
						)}
					</CardTitle>
					<CardDescription>{t("description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Status display */}
					<div className="gap-2 flex items-center">
						<Badge status={statusVariant}>{statusText}</Badge>
					</div>

					{/* Progress bar */}
					{hasActiveJob && (
						<div className="space-y-2">
							<Progress value={progressPct} className="h-2" />
							<p className="text-xs text-muted-foreground">
								{t("jobRunning", {
									processed: format.number(processed),
									total: format.number(total),
								})}
							</p>
						</div>
					)}

					{/* Completed details */}
					{isCompleted && jobStatus && (
						<div className="space-y-1 text-sm">
							<p className="text-muted-foreground">
								{t("jobRunning", {
									processed: format.number(processed),
									total: format.number(total),
								})}
							</p>
							{jobStatus.finishedAt && (
								<p className="text-xs text-muted-foreground">
									{format.relativeTime(new Date(jobStatus.finishedAt))}
								</p>
							)}
						</div>
					)}

					{/* Error display */}
					{isFailed && reindexMutation.error && (
						<div className="gap-2 text-sm flex items-start text-destructive">
							<AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
							<p>{reindexMutation.error.message || t("errorSchemaRequired")}</p>
						</div>
					)}

					{/* Advanced options toggle (idle state only) */}
					{!hasActiveJob && !trackedJobId && (
						<div className="space-y-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowAdvanced(!showAdvanced)}
								className="text-xs text-muted-foreground"
							>
								{t("advancedOptions")}
							</Button>
							{showAdvanced && (
								<div className="space-y-2 p-3 rounded-lg border">
									<div className="gap-2 flex items-center">
										<Checkbox
											id="detect-schema-panel"
											checked={detectSchema}
											onCheckedChange={(checked) =>
												setDetectSchema(checked === true)
											}
										/>
										<div className="gap-1 flex items-center">
											<Label htmlFor="detect-schema-panel">
												{t("detectSchema")}
											</Label>
											<Tooltip>
												<TooltipTrigger asChild>
													<InfoIcon className="size-3.5 text-muted-foreground" />
												</TooltipTrigger>
												<TooltipContent>
													Automatically detect and apply schema changes
												</TooltipContent>
											</Tooltip>
										</div>
									</div>
									<div className="gap-2 flex items-center">
										<Checkbox
											id="regenerate-embeddings-panel"
											checked={regenerateEmbeddings}
											onCheckedChange={(checked) =>
												setRegenerateEmbeddings(checked === true)
											}
										/>
										<div className="gap-1 flex items-center">
											<Label htmlFor="regenerate-embeddings-panel">
												{t("regenerateEmbeddings")}
											</Label>
											<Tooltip>
												<TooltipTrigger asChild>
													<InfoIcon className="size-3.5 text-muted-foreground" />
												</TooltipTrigger>
												<TooltipContent>
													Recompute vector embeddings for all documents
												</TooltipContent>
											</Tooltip>
										</div>
									</div>
									<div className="gap-2 text-sm flex items-center text-muted-foreground">
										<InfoIcon className="size-3.5 shrink-0" />
										<span>{t("aliasSwap")}</span>
									</div>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</>
	);
}
