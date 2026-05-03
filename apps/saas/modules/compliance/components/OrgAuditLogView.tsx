"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { toastError, toastSuccess } from "@repo/ui/components/tooltip";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	DownloadIcon,
	HistoryIcon,
	SearchXIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormatter } from "next-intl";
import { useCallback, useState } from "react";

import { EmptyState } from "../../search/components/cards/EmptyState";

interface OrgAuditLogViewProps {
	organizationId: string;
}

const PAGE_SIZE = 50;

function ActionBadge({ action }: { action: string }) {
	const variant: Record<string, "info" | "warning" | "success" | "error" | "default"> = {
		create_index: "success",
		delete_index: "error",
		create_api_key: "info",
		revoke_api_key: "warning",
		add_member: "success",
		remove_member: "error",
		change_member_role: "warning",
		run_reindex: "info",
		update_schema: "warning",
		update_synonyms: "info",
		update_curations: "info",
		update_rules: "info",
		change_plan: "warning",
		create_connector: "success",
		delete_connector: "error",
		create_webhook: "success",
		delete_webhook: "error",
		update_widget: "info",
		delete_widget: "error",
		update_settings: "warning",
	};

	return (
		<Badge status={variant[action] ?? "default"} className="font-mono text-xs">
			{action.replace(/_/g, " ")}
		</Badge>
	);
}

export function OrgAuditLogView({ organizationId }: OrgAuditLogViewProps) {
	const t = useTranslations("settings");
	const format = useFormatter();

	const [page, setPage] = useState(0);
	const [filterAction, setFilterAction] = useState("");
	const [filterUser, setFilterUser] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [exportDialogOpen, setExportDialogOpen] = useState(false);
	const [exportDateFrom, setExportDateFrom] = useState("");
	const [exportDateTo, setExportDateTo] = useState("");

	// ── Fetch audit log entries ──

	const queryInput = {
		organizationId,
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
		action: filterAction || undefined,
		...(filterUser ? { userId: filterUser } : {}),
		...(dateFrom ? { dateFrom } : {}),
		...(dateTo ? { dateTo } : {}),
	};

	const { data, isLoading, isError } = useQuery(
		orpc.auditLog.listAuditLogs.queryOptions({
			input: queryInput,
			enabled: !!organizationId,
		}),
	);

	// ── Fetch available action types ──

	const { data: actionsData } = useQuery(
		orpc.auditLog.listAuditActions.queryOptions({
			input: {},
			enabled: !!organizationId,
		}),
	);

	const actions = actionsData?.actions ?? [];

	// ── Fetch org members for user filter ──

	const { data: membersData } = useQuery(
		orpc.organizations.listMembers.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	const members =
		(membersData as Array<{ id: string; name: string | null; email: string }>) ?? [];

	// ── CSV export ──

	const handleExport = useCallback(async () => {
		try {
			const exportInput = {
				organizationId,
				limit: 10000,
				offset: 0,
				action: filterAction || undefined,
				...(filterUser ? { userId: filterUser } : {}),
				...(exportDateFrom ? { dateFrom: exportDateFrom } : {}),
				...(exportDateTo ? { dateTo: exportDateTo } : {}),
			};

			const result = await orpc.auditLog.exportAuditLogs.call(exportInput);

			// Trigger download
			const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toastSuccess(
				t("auditLog.exportSuccess", { count: result.exported }) ?? "Export complete",
			);
			setExportDialogOpen(false);
		} catch (err) {
			toastError(
				err instanceof Error ? err.message : (t("auditLog.exportError") ?? "Export failed"),
			);
		}
	}, [organizationId, filterAction, filterUser, exportDateFrom, exportDateTo, t]);

	const entries = data?.entries ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	return (
		<div className="space-y-6">
			{/* Filters */}
			<Card>
				<CardContent className="p-4">
					<div className="gap-3 flex flex-wrap items-end">
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								{t("auditLog.filterAction") ?? "Action"}
							</Label>
							<Select value={filterAction} onValueChange={setFilterAction}>
								<SelectTrigger className="w-44">
									<SelectValue
										placeholder={t("auditLog.allActions") ?? "All actions"}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">
										{t("auditLog.allActions") ?? "All actions"}
									</SelectItem>
									{actions.map((act) => (
										<SelectItem key={act} value={act}>
											{act.replace(/_/g, " ")}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								{t("auditLog.filterUser") ?? "User"}
							</Label>
							<Select value={filterUser} onValueChange={setFilterUser}>
								<SelectTrigger className="w-44">
									<SelectValue
										placeholder={t("auditLog.allUsers") ?? "All users"}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">
										{t("auditLog.allUsers") ?? "All users"}
									</SelectItem>
									{members.map((m) => (
										<SelectItem key={m.id} value={m.id}>
											{m.name ?? m.email}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								{t("auditLog.dateFrom") ?? "From"}
							</Label>
							<Input
								type="date"
								value={dateFrom}
								onChange={(e) => {
									setDateFrom(e.target.value);
									setPage(0);
								}}
								className="w-40"
							/>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								{t("auditLog.dateTo") ?? "To"}
							</Label>
							<Input
								type="date"
								value={dateTo}
								onChange={(e) => {
									setDateTo(e.target.value);
									setPage(0);
								}}
								className="w-40"
							/>
						</div>

						<div className="gap-2 flex items-center">
							{(filterAction || filterUser || dateFrom || dateTo) && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setFilterAction("");
										setFilterUser("");
										setDateFrom("");
										setDateTo("");
										setPage(0);
									}}
								>
									{t("auditLog.clearFilters") ?? "Clear"}
								</Button>
							)}

							<Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
								<DialogTrigger asChild>
									<Button variant="outline" size="sm">
										<DownloadIcon className="mr-2 h-4 w-4" />
										{t("auditLog.exportCsv") ?? "Export CSV"}
									</Button>
								</DialogTrigger>
								<DialogContent className="max-w-sm">
									<DialogHeader>
										<DialogTitle>
											{t("auditLog.exportDialogTitle") ?? "Export Audit Log"}
										</DialogTitle>
										<DialogDescription>
											{t("auditLog.exportDialogDesc") ??
												"Filter by date range (optional) and download."}
										</DialogDescription>
									</DialogHeader>
									<div className="space-y-4">
										<div className="space-y-1.5">
											<Label>{t("auditLog.dateFrom") ?? "From"}</Label>
											<Input
												type="date"
												value={exportDateFrom}
												onChange={(e) => setExportDateFrom(e.target.value)}
											/>
										</div>
										<div className="space-y-1.5">
											<Label>{t("auditLog.dateTo") ?? "To"}</Label>
											<Input
												type="date"
												value={exportDateTo}
												onChange={(e) => setExportDateTo(e.target.value)}
											/>
										</div>
									</div>
									<DialogFooter>
										<Button
											variant="outline"
											onClick={() => setExportDialogOpen(false)}
										>
											{t("auditLog.cancel") ?? "Cancel"}
										</Button>
										<Button onClick={handleExport}>
											<DownloadIcon className="mr-2 h-4 w-4" />
											{t("auditLog.download") ?? "Download"}
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Audit log table */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base">
						{t("auditLog.title") ?? "Audit Log"}
					</CardTitle>
					{total > 0 && (
						<span className="text-sm text-muted-foreground tabular-nums">
							{total} {t("auditLog.entries") ?? "entries"}
						</span>
					)}
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="space-y-2">
							{Array.from({ length: 8 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : isError ? (
						<EmptyState
							icon={<HistoryIcon className="h-8 w-8" />}
							description={t("auditLog.loadError") ?? "Failed to load audit log."}
						/>
					) : entries.length === 0 ? (
						<EmptyState
							icon={<SearchXIcon className="h-8 w-8" />}
							description={
								t("auditLog.empty") ??
								"No audit log entries match the current filters."
							}
						/>
					) : (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-40">
											{t("auditLog.date") ?? "Date"}
										</TableHead>
										<TableHead>{t("auditLog.user") ?? "User"}</TableHead>
										<TableHead className="w-44">
											{t("auditLog.action") ?? "Action"}
										</TableHead>
										<TableHead>{t("auditLog.target") ?? "Target"}</TableHead>
										<TableHead>{t("auditLog.details") ?? "Details"}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{entries.map((entry) => (
										<TableRow key={entry.id}>
											<TableCell className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
												{format.dateTime(new Date(entry.createdAt), {
													year: "numeric",
													month: "short",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</TableCell>
											<TableCell>
												<div className="gap-2 flex items-center">
													<div className="flex flex-col">
														<span className="text-sm font-medium">
															{entry.user.name ?? entry.user.email}
														</span>
														{entry.user.name && (
															<span className="text-xs text-muted-foreground">
																{entry.user.email}
															</span>
														)}
													</div>
												</div>
											</TableCell>
											<TableCell>
												<ActionBadge action={entry.action} />
											</TableCell>
											<TableCell className="text-sm">
												{entry.targetType ? (
													<span className="font-mono text-xs">
														{entry.targetType}
														{entry.targetId
															? `:${entry.targetId.slice(0, 12)}`
															: ""}
													</span>
												) : (
													<span className="text-xs text-muted-foreground">
														—
													</span>
												)}
											</TableCell>
											<TableCell className="max-w-[200px]">
												{entry.details ? (
													<span className="text-xs block truncate text-muted-foreground">
														{typeof entry.details === "object"
															? JSON.stringify(entry.details).slice(
																	0,
																	80,
																)
															: String(entry.details).slice(0, 80)}
													</span>
												) : (
													<span className="text-xs text-muted-foreground">
														—
													</span>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<span className="text-sm text-muted-foreground tabular-nums">
								{t("auditLog.page") ?? "Page"} {page + 1} {t("auditLog.of") ?? "of"}{" "}
								{totalPages}
							</span>
							<div className="gap-2 flex items-center">
								<Button
									variant="outline"
									size="sm"
									disabled={page === 0}
									onClick={() => setPage((p) => Math.max(0, p - 1))}
								>
									<ChevronLeftIcon className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={page >= totalPages - 1}
									onClick={() => setPage((p) => p + 1)}
								>
									<ChevronRightIcon className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
