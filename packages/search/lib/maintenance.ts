import "server-only";
import { db } from "@repo/database";
import { logger } from "@repo/logs";

import { flushSearchIngestBuffer } from "./buffer";

export interface FlushAllOptions {
	limitPerIndex?: number;
}

export interface FlushAllResult {
	processedIndexes: number;
	totalFlushed: number;
	totalFailures: number;
}

/**
 * Drains pending ingest rows for every index that has unprocessed rows.
 * Designed to be called from a cron job (trigger.dev / QStash / Vercel Cron / etc.).
 */
export async function flushAllSearchIngestBuffers(
	options: FlushAllOptions = {},
): Promise<FlushAllResult> {
	const indexes = await db.searchIngestBuffer.findMany({
		where: { processedAt: null },
		distinct: ["indexId"],
		select: { indexId: true },
	});

	let totalFlushed = 0;
	let totalFailures = 0;

	for (const { indexId } of indexes) {
		try {
			const result = await flushSearchIngestBuffer(indexId, options.limitPerIndex);
			totalFlushed += result.flushed;
			totalFailures += result.failures;
		} catch (error) {
			logger.error("flushAllSearchIngestBuffers: index failed", { indexId, error });
		}
	}

	return {
		processedIndexes: indexes.length,
		totalFlushed,
		totalFailures,
	};
}
