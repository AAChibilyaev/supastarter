import { listAuditLogs } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const listAuditLogsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/audit-log/list",
		tags: ["Audit Log"],
		summary: "List audit log entries",
		description:
			"Returns paginated audit log entries for an organization with optional filters.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			limit: z.number().int().min(1).max(200).default(50),
			offset: z.number().int().min(0).default(0),
			action: z.string().optional(),
			userId: z.string().optional(),
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
				}),
			),
			total: z.number().int(),
		}),
	)
	.handler(async ({ input: params, context: { user } }) => {
		// Verify the user is a member of the organization
		const result = await listAuditLogs({
			organizationId: params.organizationId,
			limit: params.limit,
			offset: params.offset,
			action: params.action,
			userId: params.userId,
			dateFrom: params.dateFrom,
			dateTo: params.dateTo,
		});

		return result;
	});

export const listAuditActionsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/audit-log/actions",
		tags: ["Audit Log"],
		summary: "List audit log action types",
		description: "Returns the list of all possible audit log action types.",
	})
	.input(z.object({}).optional())
	.output(
		z.object({
			actions: z.array(z.string()),
		}),
	)
	.handler(async () => {
		const actions = [
			"create_index",
			"delete_index",
			"update_schema",
			"create_api_key",
			"revoke_api_key",
			"update_settings",
			"run_reindex",
			"change_plan",
			"add_member",
			"remove_member",
			"change_member_role",
			"update_synonyms",
			"update_curations",
			"update_rules",
			"create_connector",
			"delete_connector",
			"create_webhook",
			"delete_webhook",
			"update_widget",
			"delete_widget",
		];

		return { actions };
	});
