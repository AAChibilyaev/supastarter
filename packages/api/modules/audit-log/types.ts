import { z } from "zod";

export const AUDIT_LOG_ACTIONS = [
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
] as const;

export const listAuditLogsInputSchema = z.object({
	organizationId: z.string(),
	limit: z.number().int().min(1).max(200).default(50),
	offset: z.number().int().min(0).default(0),
	action: z.string().optional(),
	userId: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
});

export const listAuditLogsOutputSchema = z.object({
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
});

export const exportAuditLogInputSchema = z.object({
	organizationId: z.string(),
	action: z.string().optional(),
	userId: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
});
