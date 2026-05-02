import "server-only";
import { logger } from "@repo/logs";

import { config } from "../config";
import { aliasName, physicalCollectionName } from "./collections";
import { bulkUpsert, deleteByQuery } from "./ingest";

export interface DeltaSyncInput {
	indexId: string;
	organizationId: string;
	slug: string;
	version: number;
	limit?: number;
}

export interface DeltaSyncResult {
	processed: number;
	upserted: number;
	deleted: number;
	remaining: number;
}

/**
 * Process pending delta sync items from the SearchIngestBuffer.
 *
 * Reads pending ingest rows (processedAt = null), processes upserts
 * via bulkUpsert and deletes via deleteByQuery, then marks rows as
 * processed. Returns counts of processed/upserted/deleted/remaining items.
 *
 * This is the delta counterpart to flushSearchIngestBuffer — it processes
 * accumulated changes since the last flush rather than streaming from
 * a database export.
 */
export async function deltaSync(input: DeltaSyncInput): Promise<DeltaSyncResult> {
	const limit = input.limit ?? config.ingestBatchSize;
	const alias = aliasName(input.organizationId, input.slug);
	const physical = physicalCollectionName(input.organizationId, input.slug, input.version);

	const { takePendingIngestRows, markIngestRowsSuccess, markIngestRowsFailure } =
		await import("@repo/database");

	let totalProcessed = 0;
	let totalUpserted = 0;
	let totalDeleted = 0;

	while (true) {
		const rows = await takePendingIngestRows(input.indexId, limit);
		if (rows.length === 0) break;

		const upserts = rows.filter((row: { action: string }) => row.action === "upsert");
		const deletes = rows.filter((row: { action: string }) => row.action === "delete");

		const successIds: string[] = [];
		const failures: { id: string; error: string }[] = [];

		// Process upserts
		if (upserts.length > 0) {
			try {
				const result = await bulkUpsert({
					collection: alias,
					tenantId: input.organizationId,
					documents: upserts.map(
						(row: { document: unknown }) => row.document as Record<string, unknown>,
					),
				});

				const failedIndexes = new Set(result.failures.map((f) => f.index));
				upserts.forEach((row: { id: string }, idx: number) => {
					if (failedIndexes.has(idx)) {
						const failure = result.failures.find((f) => f.index === idx);
						failures.push({ id: row.id, error: failure?.error ?? "unknown" });
					} else {
						successIds.push(row.id);
						totalUpserted++;
					}
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error("deltaSync: bulkUpsert threw", { indexId: input.indexId, message });
				for (const row of upserts) {
					failures.push({ id: row.id, error: message });
				}
			}
		}

		// Process deletes
		for (const row of deletes) {
			const document = row.document as Record<string, unknown>;
			const docId = document.id;
			if (typeof docId !== "string" && typeof docId !== "number") {
				failures.push({ id: row.id, error: "delete row has no document.id" });
				continue;
			}
			try {
				await deleteByQuery(physical, `id:=${docId}`);
				successIds.push(row.id);
				totalDeleted++;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				failures.push({ id: row.id, error: message });
			}
		}

		// Mark rows as processed or failed
		await markIngestRowsSuccess(successIds);
		if (failures.length > 0) {
			await markIngestRowsFailure(failures);
			logger.warn("deltaSync: batch had failures", {
				indexId: input.indexId,
				processed: successIds.length,
				failed: failures.length,
			});
		}

		totalProcessed += successIds.length;

		// Check if there are more rows to process
		const remaining = await countPendingRows(input.indexId);
		if (remaining === 0) break;
	}

	logger.info("Delta sync complete", {
		indexId: input.indexId,
		processed: totalProcessed,
		upserted: totalUpserted,
		deleted: totalDeleted,
	});

	return {
		processed: totalProcessed,
		upserted: totalUpserted,
		deleted: totalDeleted,
		remaining: totalProcessed > 0 ? 0 : 0,
	};
}

async function countPendingRows(indexId: string): Promise<number> {
	const { db } = await import("@repo/database");
	const count = await db.searchIngestBuffer.count({
		where: {
			indexId,
			processedAt: null,
		},
	});
	return count;
}
