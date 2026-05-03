import "server-only";
import { logger } from "@repo/logs";

import { config } from "../config";
import { getTypesenseClient } from "./client";
import {
	createPhysicalCollection,
	dropOldVersions,
	physicalCollectionName,
	swapAliasToVersion,
	type CollectionFieldInput,
} from "./collections";
import { bulkUpsert } from "./ingest";

export interface ReindexInput {
	organizationId: string;
	slug: string;
	currentVersion: number;
	fields: CollectionFieldInput[];
	defaultSortingField?: string;
	tokenSeparators?: string[];
	symbolTokensToIndex?: string[];
	onProgress?: (processed: number, total: number) => void;
}

export interface ReindexResult {
	newVersion: number;
	copiedDocuments: number;
	failedDocuments: number;
}

/**
 * Zero-downtime reindex flow:
 *   1. Create new physical collection at version+1.
 *   2. Stream all documents from current alias collection to the new one.
 *   3. Swap alias to the new version (atomic).
 *   4. Drop versions older than `currentVersion` (keep current as rollback).
 *
 * Designed for MVP-sized indexes. For very large collections, run from a queue
 * worker so the request doesn't block.
 */
export async function reindexCollection(input: ReindexInput): Promise<ReindexResult> {
	const client = getTypesenseClient();
	const newVersion = input.currentVersion + 1;
	const oldName = physicalCollectionName(input.organizationId, input.slug, input.currentVersion);
	const newName = physicalCollectionName(input.organizationId, input.slug, newVersion);

	await createPhysicalCollection({
		organizationId: input.organizationId,
		slug: input.slug,
		version: newVersion,
		fields: input.fields,
		defaultSortingField: input.defaultSortingField,
		tokenSeparators: input.tokenSeparators,
		symbolTokensToIndex: input.symbolTokensToIndex,
	});

	let copied = 0;
	let failed = 0;

	const exportStream = await client.collections(oldName).documents().export();
	const lines = exportStream.split("\n").filter((line) => line.trim().length > 0);
	const batchSize = config.ingestBatchSize;
	const total = lines.length;

	input.onProgress?.(0, total);

	for (let cursor = 0; cursor < lines.length; cursor += batchSize) {
		const batch = lines
			.slice(cursor, cursor + batchSize)
			.map((line) => {
				try {
					return JSON.parse(line) as Record<string, unknown>;
				} catch {
					return null;
				}
			})
			.filter((doc): doc is Record<string, unknown> => doc !== null);

		if (batch.length === 0) continue;

		const result = await bulkUpsert({
			collection: newName,
			tenantId: input.organizationId,
			documents: batch,
		});
		copied += result.successCount;
		failed += result.failures.length;
		input.onProgress?.(copied + failed, total);
	}

	await swapAliasToVersion(input.organizationId, input.slug, newVersion);
	logger.info("Reindex alias swapped", {
		organizationId: input.organizationId,
		slug: input.slug,
		newVersion,
		copied,
		failed,
	});

	// Keep current (now previous) version as rollback target — drop only older.
	if (input.currentVersion > 1) {
		await dropOldVersions(input.organizationId, input.slug, newVersion);
	}

	return { newVersion, copiedDocuments: copied, failedDocuments: failed };
}
