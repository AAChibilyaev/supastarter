import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const retryFailedBatches = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/retry-failed-batches",
		tags: ["Search"],
		summary: "Retry failed ingest batches",
		description:
			"Marks unprocessed SearchIngestBuffer rows with processedAt=null and attempts>0 for retry by resetting their nextRetryAt to null.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.handler(async ({ input: { organizationId, slug }, context: { user } }) => {
		await requireOrganizationAdmin(organizationId, user);
		const index = await requireSearchIndex(organizationId, slug);

		const result = await db.searchIngestBuffer.updateMany({
			where: {
				indexId: index.id,
				organizationId,
				processedAt: null,
				attempts: { gt: 0 },
			},
			data: {
				nextRetryAt: null,
				lastError: null,
			},
		});

		logger.info("Retried failed ingest batches", {
			indexId: index.id,
			slug,
			count: result.count,
		});

		return {
			success: true,
			retriedCount: result.count,
			indexId: index.id,
			indexSlug: slug,
		};
	});
