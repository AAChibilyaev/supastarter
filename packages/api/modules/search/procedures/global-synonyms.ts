import {
	getGlobalSynonymSets,
	globalSynonymSetsToPairs,
	replaceGlobalSynonymSets,
} from "@repo/database/prisma/queries/global-synonym-sets";
import { getSearchIndexBySlug } from "@repo/database";
import { logger } from "@repo/logs";
import { typesenseFetch } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

const GLOBAL_PREFIX = "gsyn_";

function sanitizeId(id: string): string {
	return id.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

const globalSynonymEntrySchema = z.object({
	name: z.string().min(1).max(255),
	root: z.string().min(1).max(255),
	synonyms: z.array(z.string().min(1).max(255)).min(1).max(100),
	locale: z.string().max(10).optional(),
	scope: z.enum(["all", "selected"]).default("all"),
	excludedCollectionIds: z.array(z.string()).default([]),
});

/**
 * Sync global synonym sets to Typesense for ALL indexes in the organization.
 * Each global set is written to /synonym_sets with a named ID prefixed by organization.
 */
async function syncGlobalToTypesense(
	organizationId: string,
	sets: {
		root: string;
		synonyms: string[];
		locale?: string | null;
		scope?: string;
	}[],
) {
	const prefix = `${GLOBAL_PREFIX}${sanitizeId(organizationId)}_`;
	const existing = await typesenseFetch<{ synonym_sets: { id: string }[] }>(
		"GET",
		"/synonym_sets",
	).catch(() => ({ synonym_sets: [] }));
	const existingIds = new Set(
		(existing.synonym_sets ?? [])
			.filter((s) => s.id.startsWith(prefix))
			.map((s) => s.id),
	);
	const newIds = new Set<string>();

	for (const entry of sets) {
		const id = `${prefix}${sanitizeId(entry.root)}`;
		newIds.add(id);
		try {
			await typesenseFetch("PUT", `/synonym_sets/${encodeURIComponent(id)}`, {
				root: entry.root,
				synonyms: entry.synonyms,
				locale: entry.locale ?? "en",
			});
		} catch (err) {
			logger.error("syncGlobalToTypesense: upsert failed", { id, root: entry.root, err });
		}
	}

	for (const id of existingIds) {
		if (!newIds.has(id)) {
			try {
				await typesenseFetch("DELETE", `/synonym_sets/${encodeURIComponent(id)}`);
			} catch (err) {
				logger.warn("syncGlobalToTypesense: delete failed", { id, err });
			}
		}
	}
}

export const getGlobalSynonyms = protectedProcedure
	.route({
		method: "GET",
		path: "/search/global-synonyms",
		tags: ["Search"],
		summary: "Get global synonym sets",
		description:
			"Returns all global synonym sets for the organization from the DB-backed table.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.array(
			globalSynonymEntrySchema.extend({
				id: z.string(),
				createdAt: z.string(),
				updatedAt: z.string(),
			}),
		),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		try {
			const sets = await getGlobalSynonymSets(input.organizationId);
			return sets.map((s) => ({
				id: s.id,
				name: s.name,
				root: s.root,
				synonyms: s.synonyms,
				locale: s.locale ?? undefined,
				scope: s.scope as "all" | "selected",
				excludedCollectionIds: s.excludedCollectionIds,
				createdAt: s.createdAt.toISOString(),
				updatedAt: s.updatedAt.toISOString(),
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
			"Replaces all global synonym sets for the organization (DB-backed). Syncs to Typesense.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			synonyms: z.array(globalSynonymEntrySchema),
		}),
	)
	.output(
		z.array(
			globalSynonymEntrySchema.extend({
				id: z.string(),
				createdAt: z.string(),
				updatedAt: z.string(),
			}),
		),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		try {
			// Persist to DB first (transactional)
			const saved = await replaceGlobalSynonymSets(
				input.organizationId,
				input.synonyms.map((s) => ({
					name: s.name,
					root: s.root,
					synonyms: s.synonyms,
					locale: s.locale,
					scope: s.scope,
					excludedCollectionIds: s.excludedCollectionIds,
				})),
			);

			// Sync to Typesense (best-effort, fire-and-forget)
			syncGlobalToTypesense(
				input.organizationId,
				input.synonyms.map((s) => ({
					root: s.root,
					synonyms: s.synonyms,
					locale: s.locale ?? "en",
					scope: s.scope,
				})),
			).catch((err) =>
				logger.error("updateGlobalSynonyms: Typesense sync failed", {
					organizationId: input.organizationId,
					err,
				}),
			);

			return saved.map((s) => ({
				id: s.id,
				name: s.name,
				root: s.root,
				synonyms: s.synonyms,
				locale: s.locale ?? undefined,
				scope: s.scope as "all" | "selected",
				excludedCollectionIds: s.excludedCollectionIds,
				createdAt: s.createdAt.toISOString(),
				updatedAt: s.updatedAt.toISOString(),
			}));
		} catch (err) {
			logger.error("updateGlobalSynonyms failed", {
				organizationId: input.organizationId,
				err,
			});
			throw err;
		}
	});

/**
 * Helper to get effective global synonyms for a specific index.
 * Returns only global sets with scope="all" that don't exclude this index.
 */
export const getEffectiveGlobalSynonyms = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/global-synonyms",
		tags: ["Search"],
		summary: "Get effective global synonym sets for an index",
		description:
			"Returns global synonym sets that actually apply to this index (scope=all + not excluded).",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z.string().min(1).max(64),
		}),
	)
	.output(
		z.array(
			z.object({
				id: z.string(),
				name: z.string(),
				root: z.string(),
				synonyms: z.array(z.string()),
				locale: z.string().optional(),
			}),
		),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		const index = await getSearchIndexBySlug(input.organizationId, input.slug);
		if (!index) return [];

		const sets = await getGlobalSynonymSets(input.organizationId);
		return sets
			.filter(
				(s) =>
					s.scope === "all" && !s.excludedCollectionIds.includes(index.id),
			)
			.map((s) => ({
				id: s.id,
				name: s.name,
				root: s.root,
				synonyms: s.synonyms,
				locale: s.locale ?? undefined,
			}));
	});
