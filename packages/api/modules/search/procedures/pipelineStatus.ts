import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

const FIVE_MIN_MS = 5 * 60 * 1000;

export const pipelineStatus = protectedProcedure
	.route({
		method: "GET",
		path: "/search/pipeline-status",
		tags: ["Search"],
		summary: "Get ingest pipeline status",
		description:
			"Returns real-time ingest pipeline status: buffer depth, worker throughput, retry queue size, and failed counts.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			bufferDepth: z.number(),
			workerThroughput: z.number(),
			retryQueueSize: z.number(),
			failedCount: z.number(),
			snapshotAt: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const now = new Date();
		const fiveMinAgo = new Date(now.getTime() - FIVE_MIN_MS);

		// Buffer depth: unprocessed rows with no retry scheduled
		const bufferDepth = await db.searchIngestBuffer.count({
			where: {
				organizationId,
				processedAt: null,
				nextRetryAt: null,
			},
		});

		// Retry queue: rows with nextRetryAt set and not yet processed
		const retryQueueSize = await db.searchIngestBuffer.count({
			where: {
				organizationId,
				processedAt: null,
				nextRetryAt: { not: null },
			},
		});

		// Worker throughput: rows processed in last 5 minutes
		const workerThroughput = await db.searchIngestBuffer.count({
			where: {
				organizationId,
				processedAt: { gte: fiveMinAgo },
			},
		});

		// Failed counts: rows with attempts > 0 and not yet processed
		const failedCount = await db.searchIngestBuffer.count({
			where: {
				organizationId,
				processedAt: null,
				attempts: { gt: 0 },
			},
		});

		return {
			bufferDepth,
			workerThroughput,
			retryQueueSize,
			failedCount,
			snapshotAt: now.toISOString(),
		};
	});
