import { db } from "@repo/database";
import { logger } from "@repo/logs";

import type { PrometheusMetrics } from "./registry";

/**
 * Collect the current ingest queue depth from the database
 * and set it on the gauge. Logged as best-effort — errors are
 * caught and logged but never thrown.
 */
export async function collectIngestQueueDepth(metrics: PrometheusMetrics): Promise<void> {
	try {
		const count = await db.searchIngestBuffer.count({
			where: { processedAt: null },
		});
		metrics.ingestQueueDepth.set(count);
	} catch (error) {
		logger.error("Failed to collect ingest queue depth metric", { error });
	}
}
