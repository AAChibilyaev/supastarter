import { listAuditLogsAdmin } from "@repo/database";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

export const listAuditLogsAdminProcedure = adminProcedure
	.route({
		method: "GET",
		path: "/admin/audit-logs",
		tags: ["Administration"],
		summary: "List all audit log entries",
		description: "Returns paginated audit log entries across all organizations. Admin only.",
	})
	.input(
		z.object({
			limit: z.number().int().min(1).max(200).default(50),
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
			entries: z.array(
				z.object({
					id: z.string(),
					organizationId: z.string(),
					userId: z.string(),
					action: z.string(),
					targetType: z.string().nullable(),
					targetId: z.string().nullable(),
					details: z.any().nullable(),
					ipAddress: z.string().nullable(),
					userAgent: z.string().nullable(),
					createdAt: z.date(),
					user: z.object({
						id: z.string(),
						name: z.string().nullable(),
						email: z.string(),
						image: z.string().nullable(),
					}),
					organization: z.object({
						id: z.string(),
						name: z.string(),
						slug: z.string().nullable(),
					}),
				}),
			),
			total: z.number().int(),
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

		return result;
	});
