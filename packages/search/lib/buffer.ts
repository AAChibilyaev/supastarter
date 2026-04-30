import "server-only";
import { getSearchIndexById, markIngestRowsProcessed, takePendingIngestRows } from "@repo/database";
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
		return { flushed: 0, failures: 0 };
	}

	const upserts = rows.filter((row) => row.action === "upsert");
	const deletes = rows.filter((row) => row.action === "delete");
	const collection = aliasName(index.organizationId, index.slug);

	let failures = 0;

	if (upserts.length > 0) {
		const result = await bulkUpsert({
			collection,
			tenantId: index.organizationId,
			documents: upserts.map((row) => row.document as Record<string, unknown>),
		});
		failures += result.failures.length;
		if (result.failures.length > 0) {
			logger.warn("Search ingest buffer had failures", {
				indexId,
				failures: result.failures.length,
			});
		}
	}

	for (const row of deletes) {
		const document = row.document as Record<string, unknown>;
		const id = document.id;
		if (typeof id !== "string" && typeof id !== "number") {
			failures += 1;
			continue;
		}
		try {
			await deleteByQuery(
				physicalCollectionName(index.organizationId, index.slug, index.version),
				`id:=${id}`,
			);
		} catch (error) {
			failures += 1;
			logger.error("Search ingest buffer delete failed", { error, id });
		}
	}

	await markIngestRowsProcessed(rows.map((row) => row.id));
	return { flushed: rows.length, failures };
}
