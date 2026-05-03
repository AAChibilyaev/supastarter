import { listAuditLogs } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

function toCsvRow(values: string[]): string {
	return values
		.map((v) => {
			// Escape quotes and wrap in quotes if contains comma, quote, or newline
			if (v.includes(",") || v.includes('"') || v.includes("\n")) {
				return `"${v.replace(/"/g, '""')}"`;
			}
			return v;
		})
		.join(",");
}

export const exportAuditLogsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/audit-log/export",
		tags: ["Audit Log"],
		summary: "Export audit logs as CSV",
		description: "Returns audit log entries for an organization as a downloadable CSV string.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			limit: z.number().int().min(1).max(10000).default(5000),
			offset: z.number().int().min(0).default(0),
			action: z.string().optional(),
			userId: z.string().optional(),
			dateFrom: z.string().optional(),
			dateTo: z.string().optional(),
		}),
	)
	.output(
		z.object({
			csv: z.string(),
			total: z.number().int(),
			exported: z.number().int(),
		}),
	)
	.handler(async ({ input: params }) => {
		const result = await listAuditLogs({
			organizationId: params.organizationId,
			limit: params.limit,
			offset: params.offset,
			action: params.action,
			userId: params.userId,
			dateFrom: params.dateFrom,
			dateTo: params.dateTo,
		});

		const headers = [
			"ID",
			"Date",
			"User",
			"Email",
			"Action",
			"Target Type",
			"Target ID",
			"Details",
			"IP Address",
			"User Agent",
		];

		const rows = result.entries.map((entry) =>
			toCsvRow([
				entry.id,
				entry.createdAt.toISOString(),
				entry.user.name ?? "",
				entry.user.email,
				entry.action,
				entry.targetType ?? "",
				entry.targetId ?? "",
				entry.details ? JSON.stringify(entry.details) : "",
				entry.ipAddress ?? "",
				entry.userAgent ?? "",
			]),
		);

		const csv = [toCsvRow(headers), ...rows].join("\n");

		return {
			csv,
			total: result.total,
			exported: result.entries.length,
		};
	});
