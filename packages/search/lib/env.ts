import "server-only";
import type { StorageRegion } from "./regions";

interface TypesenseEnv {
	host: string;
	port: number;
	protocol: "http" | "https";
	adminApiKey: string;
}

let cachedDefault: TypesenseEnv | null = null;
const cachedPerRegion = new Map<StorageRegion, TypesenseEnv>();

/**
 * Get Typesense connection environment variables for a specific region.
 *
 * Falls back to the default TYPESENSE_HOST / TYPESENSE_PORT / etc. if the
 * region-specific env var is not set (backward-compatible with single-region setups).
 */
export function getTypesenseEnv(region?: StorageRegion): TypesenseEnv {
	// No region specified → return default (backward-compatible)
	if (!region) {
		if (cachedDefault) return cachedDefault;
		cachedDefault = resolveTypesenseEnv();
		return cachedDefault;
	}

	// Region-specific cache
	const cached = cachedPerRegion.get(region);
	if (cached) return cached;

	const env = resolveTypesenseEnv(region);
	cachedPerRegion.set(region, env);
	return env;
}

function resolveTypesenseEnv(region?: StorageRegion): TypesenseEnv {
	const regionKey = region?.toUpperCase();

	const host = regionKey
		? (process.env[`TYPESENSE_HOST_${regionKey}`] ?? process.env.TYPESENSE_HOST)
		: process.env.TYPESENSE_HOST;
	const adminApiKey = regionKey
		? (process.env[`TYPESENSE_ADMIN_API_KEY_${regionKey}`] ??
			process.env.TYPESENSE_ADMIN_API_KEY)
		: process.env.TYPESENSE_ADMIN_API_KEY;

	if (!host) {
		throw new Error(
			region
				? `TYPESENSE_HOST_${prefix}E (or TYPESENSE_HOST) is not set for region "${region}"`
				: "TYPESENSE_HOST is not set",
		);
	}
	if (!adminApiKey) {
		throw new Error(
			region
				? `TYPESENSE_ADMIN_API_KEY_${prefix}E (or TYPESENSE_ADMIN_API_KEY) is not set for region "${region}"`
				: "TYPESENSE_ADMIN_API_KEY is not set",
		);
	}

	// Wrap IPv6 literals in brackets
	const normalizedHost = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;

	const protocolRaw = (
		process.env[`TYPESENSE_PROTOCOL_${prefix}E`] ??
		process.env.TYPESENSE_PROTOCOL ??
		"http"
	).toLowerCase();
	if (protocolRaw !== "http" && protocolRaw !== "https") {
		throw new Error(
			region
				? `TYPESENSE_PROTOCOL_${prefix}E must be 'http' or 'https'`
				: "TYPESENSE_PROTOCOL must be 'http' or 'https'",
		);
	}

	const portRaw =
		process.env[`TYPESENSE_PORT_${prefix}E`] ??
		process.env.TYPESENSE_PORT ??
		(protocolRaw === "https" ? "443" : "8108");
	const port = Number.parseInt(portRaw, 10);
	if (!Number.isFinite(port)) {
		throw new Error(
			region
				? `TYPESENSE_PORT_${prefix}E must be a number`
				: "TYPESENSE_PORT must be a number",
		);
	}

	return { host: normalizedHost, port, protocol: protocolRaw, adminApiKey };
}
