"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Download, RefreshCw, XCircle } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────

export interface ReindexError {
	row: number;
	documentId: string;
	reason: string;
	field?: string;
}

interface ErrorListProps {
	errors: ReindexError[];
	jobId: string;
	onRetry: (errorIds: string[]) => void;
	onIgnore: (errorIds: string[]) => void;
	isRetrying?: boolean;
}

// ── Main component ───────────────────────────────────────────────

export function ErrorList({ errors, jobId, onRetry, onIgnore, isRetrying }: ErrorListProps) {
	if (errors.length === 0) return null;

	const handleDownloadLog = () => {
		const headers = ["Row", "Document ID", "Field", "Reason"];
		const rows = errors.map((e) => [String(e.row), e.documentId, e.field ?? "\u2014", e.reason]);
		const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `reindex-errors-${jobId}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const allErrorIds = errors.map((_, i) => `${jobId}-${i}`);

	return (
		<Card className="border-destructive/30">
			<CardHeader className="pb-3">
				<div className="gap-2 sm:flex-row sm:items-center sm:justify-between flex flex-col">
					<div className="gap-2 flex items-center">
						<XCircle className="size-5 text-destructive" />
						<CardTitle className="text-base">
							{errors.length} document{errors.length !== 1 ? "s" : ""} failed to process
						</CardTitle>
					</div>
					<div className="gap-2 flex flex-wrap">
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() => onRetry(allErrorIds)}
							disabled={isRetrying}
						>
							<RefreshCw className="size-3.5" />
							Retry all
						</Button>
						<Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadLog}>
							<Download className="size-3.5" />
							Download log
						</Button>
						<Button variant="ghost" size="sm" onClick={() => onIgnore(allErrorIds)}>
							Ignore all
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="p-0">
				<div className="max-h-64 overflow-y-auto">
					<table className="text-sm w-full">
						<thead className="top-0 sticky bg-card">
							<tr className="border-b border-border">
								<th className="px-4 py-2 font-medium text-xs text-left text-muted-foreground">
									Row
								</th>
								<th className="px-4 py-2 font-medium text-xs text-left text-muted-foreground">
									Document
								</th>
								<th className="px-4 py-2 font-medium text-xs text-left text-muted-foreground">
									Reason
								</th>
								<th className="px-4 py-2 w-24" />
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{errors.map((error, idx) => (
								<tr key={idx} className="hover:bg-accent/50">
									<td className="px-4 py-2 font-mono text-xs text-muted-foreground">
										#{error.row}
									</td>
									<td className="px-4 py-2 font-mono text-xs max-w-[200px] truncate">
										{error.documentId}
									</td>
									<td className="px-4 py-2">
										<div className="gap-1 flex flex-col">
											<span className="text-xs">{error.reason}</span>
											{error.field && (
												<Badge status="warning" className="w-fit">
													{error.field}
												</Badge>
											)}
										</div>
									</td>
									<td className="px-4 py-2">
										<div className="gap-1 flex justify-end">
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-xs"
												onClick={() => onRetry([`${jobId}-${idx}`])}
											>
												Retry
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-xs text-muted-foreground"
												onClick={() => onIgnore([`${jobId}-${idx}`])}
											>
												Ignore
											</Button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
}
