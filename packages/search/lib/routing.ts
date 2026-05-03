import "server-only";
import { logger } from "@repo/logs";

import { getTypesenseClient } from "./client";
import { checkRegionHealth } from "./health";
import { AVAILABLE_REGIONS, DEFAULT_REGION, type StorageRegion } from "./regions";

// ─── Types ──────────────────────────────────────────────────────

export interface RegionHealthEntry {
	region: StorageRegion;
	online: boolean;
	latencyMs: number | null;
	lastCheckedAt: number;
}

export interface FailoverResult {
	client: ReturnType<typeof getTypesenseClient>;
	region: StorageRegion;
	label: string;
	failoverCount: number;
}

// ─── Region Health Cache ────────────────────────────────────────

const REGION_HEALTH_TTL_MS = 30_000; // 30 seconds
const FAILOVER_BLACKLIST_TTL_MS = 60_000; // 1 minute
const MAX_FAILOVER_REGIONS = 3; // Try at most 3 regions before giving up

/**
 * In-memory cache of Typesense region health status.
 * Registers a region as "offline" when a request to it fails.
 * Offline regions stay blacklisted for FAILOVER_BLACKLIST_TTL_MS.
 */
class RegionHealthCache {
	private entries = new Map<StorageRegion, RegionHealthEntry>();
	private blacklistedUntil = new Map<StorageRegion, number>();

	/**
	 * Mark a region as healthy (online) with measured latency.
	 */
	setHealthy(region: StorageRegion, latencyMs: number): void {
		this.entries.set(region, {
			region,
			online: true,
			latencyMs,
			lastCheckedAt: Date.now(),
		});
		this.blacklistedUntil.delete(region);
	}

	/**
	 * Mark a region as unhealthy (offline).
	 */
	setOffline(region: StorageRegion, latencyMs: number | null): void {
		this.entries.set(region, {
			region,
			online: false,
			latencyMs,
			lastCheckedAt: Date.now(),
		});
		this.blacklistedUntil.set(region, Date.now() + FAILOVER_BLACKLIST_TTL_MS);
	}

	/**
	 * Check if a region is currently considered online.
	 * A region is online if it was marked healthy within the TTL window
	 * and hasn't been blacklisted for failover.
	 */
	isOnline(region: StorageRegion): boolean {
		const blacklistedUntil = this.blacklistedUntil.get(region);
		if (blacklistedUntil && Date.now() < blacklistedUntil) {
			return false;
		}

		const entry = this.entries.get(region);
		if (!entry) return true; // Unknown — assume online (optimistic)

		// If TTL expired, it's stale — assume online
		if (Date.now() - entry.lastCheckedAt > REGION_HEALTH_TTL_MS) {
			return true;
		}

		return entry.online;
	}

	/**
	 * Get the best available region (lowest latency among online regions).
	 * Falls back to the default region if none are known to be online.
	 */
	getBestRegion(preferred?: StorageRegion): { region: StorageRegion; label: string } {
		// If preferred region is online, use it
		if (preferred && this.isOnline(preferred)) {
			const info = AVAILABLE_REGIONS.find((r) => r.code === preferred);
			return { region: preferred, label: info?.label ?? preferred.toUpperCase() };
		}

		// Find the online region with lowest latency
		let best: { region: StorageRegion; latency: number } | null = null;
		for (const r of AVAILABLE_REGIONS) {
			if (!this.isOnline(r.code)) continue;
			const entry = this.entries.get(r.code);
			const latency = entry?.latencyMs ?? Infinity;
			if (!best || latency < best.latency) {
				best = { region: r.code, latency };
			}
		}

		if (best) {
			const info = AVAILABLE_REGIONS.find((r) => r.code === best!.region);
			return { region: best.region, label: info?.label ?? best.region.toUpperCase() };
		}

		// All regions unknown — try preferred first, then default
		const fallback = preferred ?? DEFAULT_REGION;
		const info = AVAILABLE_REGIONS.find((r) => r.code === fallback);
		return { region: fallback, label: info?.label ?? fallback.toUpperCase() };
	}

	/**
	 * Get sorted list of online regions by latency (ascending).
	 */
	getOnlineRegionsSorted(): StorageRegion[] {
		const online: Array<{ region: StorageRegion; latency: number }> = [];
		for (const r of AVAILABLE_REGIONS) {
			if (!this.isOnline(r.code)) continue;
			const entry = this.entries.get(r.code);
			online.push({
				region: r.code,
				latency: entry?.latencyMs ?? Infinity,
			});
		}
		online.sort((a, b) => a.latency - b.latency);
		return online.map((o) => o.region);
	}

	/**
	 * Get all cached health entries (for API responses).
	 */
	getAllEntries(): Map<StorageRegion, RegionHealthEntry> {
		return new Map(this.entries);
	}

	/**
	 * Clear all cached health data.
	 */
	clear(): void {
		this.entries.clear();
		this.blacklistedUntil.clear();
	}
}

// Singleton cache
let healthCache: RegionHealthCache | null = null;

function getHealthCache(): RegionHealthCache {
	if (!healthCache) {
		healthCache = new RegionHealthCache();
	}
	return healthCache;
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Get a Typesense client for an organization with automatic failover.
 *
 * Primary behavior:
 * 1. Resolve the org's storage region
 * 2. If the primary region is online, use it
 * 3. If the primary region is offline (cached), fail over to the next-healthy region
 * 4. If all regions offline, try the primary region as a last resort
 *
 * The health cache is TTL-based (30s stale -> re-check). Regions are
 * blacklisted for 60s after a failure to prevent rapid retry storms.
 *
 * @param organizationId - Organization to route for
 * @param options.allowRegionOverride - If true, may route to a non-preferred region
 *   (useful for read/search queries where strict data residency is not enforced for reads).
 *   Default: false (strict data residency).
 */
export async function getClientWithFailover(
	organizationId: string,
	options?: { allowRegionOverride?: boolean },
): Promise<FailoverResult> {
	const cache = getHealthCache();
	const { getOrganizationStorageRegion } = await import("./org-region");
	const orgRegion = await getOrganizationStorageRegion(organizationId);
	const info = AVAILABLE_REGIONS.find((r) => r.code === orgRegion);

	let failoverCount = 0;
	let selectedRegion = orgRegion;

	// If primary region is online, use it directly
	if (cache.isOnline(orgRegion)) {
		return {
			client: getTypesenseClient(orgRegion),
			region: orgRegion,
			label: info?.label ?? orgRegion.toUpperCase(),
			failoverCount: 0,
		};
	}

	// Primary region is offline — try failover regions
	const onlineRegions = options?.allowRegionOverride
		? cache.getOnlineRegionsSorted().filter((r) => r !== orgRegion)
		: []; // If allowRegionOverride is false, don't failover to other regions

	if (options?.allowRegionOverride && onlineRegions.length > 0) {
		selectedRegion = onlineRegions[0];
		failoverCount = 1;
		const failoverInfo = AVAILABLE_REGIONS.find((r) => r.code === selectedRegion);

		logger.warn("Failover: routing org to alternate region", {
			organizationId,
			primaryRegion: orgRegion,
			failoverRegion: selectedRegion,
			onlineRegions,
		});

		return {
			client: getTypesenseClient(selectedRegion),
			region: selectedRegion,
			label: failoverInfo?.label ?? selectedRegion.toUpperCase(),
			failoverCount,
		};
	}

	// Last resort — attempt primary region anyway (might be a stale cache)
	logger.warn("Failover: no online regions, attempting primary region as last resort", {
		organizationId,
		primaryRegion: orgRegion,
	});

	return {
		client: getTypesenseClient(orgRegion),
		region: orgRegion,
		label: info?.label ?? orgRegion.toUpperCase(),
		failoverCount: 0,
	};
}

/**
 * Perform a health check on a specific region and update the cache.
 * Call this after a successful or failed Typesense operation to keep
 * the health cache current.
 */
export async function recordRegionHealth(region: StorageRegion): Promise<void> {
	try {
		const result = await checkRegionHealth(region);
		const cache = getHealthCache();
		if (result.online) {
			cache.setHealthy(region, result.latencyMs ?? 0);
		} else {
			cache.setOffline(region, result.latencyMs);
		}
	} catch {
		// Silently ignore — health check failures are expected during network issues
	}
}

/**
 * Record a region as online after a successful operation.
 * Faster than a full health check for real-time tracking.
 */
export function recordRegionOnline(region: StorageRegion, latencyMs: number): void {
	getHealthCache().setHealthy(region, latencyMs);
}

/**
 * Record a region as offline after a failed operation.
 */
export function recordRegionOffline(region: StorageRegion): void {
	getHealthCache().setOffline(region, null);
}

/**
 * Get a snapshot of all region health statuses.
 */
export function getAllRegionHealth(): RegionHealthEntry[] {
	const cache = getHealthCache();
	const allEntries = cache.getAllEntries();
	return AVAILABLE_REGIONS.map((r) => {
		const entry = allEntries.get(r.code);
		return {
			region: r.code,
			online: cache.isOnline(r.code),
			latencyMs: entry?.latencyMs ?? null,
			lastCheckedAt: entry?.lastCheckedAt ?? 0,
		};
	});
}

/**
 * Clear the health cache (for testing or configuration changes).
 */
export function clearHealthCache(): void {
	getHealthCache().clear();
}

// ─── Failover Operation Wrapper ──────────────────────────────────

export interface FailoverOperationOptions {
	/** Organization ID to resolve routing for */
	organizationId: string;
	/** Whether to allow routing to non-primary regions on failover */
	allowRegionOverride: boolean;
	/** Number of regions to try before giving up (default: all available) */
	maxAttempts?: number;
}

/**
 * Wraps a Typesense search/ingest operation with automatic failover retry.
 *
 * 1. Resolves the best region for the org (via getClientWithFailover)
 * 2. Executes the operation, measuring latency
 * 3. On success: records latency for the region
 * 4. On failure: marks region offline, retries with next-best region
 * 5. If all regions exhausted, throws the last error
 *
 * @example
 * ```ts
 * const result = await withSearchFailover(
 *   { organizationId: tenantId, allowRegionOverride: true },
 *   async (client) => client.collections(alias).documents().search(params)
 * );
 * ```
 */
export async function withSearchFailover<T>(
	options: FailoverOperationOptions,
	fn: (client: ReturnType<typeof getTypesenseClient>) => Promise<T>,
): Promise<{ result: T; region: StorageRegion; failoverCount: number }> {
	const cache = getHealthCache();
	const { getOrganizationStorageRegion } = await import("./org-region");
	const primaryRegion = await getOrganizationStorageRegion(options.organizationId);

	// Build ordered list of regions to try: start with best for this org
	const triedRegions = new Set<StorageRegion>();
	let lastError: unknown;
	let failoverCount = 0;

	// Try primary first (or best available), then cycle through failover candidates
	const regionCandidates = getRegionFailoverOrder(
		primaryRegion,
		cache,
		options.allowRegionOverride,
	);

	for (const region of regionCandidates) {
		if (triedRegions.has(region)) continue;
		triedRegions.add(region);

		if (options.maxAttempts !== undefined && triedRegions.size > options.maxAttempts) {
			break;
		}

		const start = Date.now();
		try {
			const client = getTypesenseClient(region);
			const result = await fn(client);
			cache.setHealthy(region, Date.now() - start);
			return { result, region, failoverCount };
		} catch (error) {
			lastError = error;
			cache.setOffline(region, null);
			failoverCount++;

			logger.warn("Failover: region request failed, trying next region", {
				region,
				organizationId: options.organizationId,
				failoverCount,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// All regions exhausted — throw last error
	throw lastError ?? new Error("withSearchFailover: no regions available to try");
}

/**
 * Build ordered list of regions to attempt for a failover-aware operation.
 *
 * Strategy:
 * 1. Primary region first (if online or unknown)
 * 2. Then all other online regions sorted by latency (ascending)
 * 3. If allowRegionOverride is false, only the primary region is included
 */
function getRegionFailoverOrder(
	primaryRegion: StorageRegion,
	cache: RegionHealthCache,
	allowRegionOverride: boolean,
): StorageRegion[] {
	const order: StorageRegion[] = [primaryRegion];

	if (!allowRegionOverride) {
		return order;
	}

	// Add other online regions sorted by latency
	for (const r of cache.getOnlineRegionsSorted()) {
		if (r !== primaryRegion) {
			order.push(r);
		}
	}

	// If no online regions known beyond primary, add all available
	if (order.length === 1) {
		for (const r of AVAILABLE_REGIONS) {
			if (r.code !== primaryRegion && !order.includes(r.code)) {
				order.push(r.code);
			}
		}
	}

	return order;
}
