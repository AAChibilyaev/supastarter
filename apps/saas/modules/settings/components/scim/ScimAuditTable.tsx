"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@repo/ui/components/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const ACTION_FILTERS = [
	{ value: "", label: "All Actions" },
	{ value: "config_created", label: "Config Created" },
	{ value: "config_updated", label: "Config Updated" },
	{ value: "config_deleted", label: "Config Deleted" },
	{ value: "token_regenerated", label: "Token Regenerated" },
	{ value: "test_connection", label: "Test Connection" },
	{ value: "sync_started", label: "Sync Started" },
	{ value: "sync_completed", label: "Sync Completed" },
	{ value: "sync_failed", label: "Sync Failed" },
	{ value: "user_provisioned", label: "User Provisioned" },
	{ value: "user_deprovisioned", label: "User Deprovisioned" },
	{ value: "group_provisioned", label: "Group Provisioned" },
] as const;

interface AuditLogEntry {
	id: string;
	organizationId: string;
	action: string;
	target: string | null;
	success: boolean;
	details: string | null;
	performedBy: string | null;
	createdAt: string;
}

interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

interface ScimAuditTableProps {
	organizationId: string;
}

const ACTION_LABELS: Record<string, string> = {
	config_created: "Config Created",
	config_updated: "Config Updated",
	config_deleted: "Config Deleted",
	token_regenerated: "Token Regenerated",
	test_connection: "Test Connection",
	sync_started: "Sync Started",
	sync_completed: "Sync Completed",
	sync_failed: "Sync Failed",
	user_provisioned: "User Provisioned",
	user_deprovisioned: "User Deprovisioned",
	group_provisioned: "Group Provisioned",
};

export function ScimAuditTable({ organizationId }: ScimAuditTableProps) {
	const t = useTranslations();
	const [logs, setLogs] = useState<AuditLogEntry[]>([]);
	const [pagination, setPagination] = useState<PaginationInfo>({
		page: 1,
		limit: 20,
		total: 0,
		totalPages: 0,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [actionFilter, setActionFilter] = useState("");

	const fetchLogs = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const params = new URLSearchParams({
				page: String(pagination.page),
				limit: String(pagination.limit),
			});
			if (actionFilter) {
				params.set("action", actionFilter);
			}

			const response = await fetch(
				`/api/scim/config/${organizationId}/logs?${params.toString()}`,
				{ credentials: "include" },
			);

			if (!response.ok) {
				throw new Error("Failed to load audit logs");
			}

			const data = await response.json();
			setLogs(data.logs);
			setPagination(data.pagination);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load logs");
		} finally {
			setIsLoading(false);
		}
	}, [organizationId, pagination.page, pagination.limit, actionFilter]);

	useEffect(() => {
		void fetchLogs();
	}, [fetchLogs]);

	const formatDate = (iso: string) => {
		try {
			return new Date(iso).toLocaleString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return iso;
		}
	};

	const getActionLabel = (action: string): string => {
		return (
			ACTION_LABELS[action] ??
			action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
		);
	};

	const handlePageChange = (page: number) => {
		setPagination((prev) => ({ ...prev, page }));
	};

	const handleExport = () => {
		const params = new URLSearchParams();
		if (actionFilter) {
			params.set("action", actionFilter);
		}
		const queryString = params.toString();
		window.open(
			`/api/scim/config/${organizationId}/logs/export${queryString ? `?${queryString}` : ""}`,
			"_blank",
		);
	};

	const pageNumbers: number[] = [];
	if (pagination.totalPages <= 7) {
		for (let i = 1; i <= pagination.totalPages; i++) {
			pageNumbers.push(i);
		}
	} else {
		pageNumbers.push(1);
		if (pagination.page > 3) pageNumbers.push(-1);
		const start = Math.max(2, pagination.page - 1);
		const end = Math.min(pagination.totalPages - 1, pagination.page + 1);
		for (let i = start; i <= end; i++) {
			pageNumbers.push(i);
		}
		if (pagination.page < pagination.totalPages - 2) pageNumbers.push(-1);
		pageNumbers.push(pagination.totalPages);
	}

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="gap-3 flex flex-wrap items-center">
				<div className="gap-2 flex items-center">
					<p className="text-sm text-muted-foreground">Filter by Action</p>
					<Select
						value={actionFilter}
						onValueChange={(value) => {
							setActionFilter(value);
							setPagination((prev) => ({ ...prev, page: 1 }));
						}}
					>
						<SelectTrigger className="w-44">
							<SelectValue placeholder="All Actions" />
						</SelectTrigger>
						<SelectContent>
							{ACTION_FILTERS.map((action) => (
								<SelectItem key={action.value} value={action.value}>
									{action.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="ml-auto">
					<Button variant="outline" size="sm" onClick={handleExport}>
						{t("settings.scim.logs.exportCsv")}
					</Button>
				</div>
			</div>

			{/* Table */}
			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("settings.scim.logs.timestamp")}</TableHead>
							<TableHead>{t("settings.scim.logs.action")}</TableHead>
							<TableHead>Target</TableHead>
							<TableHead>Result</TableHead>
							<TableHead>Details</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="py-8 text-sm text-center text-muted-foreground"
								>
									{t("common.loading")}
								</TableCell>
							</TableRow>
						) : error ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="py-8 text-sm text-center text-destructive"
								>
									{error}
								</TableCell>
							</TableRow>
						) : logs.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="py-8 text-sm text-center text-muted-foreground"
								>
									{t("scim.logs.noLogs")}
								</TableCell>
							</TableRow>
						) : (
							logs.map((log) => (
								<TableRow key={log.id}>
									<TableCell className="text-sm whitespace-nowrap text-foreground/60">
										{formatDate(log.createdAt)}
									</TableCell>
									<TableCell className="text-sm">
										{getActionLabel(log.action)}
									</TableCell>
									<TableCell className="text-sm text-foreground/60">
										{log.target ?? "—"}
									</TableCell>
									<TableCell>
										<Badge status={log.success ? "success" : "error"}>
											{log.success ? "Success" : "Failed"}
										</Badge>
									</TableCell>
									<TableCell className="text-sm max-w-[200px] truncate text-foreground/60">
										{log.details ?? "—"}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{pagination.totalPages > 1 && (
				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
								className={
									pagination.page <= 1
										? "pointer-events-none opacity-50"
										: "cursor-pointer"
								}
							/>
						</PaginationItem>
						{pageNumbers.map((pageNum, idx) =>
							pageNum === -1 ? (
								<PaginationItem key={`ellipsis-${idx}`}>
									<span className="px-2 text-muted-foreground">...</span>
								</PaginationItem>
							) : (
								<PaginationItem key={pageNum}>
									<PaginationLink
										isActive={pageNum === pagination.page}
										onClick={() => handlePageChange(pageNum)}
										className="cursor-pointer"
									>
										{pageNum}
									</PaginationLink>
								</PaginationItem>
							),
						)}
						<PaginationItem>
							<PaginationNext
								onClick={() =>
									handlePageChange(
										Math.min(pagination.totalPages, pagination.page + 1),
									)
								}
								className={
									pagination.page >= pagination.totalPages
										? "pointer-events-none opacity-50"
										: "cursor-pointer"
								}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}
		</div>
	);
}
