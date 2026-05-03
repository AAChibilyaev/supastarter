import "server-only";

/**
 * Supported storage regions for data residency compliance.
 *
 * Each region runs an independent AACsearch stack with its own
 * Typesense cluster, PostgreSQL database, and MinIO storage.
 */
export type StorageRegion = "eu" | "us" | "ru";

/**
 * Metadata about each storage region.
 */
export interface RegionInfo {
	/** Region code */
	code: StorageRegion;
	/** Human-readable location */
	label: string;
	/** Compliance frameworks */
	compliance: string[];
	/** Geographic location */
	location: string;
}

/**
 * All available regions with metadata.
 */
export const AVAILABLE_REGIONS: RegionInfo[] = [
	{
		code: "eu",
		label: "Europe (Frankfurt)",
		compliance: ["GDPR"],
		location: "Frankfurt, Germany",
	},
	{
		code: "us",
		label: "United States (Virginia)",
		compliance: ["SOC2", "CCPA"],
		location: "Virginia, USA",
	},
	{
		code: "ru",
		label: "Russia (Moscow)",
		compliance: ["152-ФЗ", "242-ФЗ"],
		location: "Moscow, Russia",
	},
];

/**
 * Default region when none is selected (GDPR-compliant by default).
 */
export const DEFAULT_REGION: StorageRegion = "eu";

/**
 * Validate a region code.
 */
export function isValidRegion(code: string): code is StorageRegion {
	return AVAILABLE_REGIONS.some((r) => r.code === code);
}
