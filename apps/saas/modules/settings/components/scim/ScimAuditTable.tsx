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

const ACTIONS = [
	{ value: "", label: "allActions" },
	{ value: "config_created", label: "configCreated" },
	{ value: "config_updated", label: "configUpdated" },
	{ value: "config_deleted", label: "configDeleted" },
	{ value: "token_regenerated", label: "tokenRegenerated" },
	{ value: "test_connection", label: "testConnection" },
	{ value: "sync_started", label: "syncStarted" },
	{ value: "sync_completed", label: "syncCompleted" },
	{ value: "sync_failed", label: "syncFailed" },
	{ value: "user_provisioned", label: "userProvisioned" },
	{ value: "user_deprovisioned", label: "userDeprovisioned" },
	{ value: "group_provisioned", label: "groupProvisioned" },
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

const ACTION_LABEL_KEYS: Record<string, string> = {
	config_created: "scim.logs.actionConfigCreated",
	config_updated: "scim.logs.actionConfigUpdated",
	config_deleted: "scim.logs.actionConfigDeleted",
	token_regenerated: "scim.logs.actionTokenRegenerated",
	test_connection: "scim.logs.actionTestConnection",
	sync_started: "scim.logs.actionSyncStarted",
	sync_completed: "scim.logs.actionSyncCompleted",
	sync_failed: "scim.logs.actionSyncFailed",
	user_provisioned: "scim.logs.actionUserProvisioned",
	user_deprovisioned: "scim.logs.actionUserDeprovisioned",
	group_provisioned: "scim.logs.actionGroupProvisioned",
};

export function ScimAuditTable({ organizationId }: ScimAuditTableProps) {
	const t = useTranslations("settings");
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
		fetchLogs();
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
		const key = ACTION_LABEL_KEYS[action] ?? action;
		try {
			return t(key);
		} catch {
			// Fallback: humanize the action name
			return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
		}
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
					<p className="text-sm text-muted-foreground">{t("scim.logs.filterAction")}</p>
					<Select
						value={actionFilter}
						onValueChange={(value) => {
							setActionFilter(value);
							setPagination((prev) => ({ ...prev, page: 1 }));
						}}
					>
						<SelectTrigger className="w-44">
							<SelectValue placeholder={t("scim.logs.allActions")} />
						</SelectTrigger>
						<SelectContent>
							{ACTIONS.map((action) => (
								<SelectItem key={action.value} value={action.value}>
									{t(`scim.logs.${action.label}`)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="ml-auto">
					<Button variant="outline" size="sm" onClick={handleExport}>
						{t("scim.logs.exportCsv")}
					</Button>
				</div>
			</div>

			{/* Table */}
			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("scim.logs.timestamp")}</TableHead>
							<TableHead>{t("scim.logs.action")}</TableHead>
							<TableHead>{t("scim.logs.target")}</TableHead>
							<TableHead>{t("scim.logs.result")}</TableHead>
							<TableHead>{t("scim.logs.details")}</TableHead>
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
									{t("scim.logs.empty")}
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
