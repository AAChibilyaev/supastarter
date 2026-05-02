import "server-only";
import { logger } from "@repo/logs";
import type { OverrideCreateSchema } from "typesense/lib/Typesense/Overrides";
import type { SynonymCreateSchema } from "typesense/lib/Typesense/Synonyms";

import { getTypesenseClient } from "./client";

export interface SynonymPair {
	synonym: string;
	root: string;
}

export interface CurationRule {
	query: string;
	pinnedIds: string[];
	hiddenIds: string[];
}

function sanitizeId(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "")
		.slice(0, 64);
}

/**
 * Syncs the synonym list to the Typesense collection (or alias).
 * Groups {synonym, root} pairs by root, upserts one entry per root,
 * and removes any synonyms no longer present.
 *
 * Best-effort: logs errors, never throws, so it doesn't block writes.
 */
export async function syncSynonymsToTypesense(
	collectionName: string,
	synonyms: SynonymPair[],
): Promise<void> {
	const client = getTypesenseClient();
	const coll = client.collections(collectionName);

	let existingIds: Set<string>;
	try {
		const existing = await coll.synonyms().retrieve();
		existingIds = new Set(existing.synonyms.map((s) => s.id));
	} catch (err) {
		logger.warn("syncSynonymsToTypesense: could not retrieve existing synonyms", {
			collectionName,
			err,
		});
		existingIds = new Set();
	}

	// Group by root: { root -> [synonym, ...] }
	const grouped = new Map<string, string[]>();
	for (const pair of synonyms) {
		const list = grouped.get(pair.root) ?? [];
		list.push(pair.synonym);
		grouped.set(pair.root, list);
	}

	const newIds = new Set<string>();

	for (const [root, synonymList] of grouped) {
		const id = `syn_${sanitizeId(root)}`;
		newIds.add(id);
		try {
			await coll
				.synonyms()
				.upsert(id, { root, synonyms: synonymList } satisfies SynonymCreateSchema);
		} catch (err) {
			logger.error("syncSynonymsToTypesense: failed to upsert synonym", {
				collectionName,
				id,
				root,
				err,
			});
		}
	}

	// Remove synonyms that were deleted
	for (const id of existingIds) {
		if (!newIds.has(id)) {
			try {
				await coll.synonyms(id).delete();
			} catch (err) {
				logger.warn("syncSynonymsToTypesense: failed to delete synonym", {
					collectionName,
					id,
					err,
				});
			}
		}
	}
}

/**
 * Syncs the curation list to Typesense overrides (what Typesense calls curations).
 * Each curation maps to one override rule keyed by a sanitized query string.
 * Removes overrides that are no longer present.
 *
 * Best-effort: logs errors, never throws.
 */
export async function syncCurationsToTypesense(
	collectionName: string,
	curations: CurationRule[],
): Promise<void> {
	const client = getTypesenseClient();
	const coll = client.collections(collectionName);

	let existingIds: Set<string>;
	try {
		const existing = await coll.overrides().retrieve();
		existingIds = new Set(existing.overrides.map((o) => o.id));
	} catch (err) {
		logger.warn("syncCurationsToTypesense: could not retrieve existing overrides", {
			collectionName,
			err,
		});
		existingIds = new Set();
	}

	const newIds = new Set<string>();

	for (let i = 0; i < curations.length; i++) {
		const cur = curations[i];
		const sanitized = sanitizeId(cur.query);
		const id = sanitized.length > 0 ? `cur_${sanitized}` : `cur_${i}`;
		newIds.add(id);

		const includes = cur.pinnedIds.map((docId, pos) => ({ id: docId, position: pos + 1 }));
		const excludes = cur.hiddenIds.map((docId) => ({ id: docId }));

		const body: OverrideCreateSchema = {
			rule: { query: cur.query, match: "exact" },
			...(includes.length > 0 ? { includes } : {}),
			...(excludes.length > 0 ? { excludes } : {}),
		};

		try {
			await coll.overrides().upsert(id, body);
		} catch (err) {
			logger.error("syncCurationsToTypesense: failed to upsert override", {
				collectionName,
				id,
				query: cur.query,
				err,
			});
		}
	}

	// Remove overrides that were deleted
	for (const id of existingIds) {
		if (!newIds.has(id)) {
			try {
				await coll.overrides(id).delete();
			} catch (err) {
				logger.warn("syncCurationsToTypesense: failed to delete override", {
					collectionName,
					id,
					err,
				});
			}
		}
	}
}
