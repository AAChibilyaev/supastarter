import { ORPCError } from "@orpc/client";
import { createPendingReindexJob, hasActiveReindexJob } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { indexingSlugSchema } from "../types";

export const deltaSync = protectedProcedure
	.route({
		method: "POST",
		path: "/indexing/delta-sync",
		tags: ["Indexing"],
		summary: "Trigger delta sync for collection",
		description:
			"Enqueues a delta sync job that processes only changed documents since the last sync.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: indexingSlugSchema,
			baseSyncJobId: z.string().optional(),
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

		if (await hasActiveReindexJob(index.id)) {
			throw new ORPCError("CONFLICT", {
				message: "A reindex job is already running or pending for this index",
			});
		}

		const job = await createPendingReindexJob({
			indexId: index.id,
			organizationId: input.organizationId,
			fields: [],
		});

		logger.info("Delta sync job enqueued", {
			jobId: job.id,
			organizationId: input.organizationId,
			slug: input.slug,
			baseSyncJobId: input.baseSyncJobId ?? null,
		});

		return { jobId: job.id };
	});
