import { db } from "../client";
import type { Prisma } from "../generated/client";

export type AuditLogAction =
	| "create_index"
	| "delete_index"
	| "update_schema"
	| "create_api_key"
	| "revoke_api_key"
	| "update_settings"
	| "run_reindex"
	| "change_plan"
	| "add_member"
	| "remove_member"
	| "change_member_role"
	| "update_synonyms"
	| "update_curations"
	| "update_rules"
	| "create_connector"
	| "delete_connector"
	| "create_webhook"
	| "delete_webhook"
	| "update_widget"
	| "delete_widget";

export interface ListAuditLogsParams {
	organizationId: string;
	limit?: number;
	offset?: number;
	action?: string;
	userId?: string;
	dateFrom?: string;
	dateTo?: string;
}

export interface AuditLogEntry {
	id: string;
	organizationId: string;
	userId: string;
	action: string;
	targetType: string | null;
	targetId: string | null;
	details: Prisma.JsonValue | null;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
}

/**
 * Create an audit log entry.
 */
export async function createAuditLog(params: {
	organizationId: string;
	userId: string;
	action: string;
	targetType?: string | null;
	targetId?: string | null;
	details?: Prisma.InputJsonValue | null;
	ipAddress?: string | null;
	userAgent?: string | null;
}) {
	return db.auditLog.create({
		data: {
			organizationId: params.organizationId,
			userId: params.userId,
			action: params.action,
			targetType: params.targetType ?? null,
			targetId: params.targetId ?? null,
			details: (params.details as Prisma.InputJsonValue) ?? null,
			ipAddress: params.ipAddress ?? null,
			userAgent: params.userAgent ?? null,
		},
	});
}

/**
 * List audit log entries for an organization with pagination and filters.
 */
export async function listAuditLogs(params: ListAuditLogsParams) {
	const { organizationId, limit = 50, offset = 0, action, userId, dateFrom, dateTo } = params;

	const where: Prisma.AuditLogWhereInput = {
		organizationId,
		...(action ? { action } : {}),
		...(userId ? { userId } : {}),
		...(dateFrom || dateTo
			? {
					createdAt: {
						...(dateFrom ? { gte: new Date(dateFrom) } : {}),
						...(dateTo ? { lte: new Date(dateTo) } : {}),
					},
				}
			: {}),
	};

	const [entries, total] = await Promise.all([
		db.auditLog.findMany({
			where,
			orderBy: { createdAt: "desc" },
			take: limit,
			skip: offset,
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		}),
		db.auditLog.count({ where }),
	]);

	return { entries, total };
}

export interface ListAuditLogsAdminParams {
	limit?: number;
	offset?: number;
	action?: string;
	userId?: string;
	organizationId?: string;
	dateFrom?: string;
	dateTo?: string;
}

/**
 * List audit log entries across all organizations (admin view).
 */
export async function listAuditLogsAdmin(params: ListAuditLogsAdminParams) {
	const { limit = 50, offset = 0, action, userId, organizationId, dateFrom, dateTo } = params;

	const where: Prisma.AuditLogWhereInput = {
		...(action ? { action } : {}),
		...(userId ? { userId } : {}),
		...(organizationId ? { organizationId } : {}),
		...(dateFrom || dateTo
			? {
					createdAt: {
						...(dateFrom ? { gte: new Date(dateFrom) } : {}),
						...(dateTo ? { lte: new Date(dateTo) } : {}),
					},
				}
			: {}),
	};

	const [entries, total] = await Promise.all([
		db.auditLog.findMany({
			where,
			orderBy: { createdAt: "desc" },
			take: limit,
			skip: offset,
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
				organization: {
					select: {
						id: true,
						name: true,
						slug: true,
					},
				},
			},
		}),
		db.auditLog.count({ where }),
	]);

	return { entries, total };
}

/**
 * Delete audit log entries older than the specified date (for retention).
 */
export async function deleteOldAuditLogs(before: Date) {
	const result = await db.auditLog.deleteMany({
		where: {
			createdAt: { lt: before },
		},
	});
	return result.count;
}
