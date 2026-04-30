import "server-only";
import { logger } from "@repo/logs";

import { config } from "../config";
import { getTypesenseClient } from "./client";

export interface BulkUpsertInput {
	collection: string;
	tenantId: string;
	documents: Record<string, unknown>[];
}

export interface BulkUpsertResult {
	total: number;
	successCount: number;
	failures: Array<{ index: number; error: string; document?: Record<string, unknown> }>;
}

export async function bulkUpsert(input: BulkUpsertInput): Promise<BulkUpsertResult> {
	if (input.documents.length === 0) {
		return { total: 0, successCount: 0, failures: [] };
	}

	const client = getTypesenseClient();
	const collection = client.collections(input.collection).documents();

	const tagged = input.documents.map((doc) => ({
		...doc,
		[config.tenantField]: input.tenantId,
	}));

	const failures: BulkUpsertResult["failures"] = [];
	let successCount = 0;
	let cursor = 0;

	while (cursor < tagged.length) {
		const batch = tagged.slice(cursor, cursor + config.ingestBatchSize);
		try {
			const response = await collection.import(batch, { action: "upsert" });
			const lines = Array.isArray(response) ? response : [];

			lines.forEach((line, index) => {
				if (line && typeof line === "object" && line.success === true) {
					successCount += 1;
				} else {
					failures.push({
						index: cursor + index,
						error: typeof line?.error === "string" ? line.error : "unknown",
						document: line?.document as Record<string, unknown> | undefined,
					});
				}
			});
		} catch (error) {
			logger.error("Typesense bulk upsert failed", { error, cursor });
			batch.forEach((doc, index) => {
				failures.push({
					index: cursor + index,
					error: error instanceof Error ? error.message : String(error),
					document: doc,
				});
			});
		}
		cursor += config.ingestBatchSize;
	}

	return { total: tagged.length, successCount, failures };
}

export async function deleteByQuery(collection: string, filterBy: string) {
	const client = getTypesenseClient();
	return client.collections(collection).documents().delete({ filter_by: filterBy });
}
