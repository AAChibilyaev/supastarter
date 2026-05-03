import "server-only";
import { logger } from "@repo/logs";
import type { SynonymCreateSchema } from "typesense/lib/Typesense/Synonyms";

import { getTypesenseClient } from "./client";
import { getTypesenseEnv } from "./env";

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
 * Performs a raw fetch request to the Typesense API.
 * Used for the v30 global Curation Sets / Synonym Sets API which is not
 * available as a typed method on the older typesense client library.
 */
export async function typesenseFetch<T>(
	method: string,
	path: string,
	body?: unknown,
): Promise<T> {
	const env = getTypesenseEnv();
	const url = `${env.protocol}://${env.host}:${env.port}${path}`;

	const res = await fetch(url, {
		method,
		headers: {
			"X-TYPESENSE-API-KEY": env.adminApiKey,
			"Content-Type": "application/json",
		},
		...(body !== undefined ? { body: JSON.stringify(body) } : {}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Typesense API error ${res.status}: ${text}`);
	}

	// 204 No Content (DELETE) returns empty body
	if (res.status === 204) {
		return undefined as T;
	}

	return res.json() as Promise<T>;
}

export interface CurationSetRecord {
	id: string;
	collection_name: string;
	rule: { query: string; match: string };
}

interface CurationSetList {
	curation_sets: CurationSetRecord[];
}

/**
 * Syncs the curation list to Typesense v30 global Curation Sets.
 * Each curation maps to one Curation Set (replaces old override rules).
 * Removes curation sets that are no longer present.
 *
 * In Typesense v30, curations moved from collection-level overrides
 * (`/collections/{col}/overrides/{id}`) to global Curation Sets
 * (`/curation_sets/{id}`). The body schema is the same but includes
 * a `collection_name` field to bind it to a collection.
 *
 * Best-effort: logs errors, never throws.
 */
export async function syncCurationsToTypesense(
	collectionName: string,
	curations: CurationRule[],
): Promise<void> {
	let existingSets: CurationSetRecord[];
	try {
		const result = await typesenseFetch<CurationSetList>("GET", "/curation_sets");
		existingSets = result.curation_sets ?? [];
	} catch (err) {
		logger.warn("syncCurationsToTypesense: could not retrieve existing curation sets", {
			collectionName,
			err,
		});
		existingSets = [];
	}

	// Filter existing sets that belong to this collection
	const existingForCollection = existingSets.filter(
		(s) => s.collection_name === collectionName,
	);
	const existingIds = new Set(existingForCollection.map((s) => s.id));

	const newIds = new Set<string>();

	for (let i = 0; i < curations.length; i++) {
		const cur = curations[i];
		const sanitized = sanitizeId(cur.query);
		const id = sanitized.length > 0 ? `cur_${sanitized}` : `cur_${i}`;
		newIds.add(id);

		const includes = cur.pinnedIds.map((docId, pos) => ({ id: docId, position: pos + 1 }));
		const excludes = cur.hiddenIds.map((docId) => ({ id: docId }));

		const body: Record<string, unknown> = {
			collection_name: collectionName,
			rule: { query: cur.query, match: "exact" },
			...(includes.length > 0 ? { includes } : {}),
			...(excludes.length > 0 ? { excludes } : {}),
		};

		try {
			await typesenseFetch("PUT", `/curation_sets/${encodeURIComponent(id)}`, body);
		} catch (err) {
			logger.error("syncCurationsToTypesense: failed to upsert curation set", {
				collectionName,
				id,
				query: cur.query,
				err,
			});
		}
	}

	// Remove curation sets that were deleted
	for (const id of existingIds) {
		if (!newIds.has(id)) {
			try {
				await typesenseFetch("DELETE", `/curation_sets/${encodeURIComponent(id)}`);
			} catch (err) {
				logger.warn("syncCurationsToTypesense: failed to delete curation set", {
					collectionName,
					id,
					err,
				});
			}
		}
	}
}

/**
 * Retrieves all curation sets from Typesense that belong to a specific collection.
 */
export async function getCurationSetsForCollection(
	collectionName: string,
): Promise<CurationSetRecord[]> {
	try {
		const result = await typesenseFetch<CurationSetList>("GET", "/curation_sets");
		const allSets = result.curation_sets ?? [];
		return allSets.filter((s) => s.collection_name === collectionName);
	} catch (err) {
		logger.warn("getCurationSetsForCollection: could not retrieve curation sets", {
			collectionName,
			err,
		});
		return [];
	}
}

/**
 * Deletes a single curation set from Typesense by its set ID (not collection-level).
 */
export async function deleteCurationSetById(setId: string): Promise<void> {
	try {
		await typesenseFetch("DELETE", `/curation_sets/${encodeURIComponent(setId)}`);
	} catch (err) {
		logger.warn("deleteCurationSetById: failed to delete curation set", {
			setId,
			err,
		});
	}
}
