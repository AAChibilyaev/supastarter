import "server-only";
import { Client } from "typesense";

import { getTypesenseEnv } from "./env";
import type { StorageRegion } from "./regions";
import { DEFAULT_REGION } from "./regions";

let cachedClient: Client | null = null;
const cachedClients = new Map<StorageRegion, Client>();

/**
 * Get the Typesense client for the default (or specified) region.
 *
 * This is the main entry point for search/ingest operations.
 * When no region is specified, returns the default EU region client
 * (backward-compatible with single-region setups).
 */
export function getTypesenseClient(region?: StorageRegion): Client {
	// No region → default (backward-compatible)
	if (!region) {
		return getDefaultClient();
	}

	// Check cache
	const existing = cachedClients.get(region);
	if (existing) return existing;

	// Create new client for this region
	const client = createClient(region);
	cachedClients.set(region, client);
	return client;
}

/**
 * Get Typesense client for a specific organization.
 *
 * Looks up the organization's storage region and returns the
 * appropriate Typesense client for that region.
 * Falls back to the default client if the org has no region set.
 */
export async function getTypesenseClientForOrg(organizationId: string): Promise<Client> {
	// Dynamic import to avoid circular dependency
	const { getOrganizationStorageRegion } = await import("./org-region");
	const region = await getOrganizationStorageRegion(organizationId);
	return getTypesenseClient(region);
}

function getDefaultClient(): Client {
	if (cachedClient) return cachedClient;

	cachedClient = createClient();
	return cachedClient;
}

function createClient(region?: StorageRegion): Client {
	const env = getTypesenseEnv(region);

	return new Client({
		nodes: [
			{
				host: env.host,
				port: env.port,
				protocol: env.protocol,
			},
		],
		apiKey: env.adminApiKey,
		connectionTimeoutSeconds: 5,
		retryIntervalSeconds: 1,
		numRetries: 2,
	});
}

/**
 * Clear all cached Typesense clients.
 * Useful for testing or after env var changes.
 */
export function clearTypesenseClientCache(): void {
	cachedClient = null;
	cachedClients.clear();
}
