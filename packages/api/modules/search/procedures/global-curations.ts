import { logger } from "@repo/logs";
import { typesenseFetch } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

const GLOBAL_PREFIX = "global_cur_";

/**
 * Sanitize a string for use as a Typesense curation set ID.
 */
function sanitizeId(id: string): string {
	return id.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

interface CurationSetRecord {
	id: string;
	query: string;
	pinned_ids: string[];
	hidden_ids: string[];
	filter?: string;
}

interface CurationSetList {
	curation_sets: CurationSetRecord[];
}

const globalCurationSchema = z.object({
	query: z.string().min(1).max(500),
	pinnedIds: z.array(z.string()).default([]),
	hiddenIds: z.array(z.string()).default([]),
	filter: z.string().max(500).optional(),
});

export const getGlobalCurations = protectedProcedure
	.route({
		method: "GET",
		path: "/search/global-curations",
		tags: ["Search"],
		summary: "Get global curation sets",
		description:
			"Returns all global curation overrides that apply to all indexes in the organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(z.array(globalCurationSchema))
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		try {
			const result = await typesenseFetch<CurationSetList>("GET", "/curation_sets");
			const allSets = result.curation_sets ?? [];
			const prefix = `${GLOBAL_PREFIX}${sanitizeId(input.organizationId)}_`;
			return allSets
				.filter((s) => s.id.startsWith(prefix))
				.map((s) => ({
					query: s.query,
					pinnedIds: s.pinned_ids ?? [],
					hiddenIds: s.hidden_ids ?? [],
					filter: s.filter,
				}));
		} catch (err) {
			logger.error("getGlobalCurations failed", {
				organizationId: input.organizationId,
				err,
			});
			return [];
		}
	});

export const updateGlobalCurations = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/global-curations",
		tags: ["Search"],
		summary: "Update global curation sets",
		description:
			"Replaces all global curation overrides for the organization. These apply to all indexes.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			curations: z.array(globalCurationSchema),
		}),
	)
	.output(z.array(globalCurationSchema))
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const prefix = `${GLOBAL_PREFIX}${sanitizeId(input.organizationId)}_`;

		try {
			// Retrieve existing global curation sets
			const existing = await typesenseFetch<CurationSetList>("GET", "/curation_sets");
			const existingIds = new Set(
				(existing.curation_sets ?? []).filter((s) => s.id.startsWith(prefix)).map((s) => s.id),
			);

			const newIds = new Set<string>();

			// Upsert each global curation set
			for (const entry of input.curations) {
				const id = `${prefix}${sanitizeId(entry.query)}`;
				newIds.add(id);

				const body: Record<string, unknown> = {
					query: entry.query,
					pinned_ids: entry.pinnedIds,
					hidden_ids: entry.hiddenIds,
				};
				if (entry.filter) body.filter = entry.filter;

				await typesenseFetch("PUT", `/curation_sets/${encodeURIComponent(id)}`, body);
			}

			// Remove deleted curation sets
			for (const id of existingIds) {
				if (!newIds.has(id)) {
					await typesenseFetch("DELETE", `/curation_sets/${encodeURIComponent(id)}`);
				}
			}

			return input.curations;
		} catch (err) {
			logger.error("updateGlobalCurations failed", {
				organizationId: input.organizationId,
				err,
			});
			throw err;
		}
	});
