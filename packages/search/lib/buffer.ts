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
import { autoEmbedDocuments } from "./embeddings";
import { bulkUpsert, deleteByQuery } from "./ingest";

const IMPORT_ACTIONS = ["create", "update", "upsert", "emplace"] as const;

export async function flushSearchIngestBuffer(indexId: string, limit?: number) {
	const index = await getSearchIndexById(indexId);
	if (!index) {
		throw new Error(`Search index ${indexId} not found`);
	}

	const rows = await takePendingIngestRows(indexId, limit ?? config.ingestBatchSize);
	if (rows.length === 0) {
		return { flushed: 0, failed: 0 };
	}

	const imports = rows.filter((row) =>
		IMPORT_ACTIONS.includes(row.action as (typeof IMPORT_ACTIONS)[number]),
	);
	const deletes = rows.filter((row) => row.action === "delete");
	const collection = aliasName(index.organizationId, index.slug);

	// Auto-embed documents before importing to Typesense
	if (imports.length > 0) {
		const documents = imports.map((row) => row.document as Record<string, unknown>);
		const embedResult = await autoEmbedDocuments(documents);
		if (embedResult.embedded > 0) {
			logger.debug(
				{ indexId, embedded: embedResult.embedded, skipped: embedResult.skipped },
				"Auto-embedded documents during ingest flush",
			);
		}
	}

	const successIds: string[] = [];
	const failures: { id: string; error: string }[] = [];

	if (imports.length > 0) {
		// Group import rows by action type so each group is sent with the correct action
		const groups = new Map<string, typeof rows>();
		for (const row of imports) {
			const action = IMPORT_ACTIONS.includes(row.action as (typeof IMPORT_ACTIONS)[number])
				? row.action
				: "upsert";
			if (!groups.has(action)) {
				groups.set(action, []);
			}
			groups.get(action)!.push(row);
		}

		for (const [action, group] of groups) {
			try {
				const result = await bulkUpsert({
					collection,
					tenantId: index.organizationId,
					documents: group.map((row) => row.document as Record<string, unknown>),
					action: action as "create" | "update" | "upsert" | "emplace",
				});

				const failedIndexes = new Set(result.failures.map((f) => f.index));
				group.forEach((row, idx) => {
					if (failedIndexes.has(idx)) {
						const failure = result.failures.find((f) => f.index === idx);
						failures.push({ id: row.id, error: failure?.error ?? "unknown" });
					} else {
						successIds.push(row.id);
					}
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error("flushSearchIngestBuffer: bulkUpsert threw", {
					indexId,
					message,
					action,
				});
				for (const row of group) {
					failures.push({ id: row.id, error: message });
				}
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
			type: "documents_indexed",
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
