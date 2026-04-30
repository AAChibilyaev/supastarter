import { ORPCError } from "@orpc/client";
import { enqueueSearchIngest, recordSearchUsage, type Prisma } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

/**
 * Single-document upsert. Same buffered-delivery semantics as bulk import:
 * the doc is enqueued and confirmed; the background worker flushes to
 * Typesense. The provided `id` is forced into the document body so the
 * worker passes it as Typesense `id` (upsert key).
 */
export const upsertDocument = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/documents/{id}",
		tags: ["Search"],
		summary: "Upsert a single document",
		description:
			"Enqueues one document for asynchronous indexing. The id from the URL is set on the document body before delivery. Returns once the buffer write succeeds — the worker performs the actual Typesense upsert.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			id: z.string().min(1).max(256),
			document: z.record(z.string(), z.unknown()),
		}),
	)
	.output(
		z.object({
			id: z.string(),
			queued: z.boolean(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		try {
			const docWithId = { ...input.document, id: input.id };
			await enqueueSearchIngest({
				indexId: index.id,
				organizationId: index.organizationId,
				action: "upsert",
				document: docWithId as Prisma.InputJsonValue,
			});

			await recordSearchUsage({
				indexId: index.id,
				organizationId: index.organizationId,
				type: "ingest_write",
				count: 1,
			});

			return { id: input.id, queued: true };
		} catch (error) {
			logger.error("Search single upsert enqueue failed", { error });
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
