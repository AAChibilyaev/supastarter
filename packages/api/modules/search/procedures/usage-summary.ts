import { db } from "@repo/database";
import { config as paymentsConfig } from "@repo/payments/config";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

const DAY_MS = 24 * 60 * 60 * 1000;

export const usageSummary = protectedProcedure
	.route({
		method: "GET",
		path: "/search/usage-summary",
		tags: ["Search"],
		summary: "Get usage summary with plan limits",
	})
	.input(
		z.object({
			organizationId: z.string(),
			period: z.enum(["last7", "last30"]),
			indexId: z.string().optional(),
		}),
	)
	.output(
		z.object({
			searchesUsed: z.number(),
			documentsIndexed: z.number(),
			searchesLimit: z.number(),
			documentsLimit: z.number(),
			periodStart: z.string(),
			periodEnd: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId, period, indexId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const windowDays = period === "last7" ? 7 : 30;
		const since = new Date(Date.now() - windowDays * DAY_MS);

		// Aggregate search usage events in the period
		const aggregated = await db.searchUsageEvent.groupBy({
			by: ["type"],
			where: {
				organizationId,
				...(indexId ? { indexId } : {}),
				createdAt: { gte: since },
			},
			_sum: { count: true },
		});

		// _sum.count returns number (Int field), transform for BigInt safety
		const searchesUsed = aggregated
			.filter((row) => row.type === "search_query" || row.type === "search")
			.reduce((acc, row) => acc + (row._sum.count ?? 0), 0);

		const documentsIndexed = aggregated
			.filter(
				(row) =>
					row.type === "ingest_write" ||
					row.type === "documents_indexed" ||
					(row.type as string) === "ingest" ||
					(row.type as string) === "ingest_enqueued",
			)
			.reduce((acc, row) => acc + (row._sum.count ?? 0), 0);

		// Get limits from plan config
		const limits = paymentsConfig.searchLimits.free;

		const periodEnd = new Date();
		const periodStart = new Date(periodEnd.getTime() - windowDays * DAY_MS);

		return {
			searchesUsed,
			documentsIndexed,
			searchesLimit: limits.searchPerMonth,
			documentsLimit: limits.indexedDocuments,
			periodStart: periodStart.toISOString(),
			periodEnd: periodEnd.toISOString(),
		};
	});
