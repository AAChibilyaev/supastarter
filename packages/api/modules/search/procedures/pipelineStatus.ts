import { db, listActiveReindexJobsForOrg } from "@repo/database";
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
			activeReindexJobs: z.array(
				z.object({
					jobId: z.string(),
					slug: z.string(),
					processed: z.number(),
					total: z.number(),
					startedAt: z.string(),
				}),
			),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const now = new Date();
		const fiveMinAgo = new Date(now.getTime() - FIVE_MIN_MS);

		const [bufferDepth, retryQueueSize, workerThroughput, failedCount, reindexJobs] =
			await Promise.all([
				db.searchIngestBuffer.count({
					where: { organizationId, processedAt: null, nextRetryAt: null },
				}),
				db.searchIngestBuffer.count({
					where: { organizationId, processedAt: null, nextRetryAt: { not: null } },
				}),
				db.searchIngestBuffer.count({
					where: { organizationId, processedAt: { gte: fiveMinAgo } },
				}),
				db.searchIngestBuffer.count({
					where: { organizationId, processedAt: null, attempts: { gt: 0 } },
				}),
				listActiveReindexJobsForOrg(organizationId),
			]);

		const activeReindexJobs = reindexJobs.map((j) => ({
			jobId: j.id,
			slug: j.slug,
			processed: j.processed,
			total: j.total,
			startedAt: j.startedAt,
		}));

		return {
			bufferDepth,
			workerThroughput,
			retryQueueSize,
			failedCount,
			snapshotAt: now.toISOString(),
			activeReindexJobs,
		};
	});
