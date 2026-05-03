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

export async function aggregateAiUsageByWeek(filter: ListUsageEventsFilter) {
	return db.$queryRaw<Array<{ week: Date; total_kopecks: bigint; events: bigint }>>`
		SELECT
			date_trunc('week', "createdAt") as week,
			SUM("totalChargeKopecks")::bigint as total_kopecks,
			COUNT(*)::bigint as events
		FROM "ai_usage_event"
		WHERE
			(${filter.organizationId}::text IS NULL OR "organizationId" = ${filter.organizationId})
			AND (${filter.userId}::text IS NULL OR "userId" = ${filter.userId})
			AND (${filter.projectId}::text IS NULL OR "projectId" = ${filter.projectId})
			AND (${filter.from}::timestamp IS NULL OR "createdAt" >= ${filter.from})
			AND (${filter.to}::timestamp IS NULL OR "createdAt" <= ${filter.to})
		GROUP BY week
		ORDER BY week ASC
	`;
}

export async function aggregateAiUsageByMonth(filter: ListUsageEventsFilter) {
	return db.$queryRaw<Array<{ month: Date; total_kopecks: bigint; events: bigint }>>`
		SELECT
			date_trunc('month', "createdAt") as month,
			SUM("totalChargeKopecks")::bigint as total_kopecks,
			COUNT(*)::bigint as events
		FROM "ai_usage_event"
		WHERE
			(${filter.organizationId}::text IS NULL OR "organizationId" = ${filter.organizationId})
			AND (${filter.userId}::text IS NULL OR "userId" = ${filter.userId})
			AND (${filter.projectId}::text IS NULL OR "projectId" = ${filter.projectId})
			AND (${filter.from}::timestamp IS NULL OR "createdAt" >= ${filter.from})
			AND (${filter.to}::timestamp IS NULL OR "createdAt" <= ${filter.to})
		GROUP BY month
		ORDER BY month ASC
	`;
}

export interface CreditForecast {
	dailyAverageKopecks: bigint;
	projectedMonthlyKopecks: bigint;
	remainingDays: number;
	consumedKopecks: bigint;
	includedMonthlyLimitKopecks: bigint;
	overageRisk: "low" | "medium" | "high";
}

export async function getCreditUsageForecast(
	organizationId: string,
): Promise<CreditForecast | null> {
	const wallet = await db.aiWallet.findUnique({
		where: { organizationId },
		select: {
			id: true,
			availableBalanceKopecks: true,
			includedMonthlyLimitKopecks: true,
			periodStart: true,
			periodEnd: true,
		},
	});

	if (!wallet) return null;

	const now = new Date();
	const daysSinceStart = Math.max(
		1,
		Math.ceil((now.getTime() - wallet.periodStart.getTime()) / (1000 * 60 * 60 * 24)),
	);
	const remainingDays = Math.max(
		0,
		Math.ceil((wallet.periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
	);

	const usage = await db.$queryRaw<Array<{ total: bigint }>>`
		SELECT COALESCE(SUM("totalChargeKopecks"), 0)::bigint as total
		FROM "ai_usage_event"
		WHERE "organizationId" = ${organizationId}
			AND "createdAt" >= ${wallet.periodStart}
	`;

	const consumedKopecks = usage[0]?.total ?? BigInt(0);
	const dailyAverageKopecks = consumedKopecks / BigInt(daysSinceStart);
	const projectedMonthlyKopecks = dailyAverageKopecks * BigInt(daysSinceStart + remainingDays);

	const limit = wallet.includedMonthlyLimitKopecks;
	let overageRisk: "low" | "medium" | "high" = "low";
	if (limit > BigInt(0)) {
		const usageRatio = Number(consumedKopecks) / Number(limit);
		if (usageRatio > 0.8) overageRisk = "high";
		else if (usageRatio > 0.5) overageRisk = "medium";
	}

	return {
		dailyAverageKopecks,
		projectedMonthlyKopecks,
		remainingDays,
		consumedKopecks,
		includedMonthlyLimitKopecks: limit,
		overageRisk,
	};
}
