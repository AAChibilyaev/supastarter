import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../../search/lib/access";

export const healthStats = protectedProcedure
	.route({
		method: "GET",
		path: "/indexing/health",
		tags: ["Indexing"],
		summary: "Get indexing health statistics",
		description:
			"Returns aggregate health statistics for the organization's indexing pipeline: " +
			"pending/buffered items, active reindex jobs, and schedule counts.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			pendingIngestItems: z.number().int(),
			failedIngestItems: z.number().int(),
			activeReindexJobs: z.number().int(),
			reindexScheduleCount: z.number().int(),
			oldestBufferedAt: z.string().nullable(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const { db } = await import("@repo/database");

		const [pendingIngestItems, failedIngestItems, activeReindexJobs, reindexScheduleCount] =
			await Promise.all([
				db.searchIngestBuffer.count({
					where: { organizationId: input.organizationId, processedAt: null },
				}),
				db.searchIngestBuffer.count({
					where: {
						organizationId: input.organizationId,
						processedAt: null,
						attempts: { gt: 0 },
					},
				}),
				db.searchConnectorSyncJob.count({
					where: {
						organizationId: input.organizationId,
						type: "reindex",
						status: { in: ["pending", "running"] },
					},
				}),
				db.searchConnectorSyncJob.count({
					where: {
						organizationId: input.organizationId,
						type: "reindex_schedule",
					},
				}),
			]);

		// Find the oldest buffered item to gauge pipeline latency
		const oldest = await db.searchIngestBuffer.findFirst({
			where: { organizationId: input.organizationId, processedAt: null },
			orderBy: { createdAt: "asc" },
			select: { createdAt: true },
		});

		return {
			pendingIngestItems,
			failedIngestItems,
			activeReindexJobs,
			reindexScheduleCount,
			oldestBufferedAt: oldest?.createdAt.toISOString() ?? null,
		};
	});
