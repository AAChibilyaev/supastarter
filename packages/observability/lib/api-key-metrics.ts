import { db } from "@repo/database";
import { logger } from "@repo/logs";

import type { PrometheusMetrics } from "./registry";

/**
 * Collect the number of active (non-revoked, non-expired) search API keys
 * and set the gauge.
 */
export async function collectActiveApiKeys(metrics: PrometheusMetrics): Promise<void> {
	try {
		const count = await db.searchApiKey.count({
			where: {
				revokedAt: null,
				OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			},
		});
		metrics.activeApiKeys.set(count);
	} catch (error) {
		logger.error("Failed to collect active API keys metric", { error });
	}
}
