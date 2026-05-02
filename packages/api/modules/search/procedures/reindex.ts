import { ORPCError } from "@orpc/client";
import { updateSearchIndexVersion } from "@repo/database";
import { logger } from "@repo/logs";
import { reindexCollection } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import {
	completeReindexJob,
	createReindexJob,
	failReindexJob,
	updateReindexProgress,
} from "../lib/sync-jobs";
import { searchFieldSchema, searchIndexSlugSchema } from "../types";

export const reindex = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/reindex",
		tags: ["Search"],
		summary: "Reindex collection (zero-downtime alias swap)",
		description:
			"Launches an async background reindex job. Returns immediately with { jobId }. Poll pipelineStatus.activeReindexJobs for progress.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			fields: z.array(searchFieldSchema).min(1).optional(),
			defaultSortingField: z.string().optional(),
		}),
	)
	.output(
		z.object({
			jobId: z.string(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const fields =
			input.fields ??
			(Array.isArray(index.schema as unknown[])
				? (index.schema as unknown as { name: string; type: string }[])
				: []);

		if (!fields || fields.length === 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Index has no schema fields to reindex",
			});
		}

		const job = createReindexJob({
			indexId: index.id,
			organizationId: input.organizationId,
			slug: input.slug,
		});

		setImmediate(async () => {
			try {
				const result = await reindexCollection({
					organizationId: input.organizationId,
					slug: input.slug,
					currentVersion: index.version,
					fields: fields as never,
					defaultSortingField: input.defaultSortingField,
					onProgress: (processed, total) =>
						updateReindexProgress(job.id, processed, total),
				});

				await updateSearchIndexVersion(index.id, result.newVersion);
				completeReindexJob(job.id, result.copiedDocuments, result.failedDocuments);

				logger.info("Async reindex completed", {
					jobId: job.id,
					organizationId: input.organizationId,
					slug: input.slug,
					newVersion: result.newVersion,
					copied: result.copiedDocuments,
					failed: result.failedDocuments,
				});
			} catch (error) {
				failReindexJob(job.id);
				logger.error("Async reindex failed", {
					jobId: job.id,
					error,
					slug: input.slug,
				});
			}
		});

		return { jobId: job.id };
	});
