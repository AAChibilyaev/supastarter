import { db } from "@repo/database";
import { checkAllRegionsHealth, type RegionHealthResult } from "@repo/search";
import { AVAILABLE_REGIONS, DEFAULT_REGION, isValidRegion } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../../search/lib/access";

// ── Constants ─────────────────────────────────────────────────────

// ── Schemas ────────────────────────────────────────────────────────

const regionInfoSchema = z.object({
	code: z.string(),
	label: z.string(),
	compliance: z.array(z.string()),
	location: z.string(),
});

export const setOrgRegionInput = z.object({
	organizationId: z.string(),
	region: z.string().refine(isValidRegion, {
		message: "Invalid region code. Must be one of: eu, us, ru",
	}),
});

export const orgRegionResponseSchema = z.object({
	region: z.string(),
	label: z.string(),
	location: z.string(),
	compliance: z.array(z.string()),
});

export type OrgRegionResponse = z.infer<typeof orgRegionResponseSchema>;

// ── Helpers ────────────────────────────────────────────────────────

function getRegionInfo(region: string) {
	return AVAILABLE_REGIONS.find((r) => r.code === region);
}

function buildRegionResponse(region: string): OrgRegionResponse {
	const info = getRegionInfo(region);
	return {
		region,
		label: info?.label ?? region.toUpperCase(),
		location: info?.location ?? region.toUpperCase(),
		compliance: info?.compliance ?? [],
	};
}

// ── Procedures ─────────────────────────────────────────────────────

/**
 * List all available storage regions with their metadata.
 */
export const listRegions = protectedProcedure
	.route({
		method: "GET",
		path: "/compliance/regions",
		tags: ["Compliance"],
		summary: "List available storage regions",
		description: "Returns all supported data storage regions with compliance metadata.",
	})
	.output(
		z.object({
			regions: z.array(regionInfoSchema),
			defaultRegion: z.string(),
		}),
	)
	.handler(async () => {
		return {
			regions: AVAILABLE_REGIONS.map((r) => ({
				code: r.code,
				label: r.label,
				compliance: r.compliance,
				location: r.location,
			})),
			defaultRegion: DEFAULT_REGION,
		};
	});

/**
 * Get the current storage region for an organization.
 */
export const getOrgRegion = protectedProcedure
	.route({
		method: "GET",
		path: "/compliance/organizations/{organizationId}/region",
		tags: ["Compliance", "Organizations"],
		summary: "Get organization storage region",
		description: "Returns the data storage region and compliance metadata for an organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(orgRegionResponseSchema)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationAdmin(organizationId, user);

		const org = await db.organization.findUniqueOrThrow({
			where: { id: organizationId },
			select: { storageRegion: true },
		});

		const region = org.storageRegion && isValidRegion(org.storageRegion)
			? org.storageRegion
			: DEFAULT_REGION;

		return buildRegionResponse(region);
	});

/**
 * Set the storage region for an organization.
 *
 * NOTE: Changing the region does NOT automatically migrate existing data.
 * Data migration is a separate action that must be performed explicitly.
 */
export const setOrgRegion = protectedProcedure
	.route({
		method: "PUT",
		path: "/compliance/organizations/{organizationId}/region",
		tags: ["Compliance", "Organizations"],
		summary: "Set organization storage region",
		description:
			"Sets the target storage region for an organization. " +
			"This updates the routing target for new data. " +
			"Use the migrate endpoint to move existing data between regions.",
	})
	.input(setOrgRegionInput)
	.output(
		z.object({
			success: z.boolean(),
			region: orgRegionResponseSchema,
			message: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId, region }, context: { user } }) => {
		await requireOrganizationAdmin(organizationId, user);

		const org = await db.organization.findUniqueOrThrow({
			where: { id: organizationId },
			select: { storageRegion: true, name: true },
		});

		const previousRegion = org.storageRegion && isValidRegion(org.storageRegion)
			? org.storageRegion
			: DEFAULT_REGION;

		await db.organization.update({
			where: { id: organizationId },
			data: { storageRegion: region },
		});

		const newInfo = getRegionInfo(region);
		const message =
			previousRegion !== region
				? `Storage region updated from ${previousRegion.toUpperCase()} to ${region.toUpperCase()}. ` +
					`New search data will be routed to ${newInfo?.location ?? region.toUpperCase()}. ` +
					"Run data migration to move existing data."
				: "Storage region unchanged.";

		return {
			success: true,
			region: buildRegionResponse(region),
			message,
		};
	});

/**
 * Check health of all configured Typesense regions.
 */
export const checkRegionsHealth = protectedProcedure
	.route({
		method: "GET",
		path: "/compliance/regions/health",
		tags: ["Compliance", "Health"],
		summary: "Check health of all storage regions",
		description:
			"Pings each configured Typesense region and returns connectivity status, " +
			"latency, and error info for operational monitoring.",
	})
	.output(
		z.array(
			z.object({
				region: z.string(),
				label: z.string(),
				online: z.boolean(),
				latencyMs: z.number().nullable(),
				error: z.string().nullable(),
			}),
		),
	)
	.handler(async () => {
		const results: RegionHealthResult[] = await checkAllRegionsHealth();
		return results.map((r) => ({
			region: r.region,
			label: r.label,
			online: r.online,
			latencyMs: r.latencyMs,
			error: r.error,
		}));
	});
