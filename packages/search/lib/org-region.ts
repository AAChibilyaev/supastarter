import "server-only";
import type { StorageRegion } from "./regions";
import { DEFAULT_REGION, isValidRegion } from "./regions";

/**
 * Get the storage region for an organization.
 *
 * Returns the region code stored in the organization's `storageRegion` field.
 * Falls back to DEFAULT_REGION if not set.
 *
 * NOTE: This is designed to work BEFORE the schema change is merged.
 * If `storageRegion` doesn't exist yet on the model, it returns DEFAULT_REGION.
 * In production, this queries the Prisma Organization model.
 */
export async function getOrganizationStorageRegion(organizationId: string): Promise<StorageRegion> {
	try {
		// Dynamic import to avoid pulling in Prisma on the client side
		const { db } = await import("@repo/database");

		const org = await prisma.organization.findUnique({
			where: { id: organizationId },
			select: { storageRegion: true as never },
		});

		if (org && typeof org === "object" && "storageRegion" in (org as Record<string, unknown>)) {
			const region = (org as Record<string, unknown>).storageRegion as string;
			if (isValidRegion(region)) {
				return region;
			}
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
