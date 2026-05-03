import { ORPCError } from "@orpc/client";
import { enqueueManySearchIngest, recordSearchUsage, type Prisma } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const importDocuments = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/import",
		tags: ["Search"],
		summary: "Enqueue documents for asynchronous indexing",
		description:
			"Persists documents into the durable ingest buffer in a single INSERT. The background flush worker delivers them to Typesense; this response confirms enqueueing only, NOT delivery. Use the cron flush endpoint or wait for the worker to mark rows processed.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			action: z.enum(["create", "update", "upsert", "emplace"]).default("upsert"),
			documents: z.array(z.record(z.string(), z.unknown())).min(1).max(5000),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		try {
			const queued = await enqueueManySearchIngest(
				index.id,
				index.organizationId,
				input.action,
				input.documents as Prisma.InputJsonValue[],
			);

			await recordSearchUsage({
				indexId: index.id,
				organizationId: index.organizationId,
				type: "ingest_write",
				count: queued,
			});

			return {
				queued,
				accepted: input.documents.length,
			};
		} catch (error) {
			logger.error("Search enqueue failed", { error });
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
