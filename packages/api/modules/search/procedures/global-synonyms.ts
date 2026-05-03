import { logger } from "@repo/logs";
import { typesenseFetch } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

const GLOBAL_PREFIX = "global_syn_";

/**
 * Sanitize a string for use as a Typesense synonym set ID.
 */
function sanitizeId(id: string): string {
	return id.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

interface SynonymSetRecord {
	id: string;
	root: string;
	synonyms: string[];
	locale?: string;
}

interface SynonymSetList {
	synonym_sets: SynonymSetRecord[];
}

const globalSynonymSchema = z.object({
	root: z.string().min(1).max(255),
	synonyms: z.array(z.string().min(1).max(255)).min(1).max(100),
	locale: z.string().max(10).optional(),
});

export const getGlobalSynonyms = protectedProcedure
	.route({
		method: "GET",
		path: "/search/global-synonyms",
		tags: ["Search"],
		summary: "Get global synonym sets",
		description: "Returns all global synonym sets that apply to all indexes in the organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(z.array(globalSynonymSchema))
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		try {
			const result = await typesenseFetch<SynonymSetList>("GET", "/synonym_sets");
			const allSets = result.synonym_sets ?? [];
			const prefix = `${GLOBAL_PREFIX}${sanitizeId(input.organizationId)}_`;
			return allSets
				.filter((s) => s.id.startsWith(prefix))
				.map((s) => ({
					root: s.root,
					synonyms: s.synonyms,
					locale: s.locale,
				}));
		} catch (err) {
			logger.error("getGlobalSynonyms failed", { organizationId: input.organizationId, err });
			return [];
		}
	});

export const updateGlobalSynonyms = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/global-synonyms",
		tags: ["Search"],
		summary: "Update global synonym sets",
		description:
			"Replaces all global synonym sets for the organization. These apply to all indexes.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			synonyms: z.array(globalSynonymSchema),
		}),
	)
	.output(z.array(globalSynonymSchema))
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const prefix = `${GLOBAL_PREFIX}${sanitizeId(input.organizationId)}_`;

		try {
			// Retrieve existing global synonym sets
			const existing = await typesenseFetch<SynonymSetList>("GET", "/synonym_sets");
			const existingIds = new Set(
				(existing.synonym_sets ?? []).filter((s) => s.id.startsWith(prefix)).map((s) => s.id),
			);

			const newIds = new Set<string>();

			// Upsert each global synonym set
			for (const entry of input.synonyms) {
				const id = `${prefix}${sanitizeId(entry.root)}`;
				newIds.add(id);

				const body: Record<string, unknown> = {
					root: entry.root,
					synonyms: entry.synonyms,
					locale: entry.locale,
				};

				await typesenseFetch("PUT", `/synonym_sets/${encodeURIComponent(id)}`, body);
			}

			// Remove deleted synonym sets
			for (const id of existingIds) {
				if (!newIds.has(id)) {
					await typesenseFetch("DELETE", `/synonym_sets/${encodeURIComponent(id)}`);
				}
			}

			return input.synonyms;
		} catch (err) {
			logger.error("updateGlobalSynonyms failed", {
				organizationId: input.organizationId,
				err,
			});
			throw err;
		}
	});
