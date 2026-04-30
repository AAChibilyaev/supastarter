import "server-only";
import {
	getSearchIndexById,
	markIngestRowsFailure,
	markIngestRowsSuccess,
	recordSearchUsage,
	takePendingIngestRows,
} from "@repo/database";
import { logger } from "@repo/logs";

import { config } from "../config";
import { aliasName, physicalCollectionName } from "./collections";
import { bulkUpsert, deleteByQuery } from "./ingest";

export async function flushSearchIngestBuffer(indexId: string, limit?: number) {
	const index = await getSearchIndexById(indexId);
	if (!index) {
		throw new Error(`Search index ${indexId} not found`);
	}

	const rows = await takePendingIngestRows(indexId, limit ?? config.ingestBatchSize);
	if (rows.length === 0) {
		return { flushed: 0, failed: 0 };
	}

	const upserts = rows.filter((row) => row.action === "upsert");
	const deletes = rows.filter((row) => row.action === "delete");
	const collection = aliasName(index.organizationId, index.slug);

	const successIds: string[] = [];
	const failures: { id: string; error: string }[] = [];

	if (upserts.length > 0) {
		try {
			const result = await bulkUpsert({
				collection,
				tenantId: index.organizationId,
				documents: upserts.map((row) => row.document as Record<string, unknown>),
			});

			const failedIndexes = new Set(result.failures.map((f) => f.index));
			upserts.forEach((row, idx) => {
				if (failedIndexes.has(idx)) {
					const failure = result.failures.find((f) => f.index === idx);
					failures.push({ id: row.id, error: failure?.error ?? "unknown" });
				} else {
					successIds.push(row.id);
				}
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.error("flushSearchIngestBuffer: bulkUpsert threw", { indexId, message });
			for (const row of upserts) {
				failures.push({ id: row.id, error: message });
			}
		}
	}

	for (const row of deletes) {
		const document = row.document as Record<string, unknown>;
		const docId = document.id;
		if (typeof docId !== "string" && typeof docId !== "number") {
			failures.push({ id: row.id, error: "delete row has no document.id" });
			continue;
		}
		try {
			await deleteByQuery(
				physicalCollectionName(index.organizationId, index.slug, index.version),
				`id:=${docId}`,
			);
			successIds.push(row.id);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			failures.push({ id: row.id, error: message });
		}
	}

	await markIngestRowsSuccess(successIds);
	await markIngestRowsFailure(failures);

	if (successIds.length > 0) {
		await recordSearchUsage({
			indexId: index.id,
			organizationId: index.organizationId,
			type: "ingest",
			count: successIds.length,
		}).catch((err) => logger.error("flushSearchIngestBuffer: usage record failed", { err }));
	}

	if (failures.length > 0) {
		logger.warn("Search ingest flush had failures", {
			indexId,
			flushed: successIds.length,
			failed: failures.length,
		});
	}

	return { flushed: successIds.length, failed: failures.length };
}
