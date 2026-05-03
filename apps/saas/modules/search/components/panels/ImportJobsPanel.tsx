"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	ClockIcon,
	ListIcon,
	Loader2,
	RotateCw,
	UploadCloud,
	XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";

import { ingestJobStatusBadge } from "../../lib/job-status";
import { KanbanBoard } from "../blocks/KanbanBoard";
import type { KanbanColumn } from "../blocks/KanbanBoard";
import { EmptyState } from "../cards/EmptyState";

// ─── File-import helpers ────────────────────────────────────────────────────

const IMPORT_BATCH_SIZE = 200;
const IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function chunkArray<T>(arr: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
	return result;
}

function parseCsvLine(line: string): string[] {
	const result: string[] = [];
	let field = "";
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') {
				field += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (ch === "," && !inQuotes) {
			result.push(field);
			field = "";
		} else {
			field += ch;
		}
	}
	result.push(field);
	return result;
}

function parseCsvDocuments(text: string): Record<string, unknown>[] {
	const lines = text
		.split("\n")
		.map((l) => l.trimEnd())
		.filter((l) => l.length > 0);
	if (lines.length < 2) throw new Error("csv_no_header");
	const headers = parseCsvLine(lines[0]).map((h) => h.trim());
	return lines.slice(1).map((line) => {
		const values = parseCsvLine(line);
		return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
	});
}

function parseJsonDocuments(text: string): Record<string, unknown>[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error("invalid_json");
	}
	if (!Array.isArray(parsed)) throw new Error("json_not_array");
	for (const doc of parsed as unknown[]) {
		if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
			throw new Error("json_not_objects");
		}
	}
	return parsed as Record<string, unknown>[];
}

// ─── FileImportZone ────────────────────────────────────────────────────────

type ImportPhase =
	| { phase: "idle" }
	| { phase: "parsing" }
	| { phase: "uploading"; current: number; total: number; errors: string[] }
	| { phase: "done"; queued: number; errors: string[] }
	| { phase: "error"; message: string };

interface FileImportZoneProps {
	organizationId: string;
	slug: string;
	onImportComplete: () => void;
}

function FileImportZone({ organizationId, slug, onImportComplete }: FileImportZoneProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [state, setState] = useState<ImportPhase>({ phase: "idle" });

	const importMutation = useMutation(orpc.search.importDocuments.mutationOptions());

	const processFile = async (file: File) => {
		if (file.size > IMPORT_MAX_FILE_BYTES) {
			setState({ phase: "error", message: t("search.importJobs.upload.errorFileSize") });
			return;
		}
		const lower = file.name.toLowerCase();
		const isJson = lower.endsWith(".json");
		const isCsv = lower.endsWith(".csv");
		if (!isJson && !isCsv) {
			setState({ phase: "error", message: t("search.importJobs.upload.errorFileType") });
			return;
		}

		setState({ phase: "parsing" });

		let documents: Record<string, unknown>[];
		try {
			const text = await file.text();
			documents = isJson ? parseJsonDocuments(text) : parseCsvDocuments(text);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "";
			const translated =
				msg === "csv_no_header"
					? t("search.importJobs.upload.errorInvalidCsv")
					: t("search.importJobs.upload.errorInvalidJson");
			setState({ phase: "error", message: translated });
			return;
		}

		const batches = chunkArray(documents, IMPORT_BATCH_SIZE);
		const errors: string[] = [];
		let queued = 0;

		for (let i = 0; i < batches.length; i++) {
			setState({
				phase: "uploading",
				current: i + 1,
				total: batches.length,
				errors: [...errors],
			});
			try {
				const result = await importMutation.mutateAsync({
					organizationId,
					slug,
					documents: batches[i],
				});
				queued += result.queued;
			} catch (err) {
				const errMsg = err instanceof Error ? err.message : "Unknown error";
				errors.push(t("search.importJobs.upload.batchFailed", { n: i + 1, error: errMsg }));
			}
		}

		setState({ phase: "done", queued, errors });
		void queryClient.invalidateQueries({ queryKey: orpc.search.importJobs.key() });
		onImportComplete();
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop: (accepted) => {
			const file = accepted[0];
			if (file) void processFile(file);
		},
		accept: {
			"application/json": [".json"],
			"text/csv": [".csv"],
			"text/plain": [".csv"],
		},
		multiple: false,
		maxSize: IMPORT_MAX_FILE_BYTES,
		onDropRejected: (rejections) => {
			const isSize = rejections.some((r) =>
				r.errors.some((e) => e.code === "file-too-large"),
			);
			setState({
				phase: "error",
				message: isSize
					? t("search.importJobs.upload.errorFileSize")
					: t("search.importJobs.upload.errorFileType"),
			});
		},
		disabled: state.phase === "parsing" || state.phase === "uploading",
	});

	if (state.phase === "done") {
		return (
			<Card className="border-success/30 bg-success/5">
				<CardContent className="gap-3 p-4 flex flex-col items-center">
					<CheckCircle2 className="size-8 text-success" />
					<p className="text-sm font-medium">
						{t("search.importJobs.upload.success", { count: state.queued })}
					</p>
					{state.errors.length > 0 && (
						<div className="space-y-1 w-full">
							{state.errors.map((e, i) => (
								<p key={i} className="text-xs text-destructive">
									{e}
								</p>
							))}
						</div>
					)}
					<Button variant="outline" size="sm" onClick={() => setState({ phase: "idle" })}>
						{t("search.importJobs.upload.title")}
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (state.phase === "uploading") {
		const pct = Math.round((state.current / state.total) * 100);
		return (
			<Card>
				<CardContent className="p-4 space-y-3">
					<p className="text-sm text-foreground/60">
						{t("search.importJobs.upload.batching", {
							current: state.current,
							total: state.total,
						})}
					</p>
					<Progress value={pct} className="h-2" />
					{state.errors.length > 0 && (
						<div className="space-y-1">
							{state.errors.map((e, i) => (
								<p key={i} className="text-xs text-destructive">
									{e}
								</p>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		);
	}

	if (state.phase === "parsing") {
		return (
			<Card>
				<CardContent className="gap-2 p-4 flex items-center justify-center">
					<Loader2 className="size-4 animate-spin text-foreground/60" />
					<p className="text-sm text-foreground/60">
						{t("search.importJobs.upload.parsing")}
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-2">
			<div
				{...getRootProps()}
				className={`gap-3 px-6 py-8 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
					isDragActive
						? "border-primary bg-primary/5"
						: "border-border hover:border-primary/50 hover:bg-muted/30"
				}`}
			>
				<input {...getInputProps()} />
				<UploadCloud
					className={`size-8 ${isDragActive ? "text-primary" : "text-foreground/40"}`}
				/>
				<div className="text-center">
					<p className="text-sm font-medium">{t("search.importJobs.upload.dropzone")}</p>
					<p className="mt-1 text-xs text-foreground/50">
						{t("search.importJobs.upload.fileTypes")}
					</p>
				</div>
			</div>
			{state.phase === "error" && (
				<div className="gap-2 p-3 text-sm flex items-center rounded-md bg-destructive/10 text-destructive">
					<AlertCircle className="size-4 shrink-0" />
					{state.message}
				</div>
			)}
		</div>
	);
}

// ─── ImportJobsPanel ────────────────────────────────────────────────────────

interface ImportJobsPanelProps {
	organizationId: string;
	slug?: string;
}

type ViewMode = "timeline" | "table" | "kanban";

function formatDuration(startedAt: string, finishedAt: string | null): string {
	if (!finishedAt) return "\u2014";
	try {
		const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
		return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
	} catch {
		return "\u2014";
	}
}

function formatTime(iso: string | undefined | null): string {
	if (!iso) return "\u2014";
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return "\u2014";
	}
}

function getStatusIcon(status: string) {
	switch (status) {
		case "completed":
			return CheckCircle2;
		case "failed":
			return XCircle;
		case "processing":
			return Loader2;
		case "pending":
			return ClockIcon;
		default:
			return ClockIcon;
	}
}

function getStatusColor(status: string): string {
	switch (status) {
		case "completed":
			return "text-success";
		case "failed":
			return "text-destructive";
		case "processing":
			return "text-primary";
		case "pending":
			return "text-foreground/60";
		default:
			return "text-muted-foreground";
	}
}

export function ImportJobsPanel({ organizationId, slug }: ImportJobsPanelProps) {
	const t = useTranslations();
	const [view, setView] = useState<ViewMode>("timeline");
	const [retryOpen, setRetryOpen] = useState(false);
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery(
		orpc.search.importJobs.queryOptions({
			input: { organizationId, indexSlug: slug },
			enabled: !!organizationId,
		}),
	);

	const retryMutation = useMutation({
		...orpc.search.retryFailedBatches.mutationOptions(),
		onSuccess: (result) => {
			toastSuccess(t("search.importJobs.retrySuccess", { count: result.retriedCount }));
			void queryClient.invalidateQueries({
				queryKey: orpc.search.importJobs.key(),
			});
		},
		onError: () => {
			toastError(t("search.importJobs.retryError"));
		},
	});

	const kanbanColumns = useMemo<KanbanColumn[]>(() => {
		const currentJobs = data?.jobs ?? [];
		const statuses = ["pending", "processing", "completed", "failed"] as const;
		const grouped = new Map<string, typeof currentJobs>();
		for (const job of currentJobs) {
			const list = grouped.get(job.status) ?? [];
			list.push(job);
			grouped.set(job.status, list);
		}
		return statuses.map((status) => ({
			id: status,
			title: t(`search.importJobs.${status}` as never),
			emptyMessage: t("search.importJobs.empty"),
			items: (grouped.get(status) ?? []).map((job) => ({
				id: job.id,
				title: job.id.slice(0, 12),
				description: job.type ?? undefined,
				badge: {
					label: `${job.processedItems}/${job.totalItems}`,
					status:
						status === "completed" ? "success" : status === "failed" ? "error" : "info",
				} as const,
				meta: job.errorMessage?.slice(0, 60) || formatTime(job.startedAt),
			})),
		}));
	}, [data, t]);

	const jobs = data?.jobs ?? [];
	const summary = data?.summary;

	if (isLoading) {
		return (
			<Card className="p-6 space-y-4">
				<div className="text-foreground/60">{t("search.loading")}</div>
			</Card>
		);
	}

	const succeededCount = summary?.completed ?? 0;
	const failedCount = summary?.failed ?? 0;
	const pendingCount = summary ? summary.pending + summary.processing : 0;
	const totalCount = summary?.total ?? succeededCount + failedCount + pendingCount;
	const successRate = totalCount > 0 ? Math.round((succeededCount / totalCount) * 100) : 0;

	const retryJobs = jobs.filter((j) => j.status === "failed" || j.status === "pending");

	return (
		<Card className="p-6 space-y-6">
			<div className="sm:flex-row sm:items-center sm:justify-between gap-4 flex flex-col">
				<div>
					<h3 className="text-lg font-semibold">{t("search.importJobs.title")}</h3>
					<p className="text-sm text-foreground/60">
						{t("search.importJobs.description")}
					</p>
				</div>
				<div className="gap-1 p-0.5 flex items-center self-start rounded-lg bg-muted">
					<Button
						variant={view === "timeline" ? "primary" : "ghost"}
						size="sm"
						onClick={() => setView("timeline")}
					>
						{t("search.importJobs.viewTimeline")}
					</Button>
					<Button
						variant={view === "table" ? "primary" : "ghost"}
						size="sm"
						onClick={() => setView("table")}
					>
						{t("search.importJobs.viewTable")}
					</Button>
					<Button
						variant={view === "kanban" ? "primary" : "ghost"}
						size="sm"
						onClick={() => setView("kanban")}
					>
						<ListIcon className="size-3.5" />
					</Button>
				</div>
			</div>

			{/* File upload zone — only when an index slug is known */}
			{slug && (
				<FileImportZone
					organizationId={organizationId}
					slug={slug}
					onImportComplete={() =>
						void queryClient.invalidateQueries({
							queryKey: orpc.search.importJobs.key(),
						})
					}
				/>
			)}

			{/* Statistics bar */}
			<Card>
				<CardContent className="p-4 space-y-3">
					<div className="text-sm flex items-center justify-between">
						<span className="text-foreground/60">
							{t("search.importJobs.successRate")}
						</span>
						<span className="font-semibold text-success">{successRate}%</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-success transition-all duration-500"
							style={{ width: `${successRate}%` }}
						/>
					</div>
					<div className="gap-4 text-sm flex flex-wrap">
						<div className="gap-1.5 flex items-center">
							<span className="size-2 rounded-full bg-success" />
							<span>
								<strong>{succeededCount}</strong>{" "}
								<span className="text-foreground/60">
									{t("search.importJobs.completed")}
								</span>
							</span>
						</div>
						<div className="gap-1.5 flex items-center">
							<span className="size-2 rounded-full bg-destructive" />
							<span>
								<strong>{failedCount}</strong>{" "}
								<span className="text-foreground/60">
									{t("search.importJobs.failed")}
								</span>
							</span>
						</div>
						<div className="gap-1.5 flex items-center">
							<span className="size-2 rounded-full bg-foreground/30" />
							<span>
								<strong>{pendingCount}</strong>{" "}
								<span className="text-foreground/60">
									{t("search.importJobs.pending")}
								</span>
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Retry queue section */}
			{retryJobs.length > 0 && (
				<Card>
					<button
						type="button"
						className="px-4 py-3 text-sm font-medium flex w-full items-center justify-between transition-colors hover:bg-muted/50"
						onClick={() => setRetryOpen(!retryOpen)}
					>
						<span className="gap-2 flex items-center">
							{t("search.importJobs.retryQueue")}
							<Badge status="warning">{retryJobs.length}</Badge>
						</span>
						{retryOpen ? (
							<ChevronDown className="size-4 text-muted-foreground" />
						) : (
							<ChevronRight className="size-4 text-muted-foreground" />
						)}
					</button>
					{retryOpen && (
						<div className="px-4 py-3 space-y-3 border-t">
							{retryJobs.map((job) => {
								const retryTime =
									job.status === "failed"
										? new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString()
										: null;
								return (
									<div
										key={job.id}
										className="sm:flex-row sm:items-center gap-2 p-3 text-sm flex flex-col justify-between rounded-md bg-muted/30"
									>
										<div className="gap-2 min-w-0 flex items-center">
											<XCircle className="size-4 shrink-0 text-destructive" />
											<span className="font-mono text-xs truncate">
												{job.id}
											</span>
											{job.type && <Badge status="info">{job.type}</Badge>}
										</div>
										<div className="gap-3 text-xs flex items-center text-foreground/60">
											{retryTime && (
												<span>
													{t("search.importJobs.nextRetry")}: {retryTime}
												</span>
											)}
											{job.errorMessage && (
												<span
													className="max-w-[200px] truncate"
													title={job.errorMessage}
												>
													{job.errorMessage}
												</span>
											)}
										</div>
									</div>
								);
							})}
							<div className="gap-2 pt-1 flex">
								<Button
									variant="primary"
									size="sm"
									loading={retryMutation.isPending}
									disabled={retryMutation.isPending || !slug}
									onClick={() => {
										if (!slug) return;
										retryMutation.mutate({ organizationId, slug });
									}}
								>
									<RotateCw className="size-3.5" />
									{t("search.importJobs.retryAll")}
								</Button>
								<Button variant="ghost" size="sm" disabled>
									{t("search.importJobs.clearQueue")}
								</Button>
							</div>
						</div>
					)}
				</Card>
			)}

			{/* Content area */}
			{!jobs || jobs.length === 0 ? (
				<EmptyState
					title={t("search.importJobs.empty")}
					description={t("search.importJobs.emptyDescription")}
					icon={ListIcon}
				/>
			) : view === "timeline" ? (
				/* Timeline view */
				<div className="space-y-3">
					{jobs.map((job) => {
						const EvIcon = getStatusIcon(job.status);
						const failedItems =
							job.status === "failed" && job.totalItems > 0
								? job.totalItems - job.processedItems
								: 0;

						return (
							<Card key={job.id}>
								<CardContent className="p-4 space-y-3">
									{/* Job header */}
									<div className="sm:flex-row sm:items-center gap-2 flex flex-col justify-between">
										<div className="gap-2 min-w-0 flex items-center">
											<EvIcon
												className={`size-4 shrink-0 ${getStatusColor(job.status)}`}
											/>
											<span className="font-mono text-xs truncate">
												{job.id}
											</span>
											<Badge
												status={ingestJobStatusBadge[job.status] ?? "info"}
											>
												{job.status}
											</Badge>
											{job.type && (
												<span className="text-xs sm:inline hidden text-muted-foreground">
													{job.type}
												</span>
											)}
										</div>
										<div className="gap-3 text-xs flex items-center text-foreground/60">
											<span>{formatTime(job.startedAt)}</span>
											<span className="font-mono">
												{formatDuration(job.startedAt, job.finishedAt)}
											</span>
										</div>
									</div>

									{/* Progress row */}
									{job.totalItems > 0 && (
										<div className="gap-4 text-xs flex items-center text-foreground/60">
											<span>
												{t("search.importJobs.tableProgress")}:{" "}
												<span className="font-semibold text-success">
													{job.processedItems}
												</span>
												/{job.totalItems}
											</span>
											{failedItems > 0 && (
												<span>
													{t("search.importJobs.failed")}:{" "}
													<span className="font-semibold text-destructive">
														{failedItems}
													</span>
												</span>
											)}
										</div>
									)}

									{/* Error message */}
									{job.errorMessage && (
										<div className="gap-2 text-xs p-2 flex items-start rounded-md bg-destructive/10 dark:bg-destructive/20">
											<XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
											<span className="text-destructive">
												{job.errorMessage}
											</span>
										</div>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			) : view === "table" ? (
				/* Table view */
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("search.importJobs.tableJobId")}</TableHead>
								<TableHead>{t("search.importJobs.tableType")}</TableHead>
								<TableHead>{t("search.importJobs.tableStatus")}</TableHead>
								<TableHead>{t("search.importJobs.tableProgress")}</TableHead>
								<TableHead>{t("search.importJobs.tableErrors")}</TableHead>
								<TableHead>{t("search.importJobs.tableTime")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{jobs.map((job) => (
								<TableRow key={job.id}>
									<TableCell className="font-mono text-xs max-w-[200px] truncate">
										{job.id}
									</TableCell>
									<TableCell className="text-xs">{job.type}</TableCell>
									<TableCell>
										<Badge status={ingestJobStatusBadge[job.status] ?? "info"}>
											{job.status}
										</Badge>
									</TableCell>
									<TableCell className="text-xs">
										{job.processedItems}/{job.totalItems}
									</TableCell>
									<TableCell className="text-xs max-w-[150px] truncate">
										{job.errorMessage ?? "\u2014"}
									</TableCell>
									<TableCell className="text-xs whitespace-nowrap">
										{formatTime(job.startedAt)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : (
				/* Kanban view */
				<KanbanBoard columns={kanbanColumns} />
			)}
		</Card>
	);
}
