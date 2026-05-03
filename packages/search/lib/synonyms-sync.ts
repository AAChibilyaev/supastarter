import "server-only";
import { logger } from "@repo/logs";

import { getTypesenseEnv } from "./env";

export interface SynonymPair {
	synonym: string;
	root: string;
	/** Optional locale scope (en, de, es, fr, ru). Null/undefined = universal. */
	locale?: string;
	/** Synonym type: "synonym" (default) or "alt_correction" */
	type?: string;
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
 * Syncs the synonym list to Typesense v30 global Synonym Sets.
 * Groups {synonym, root} pairs by root, upserts one global set per root,
 * and removes any sets no longer present.
 *
 * In Typesense v30, synonyms moved from collection-level (`/collections/{col}/synonyms/*`)
 * to global Synonym Sets (`/synonym_sets/*`). Since synonym sets are global
 * (no collection_name field), we prefix IDs with the collection name to avoid
 * collisions across collections.
 *
 * Best-effort: logs errors, never throws, so it doesn't block writes.
 */
export async function syncSynonymsToTypesense(
	collectionName: string,
	synonyms: SynonymPair[],
): Promise<void> {
	let existingIds: Set<string>;
	try {
		const result = await typesenseFetch<SynonymSetList>("GET", "/synonym_sets");
		const allSets = result.synonym_sets ?? [];
		// Filter sets that belong to this collection by checking ID prefix
		const prefix = `syn_${sanitizeId(collectionName)}_`;
		existingIds = new Set(allSets.filter((s) => s.id.startsWith(prefix)).map((s) => s.id));
	} catch (err) {
		logger.warn("syncSynonymsToTypesense: could not retrieve existing synonym sets", {
			collectionName,
			err,
		});
		existingIds = new Set();
	}

	// Group by root + locale: { "root@@locale" -> [synonym, ...] }
	// Universal synonyms (no locale) use "root@@" as key
	const grouped = new Map<
		string,
		{ root: string; locale: string | undefined; synonyms: string[]; type: string | undefined }
	>();
	for (const pair of synonyms) {
		const key = `${pair.root}@@${pair.locale ?? ""}`;
		const existing = grouped.get(key);
		if (existing) {
			existing.synonyms.push(pair.synonym);
		} else {
			grouped.set(key, {
				root: pair.root,
				locale: pair.locale,
				synonyms: [pair.synonym],
				type: pair.type,
			});
		}
	}

	const newIds = new Set<string>();

	for (const [, entry] of grouped) {
		// Build locale-aware ID: syn_{collection}_{locale}_{root} or syn_{collection}_{root}
		// Alt-corrections use "alt_" prefix for distinct identification
		const typePrefix = entry.type === "alt_correction" ? "alt_" : "";
		const localePart = entry.locale ? `${sanitizeId(entry.locale)}_` : "";
		const id = `${typePrefix}syn_${sanitizeId(collectionName)}_${localePart}${sanitizeId(entry.root)}`;
		newIds.add(id);
		try {
			await typesenseFetch("PUT", `/synonym_sets/${encodeURIComponent(id)}`, {
				root: entry.root,
				synonyms: entry.synonyms,
			});
		} catch (err) {
			logger.error("syncSynonymsToTypesense: failed to upsert synonym set", {
				collectionName,
				id,
				root: entry.root,
				locale: entry.locale,
				err,
			});
		}
	}

	// Remove synonym sets that were deleted
	for (const id of existingIds) {
		if (!newIds.has(id)) {
			try {
				await typesenseFetch("DELETE", `/synonym_sets/${encodeURIComponent(id)}`);
			} catch (err) {
				logger.warn("syncSynonymsToTypesense: failed to delete synonym set", {
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
export async function typesenseFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
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
	const existingForCollection = existingSets.filter((s) => s.collection_name === collectionName);
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

export interface SynonymSetRecord {
	id: string;
	root: string;
	synonyms: string[];
}

interface SynonymSetList {
	synonym_sets: SynonymSetRecord[];
}

/**
 * Retrieves all synonym sets from Typesense that belong to a specific collection
 * (identified by the collection-name prefix in the synonym set ID).
 */
export async function getSynonymSetsForCollection(
	collectionName: string,
): Promise<SynonymSetRecord[]> {
	try {
		const result = await typesenseFetch<SynonymSetList>("GET", "/synonym_sets");
		const allSets = result.synonym_sets ?? [];
		const prefix = `syn_${sanitizeId(collectionName)}_`;
		return allSets.filter((s) => s.id.startsWith(prefix));
	} catch (err) {
		logger.warn("getSynonymSetsForCollection: could not retrieve synonym sets", {
			collectionName,
			err,
		});
		return [];
	}
}

/**
 * Deletes a single synonym set from Typesense by its set ID.
 */
export async function deleteSynonymSetById(setId: string): Promise<void> {
	try {
		await typesenseFetch("DELETE", `/synonym_sets/${encodeURIComponent(setId)}`);
	} catch (err) {
		logger.warn("deleteSynonymSetById: failed to delete synonym set", {
			setId,
			err,
		});
	}
}
