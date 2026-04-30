import { db } from "../client";

export interface ListUsageEventsFilter {
	walletId?: string;
	organizationId?: string;
	userId?: string;
	projectId?: string;
	operation?: string;
	provider?: string;
	model?: string;
	from?: Date;
	to?: Date;
}

export async function listAiUsageEvents(
	filter: ListUsageEventsFilter,
	opts: { limit?: number; cursor?: string } = {},
) {
	return db.aiUsageEvent.findMany({
		where: {
			walletId: filter.walletId,
			organizationId: filter.organizationId,
			userId: filter.userId,
			projectId: filter.projectId,
			operation: filter.operation,
			provider: filter.provider,
			model: filter.model,
			createdAt: filter.from || filter.to ? { gte: filter.from, lte: filter.to } : undefined,
		},
		orderBy: { createdAt: "desc" },
		take: opts.limit ?? 50,
		cursor: opts.cursor ? { id: opts.cursor } : undefined,
		skip: opts.cursor ? 1 : 0,
	});
}

export async function aggregateAiUsageByDay(filter: ListUsageEventsFilter) {
	return db.$queryRaw<Array<{ day: Date; total_kopecks: bigint; events: bigint }>>`
		SELECT
			date_trunc('day', "createdAt") as day,
			SUM("totalChargeKopecks")::bigint as total_kopecks,
			COUNT(*)::bigint as events
		FROM "ai_usage_event"
		WHERE
			(${filter.organizationId}::text IS NULL OR "organizationId" = ${filter.organizationId})
			AND (${filter.userId}::text IS NULL OR "userId" = ${filter.userId})
			AND (${filter.projectId}::text IS NULL OR "projectId" = ${filter.projectId})
			AND (${filter.from}::timestamp IS NULL OR "createdAt" >= ${filter.from})
			AND (${filter.to}::timestamp IS NULL OR "createdAt" <= ${filter.to})
		GROUP BY day
		ORDER BY day ASC
	`;
}
