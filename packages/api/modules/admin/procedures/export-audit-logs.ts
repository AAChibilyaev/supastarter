import { listAuditLogsAdmin } from "@repo/database";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

function toCsvRow(values: string[]): string {
	return values
		.map((v) => {
			if (v.includes(",") || v.includes('"') || v.includes("\n")) {
				return `"${v.replace(/"/g, '""')}"`;
			}
			return v;
		})
		.join(",");
}

export const exportAuditLogsAdminProcedure = adminProcedure
	.route({
		method: "GET",
		path: "/admin/audit-logs/export",
		tags: ["Administration"],
		summary: "Export audit logs as CSV",
		description:
			"Returns audit log entries across all organizations as a downloadable CSV string. Admin only.",
	})
	.input(
		z.object({
			limit: z.number().int().min(1).max(10000).default(5000),
			offset: z.number().int().min(0).default(0),
			action: z.string().optional(),
			userId: z.string().optional(),
			organizationId: z.string().optional(),
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
		const result = await listAuditLogsAdmin({
			limit: params.limit,
			offset: params.offset,
			action: params.action,
			userId: params.userId,
			organizationId: params.organizationId,
			dateFrom: params.dateFrom,
			dateTo: params.dateTo,
		});

		const headers = [
			"ID",
			"Date",
			"Organization",
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
				entry.organization.name,
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
