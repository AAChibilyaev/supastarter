import { ORPCError } from "@orpc/client";
import { aliasName, bulkUpsert, deleteByQuery, physicalCollectionName } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../../search/lib/access";

export const deltaSync = protectedProcedure
	.route({
		method: "POST",
		path: "/indexing/delta-sync",
		tags: ["Indexing"],
		summary: "Synchronize pending document changes to Typesense",
		description:
			"Reads pending items from the ingest buffer and processes upserts/deletes " +
			"in batch. Returns the number of operations performed.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			indexId: z.string(),
			limit: z.number().int().min(1).max(10000).optional().default(500),
		}),
	)
	.output(
		z.object({
			processed: z.number().int(),
			upserted: z.number().int(),
			deleted: z.number().int(),
			remaining: z.number().int(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const { db, getSearchIndexById } = await import("@repo/database");
		const { logger } = await import("@repo/logs");

		const index = await getSearchIndexById(input.indexId);
		if (!index || index.organizationId !== input.organizationId) {
			throw new ORPCError("NOT_FOUND", { message: "Index not found" });
		}

		const collName = physicalCollectionName(index.organizationId, index.slug, index.version);

		const pending = await db.searchIngestBuffer.findMany({
			where: {
				indexId: input.indexId,
				processedAt: null,
			},
			orderBy: { createdAt: "asc" },
			take: input.limit,
		});

		if (pending.length === 0) {
			return { processed: 0, upserted: 0, deleted: 0, remaining: 0 };
		}

		let upserted = 0;
		let deleted = 0;

		// Process single-document operations in batches
		const upsertDocs: Record<string, unknown>[] = [];
		const deleteIds: string[] = [];

		for (const item of pending) {
			const doc = item.document as Record<string, unknown> | null;
			if (item.action === "delete") {
				if (doc?.id) {
					deleteIds.push(String(doc.id));
				}
			} else if (doc) {
				upsertDocs.push({ ...doc, [item.organizationId]: item.organizationId });
			}
		}

		// Batch upsert
		if (upsertDocs.length > 0) {
			try {
				const result = await bulkUpsert({
					collection: collName,
					tenantId: input.organizationId,
					documents: upsertDocs,
				});
				upserted = result.successCount;
			} catch (error) {
				logger.error("Delta sync upsert failed", { error, indexId: input.indexId });
			}
		}

		// Batch delete by filter (one per ID)
		for (const id of deleteIds) {
			try {
				await deleteByQuery(collName, `id:=${id}`);
				deleted++;
			} catch (error) {
				logger.error("Delta sync delete failed", { error, indexId: input.indexId, id });
			}
		}

		// Mark all processed
		await db.searchIngestBuffer.updateMany({
			where: { id: { in: pending.map((p) => p.id) } },
			data: { processedAt: new Date() },
		});

		const remaining = await db.searchIngestBuffer.count({
			where: { indexId: input.indexId, processedAt: null },
		});

		logger.info("Delta sync completed", {
			indexId: input.indexId,
			processed: pending.length,
			upserted,
			deleted,
			remaining,
		});

		return { processed: pending.length, upserted, deleted, remaining };
	});
