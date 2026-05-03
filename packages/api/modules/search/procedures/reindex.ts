import { ORPCError } from "@orpc/client";
import { createPendingReindexJob, hasActiveReindexJob } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchFieldSchema, searchIndexSlugSchema } from "../types";

export const reindex = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/reindex",
		tags: ["Search"],
		summary: "Reindex collection (zero-downtime alias swap)",
		description:
			"Enqueues an async background reindex job. Returns immediately with { jobId }. Poll pipelineStatus.activeReindexJobs for progress.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			fields: z.array(searchFieldSchema).min(1).optional(),
			defaultSortingField: z.string().optional(),
			tokenSeparators: z.array(z.string().min(1)).optional(),
			symbolTokensToIndex: z.array(z.string().min(1)).optional(),
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

		if (await hasActiveReindexJob(index.id)) {
			throw new ORPCError("CONFLICT", {
				message: "A reindex job is already running or pending for this index",
			});
		}

		const job = await createPendingReindexJob({
			indexId: index.id,
			organizationId: input.organizationId,
			fields: fields as unknown[],
			defaultSortingField: input.defaultSortingField,
			tokenSeparators: input.tokenSeparators,
			symbolTokensToIndex: input.symbolTokensToIndex,
		});

		logger.info("Reindex job enqueued", {
			jobId: job.id,
			organizationId: input.organizationId,
			slug: input.slug,
			fieldCount: fields.length,
		});

		return { jobId: job.id };
	});
