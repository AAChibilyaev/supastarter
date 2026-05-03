import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { AVAILABLE_REGIONS, migrateOrganizationData } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../../search/lib/access";

// ── Schemas ────────────────────────────────────────────────────────

const migrateOrgInput = z.object({
	organizationId: z.string(),
	sourceRegion: z.string(),
	destRegion: z.string(),
});

const migrationProgressSchema = z.object({
	totalDocuments: z.number(),
	exported: z.number(),
	imported: z.number(),
	failures: z.number(),
	completed: z.boolean(),
	errors: z.array(z.string()),
});

const migrateResultSchema = z.object({
	success: z.boolean(),
	collection: z.string(),
	sourceRegion: z.string(),
	destRegion: z.string(),
	progress: migrationProgressSchema,
	durationMs: z.number(),
});

// ── Procedure: Migrate Organization Data ──────────────────────────

/**
 * Migrate all search data for an organization from one region to another.
 *
 * This exports documents from the source region's Typesense cluster and
 * imports them into the destination region's cluster. The source data
 * is preserved (copy operation).
 */
export const migrateOrgData = protectedProcedure
	.route({
		method: "POST",
		path: "/compliance/organizations/{organizationId}/migrate",
		tags: ["Compliance", "Organizations"],
		summary: "Migrate organization data between storage regions",
		description:
			"Exports all search data from the source region's Typesense cluster " +
			"and imports it into the destination cluster. This is a copy operation — " +
			"source data is preserved. After migration completes, update the org's " +
			"storage region setting to route new queries to the destination.",
	})
	.input(migrateOrgInput)
	.output(
		z.object({
			success: z.boolean(),
			results: z.array(migrateResultSchema),
			message: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId, sourceRegion, destRegion }, context }) => {
		await requireOrganizationAdmin(organizationId, context.user);

		// Validate regions
		if (!isValidRegionCode(sourceRegion)) {
			return {
				success: false,
				results: [],
				message: `Invalid source region: ${sourceRegion}. Valid: ${AVAILABLE_REGIONS.map((r) => r.code).join(", ")}`,
			};
		}
		if (!isValidRegionCode(destRegion)) {
			return {
				success: false,
				results: [],
				message: `Invalid destination region: ${destRegion}. Valid: ${AVAILABLE_REGIONS.map((r) => r.code).join(", ")}`,
			};
		}
		if (sourceRegion === destRegion) {
			return {
				success: false,
				results: [],
				message: "Source and destination regions must be different.",
			};
		}

		try {
			const results = await migrateOrganizationData(
				organizationId,
				organizationId,
				sourceRegion as import("@repo/search").StorageRegion,
				destRegion as import("@repo/search").StorageRegion,
			);

			const allSucceeded = results.every((r) => r.success);
			const totalMigrated = results.reduce((sum, r) => sum + r.progress.imported, 0);
			const totalFailures = results.reduce((sum, r) => sum + r.progress.failures, 0);

			return {
				success: allSucceeded,
				results: results.map((r) => ({
					success: r.success,
					collection: r.collection,
					sourceRegion: r.sourceRegion,
					destRegion: r.destRegion,
					progress: r.progress,
					durationMs: r.durationMs,
				})),
				message: allSucceeded
					? `Migration completed successfully. ${totalMigrated} documents migrated to ${destRegion.toUpperCase()}.`
					: `Migration completed with ${totalFailures} failures. ${totalMigrated} documents migrated. Check logs for details.`,
			};
		} catch (error) {
			logger.error("Migration failed", {
				organizationId,
				sourceRegion,
				destRegion,
				error,
			});
			return {
				success: false,
				results: [],
				message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	});

function isValidRegionCode(code: string): boolean {
	return AVAILABLE_REGIONS.some((r) => r.code === code);
}
