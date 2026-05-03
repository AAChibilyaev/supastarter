import { db } from "@repo/database";
import { logger } from "@repo/logs";

import type { PrometheusMetrics } from "./registry";

/**
 * Collect the ingest error rate — ratio of failed ingest buffer rows
 * to total rows in the last 24 hours. Sets the gauge as 0.0 – 1.0.
 */
export async function collectErrorRate(metrics: PrometheusMetrics): Promise<void> {
	try {
		const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

		const [failedCount, totalCount] = await Promise.all([
			db.searchIngestBuffer.count({
				where: {
					processedAt: null,
					attempts: { gt: 0 },
					createdAt: { gte: since },
				},
			}),
			db.searchIngestBuffer.count({
				where: {
					createdAt: { gte: since },
				},
			}),
		]);

		const rate = totalCount > 0 ? failedCount / totalCount : 0;
		metrics.errorRate.set(rate);
	} catch (error) {
		logger.error("Failed to collect error rate metric", { error });
	}
}
