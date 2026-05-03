import "server-only";
import { db } from "@repo/database";
import { logger } from "@repo/logs";

import { getTypesenseClient, getTypesenseClientForOrg } from "./client";
import { aliasName } from "./collections";
import type { StorageRegion } from "./regions";

export type HealthStatus = "healthy" | "warning" | "critical";

export interface IndexHealthResult {
	indexId: string;
	organizationId: string;
	slug: string;
	status: HealthStatus;
	/** Ratio of (expected - actual) / expected, signed. Positive = more docs in DB queue than in Typesense. */
	docCountDrift: number | null;
	/** Seconds since the oldest unprocessed ingest row was created, or null if queue is clear. */
	ingestLagSeconds: number | null;
	/** Ratio of failed / (success + failed) ingest rows in the last 24 h, or null if no rows. */
	errorRate: number | null;
	/** Actual document count in Typesense, or null if collection not found. */
	actualDocCount: number | null;
	/** Expected document count based on successfully processed ingest rows. */
	expectedDocCount: number;
}

const DOC_DRIFT_THRESHOLD = 0.05; // 5%
const INGEST_LAG_THRESHOLD_SECONDS = 5 * 60; // 5 minutes
const ERROR_RATE_THRESHOLD = 0.01; // 1%

function computeStatus(result: Omit<IndexHealthResult, "status">): HealthStatus {
	let worst: HealthStatus = "healthy";

	if (
		result.ingestLagSeconds !== null &&
		result.ingestLagSeconds > INGEST_LAG_THRESHOLD_SECONDS
	) {
		worst = "warning";
	}

	if (result.errorRate !== null && result.errorRate > ERROR_RATE_THRESHOLD) {
		worst = "warning";
	}

	if (result.docCountDrift !== null && Math.abs(result.docCountDrift) > DOC_DRIFT_THRESHOLD) {
		worst = "critical";
	}

	return worst;
}

/**
 * Checks the health of a single search index by comparing the expected document
 * count (from processed ingest rows) with the actual count in Typesense, and by
 * looking at ingest lag and error rates.
 */
export async function checkIndexHealth(
	organizationId: string,
	indexSlug: string,
): Promise<IndexHealthResult> {
	// Fetch the index from the DB.
	const index = await db.searchIndex.findUnique({
		where: { organizationId_slug: { organizationId, slug: indexSlug } },
		select: { id: true, organizationId: true, slug: true },
	});

	if (!index) {
		throw new Error(
			`checkIndexHealth: index not found for org=${organizationId} slug=${indexSlug}`,
		);
	}

	const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

	// Counts from ingest buffer in last 24 h (for error rate).
	const [successCount, failedCount, pendingOldest] = await Promise.all([
		db.searchIngestBuffer.count({
			where: {
				indexId: index.id,
				processedAt: { not: null, gte: windowStart },
			},
		}),
		db.searchIngestBuffer.count({
			where: {
				indexId: index.id,
				processedAt: null,
				attempts: { gt: 0 },
				createdAt: { gte: windowStart },
			},
		}),
		// Oldest unprocessed row (for ingest lag).
		db.searchIngestBuffer.findFirst({
			where: {
				indexId: index.id,
				processedAt: null,
			},
			orderBy: { createdAt: "asc" },
			select: { createdAt: true },
		}),
	]);

	const totalIngestRows = successCount + failedCount;
	const errorRate = totalIngestRows > 0 ? failedCount / totalIngestRows : null;

	const ingestLagSeconds =
		pendingOldest !== null
			? Math.floor((Date.now() - pendingOldest.createdAt.getTime()) / 1000)
			: null;

	// Expected doc count = total successfully processed upsert rows (all time, as a proxy).
	const expectedDocCount = await db.searchIngestBuffer.count({
		where: {
			indexId: index.id,
			action: "upsert",
			processedAt: { not: null },
		},
	});

	// Actual doc count from Typesense.
	let actualDocCount: number | null = null;
	let docCountDrift: number | null = null;

	try {
		const client = await getTypesenseClientForOrg(organizationId);
		const alias = aliasName(organizationId, indexSlug);
		const collection = await client.collections(alias).retrieve();
		const numDocs = collection.num_documents ?? 0;
		actualDocCount = numDocs;

		if (expectedDocCount > 0) {
			docCountDrift = (expectedDocCount - numDocs) / expectedDocCount;
		} else if (numDocs > 0) {
			// No processed rows but docs exist — drift is negative (unexpected docs).
			docCountDrift = -1;
		}
	} catch (error) {
		// Collection may not exist yet (no documents ingested).
		logger.warn("checkIndexHealth: could not retrieve Typesense collection", {
			organizationId,
			slug: indexSlug,
			error,
		});
	}

	const partial = {
		indexId: index.id,
		organizationId: index.organizationId,
		slug: index.slug,
		docCountDrift,
		ingestLagSeconds,
		errorRate,
		actualDocCount,
		expectedDocCount,
	};

	return { ...partial, status: computeStatus(partial) };
}

/**
 * Runs health checks on ALL indexes for a given organization.
 */
export async function checkAllIndexesHealth(organizationId: string): Promise<IndexHealthResult[]> {
	const indexes = await db.searchIndex.findMany({
		where: { organizationId },
		select: { slug: true },
	});

	const results: IndexHealthResult[] = [];
	for (const { slug } of indexes) {
		try {
			const result = await checkIndexHealth(organizationId, slug);
			results.push(result);
		} catch (error) {
			logger.error("checkAllIndexesHealth: failed for index", {
				organizationId,
				slug,
				error,
			});
		}
	}
	return results;
}

// ── Region health check ─────────────────────────────────────────────────

export interface RegionHealthResult {
	region: string;
	label: string;
	online: boolean;
	latencyMs: number | null;
	error: string | null;
}

/**
 * Check health of all configured Typesense regions.
 *
 * Pings each region's Typesense health endpoint and reports connectivity.
 * Useful for the dashboard region status indicator and for operational monitoring.
 */
export async function checkAllRegionsHealth(): Promise<RegionHealthResult[]> {
	const { AVAILABLE_REGIONS } = await import("./regions");
	const results: RegionHealthResult[] = [];

	for (const region of AVAILABLE_REGIONS) {
		const result = await checkRegionHealth(region.code);
		results.push(result);
	}

	return results;
}

/**
 * Check health of a specific Typesense region.
 */
export async function checkRegionHealth(region: StorageRegion): Promise<RegionHealthResult> {
	const { AVAILABLE_REGIONS: regions } = await import("./regions");
	const info = regions.find((r) => r.code === region);

	const start = Date.now();
	try {
		const client = getTypesenseClient(region);
		const health = await client.health.retrieve();
		const latencyMs = Date.now() - start;

		return {
			region,
			label: info?.label ?? region.toUpperCase(),
			online: health.ok,
			latencyMs,
			error: null,
		};
	} catch (error) {
		const latencyMs = Date.now() - start;
		return {
			region,
			label: info?.label ?? region.toUpperCase(),
			online: false,
			latencyMs,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
