import "server-only";
import type { Prisma } from "@repo/database";

import type { StorageRegion } from "./regions";
import { DEFAULT_REGION, isValidRegion } from "./regions";

/**
 * Get the storage region for an organization.
 *
 * Returns the region code stored in the organization's `storageRegion` field.
 * Falls back to DEFAULT_REGION if not set.
 */
export async function getOrganizationStorageRegion(organizationId: string): Promise<StorageRegion> {
	try {
		// Dynamic import to avoid pulling in Prisma on the client side
		const { db } = await import("@repo/database");

		const org = (await db.organization.findUnique({
			where: { id: organizationId },
			select: { storageRegion: true },
		})) as { storageRegion: string | null } | null;

		if (org?.storageRegion && isValidRegion(org.storageRegion)) {
			return org.storageRegion;
		}

		return DEFAULT_REGION;
	} catch {
		// If the schema doesn't have storageRegion yet, fall back to default
		return DEFAULT_REGION;
	}
}

/**
 * Available regions for display/selection.
 * Re-exported for convenience.
 */
export { AVAILABLE_REGIONS, DEFAULT_REGION, isValidRegion } from "./regions";
export type { RegionInfo, StorageRegion } from "./regions";
