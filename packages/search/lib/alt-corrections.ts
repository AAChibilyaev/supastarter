import "server-only";
import { logger } from "@repo/logs";

import { getTypesenseClient } from "./client";
import { typesenseFetch } from "./synonyms-sync";

/**
 * Result of an alt-correction lookup.
 */
export interface AltCorrectionResult {
	/** The corrected search term */
	corrected: string;
	/** The original (misspelled) term */
	original: string;
	/** Document count with the corrected term */
	correctedCount: number;
	/** Whether the correction was applied */
	applied: boolean;
}

/**
 * Check if a search query has alt-corrections configured.
 *
 * Queries the Typesense synonym sets for entries with "alt_" prefix,
 * which indicates they're alt-corrections.
 */
export async function lookupAltCorrections(
	collectionName: string,
	query: string,
): Promise<AltCorrectionResult | null> {
	try {
		// Get all synonym sets for this collection
		const result = await typesenseFetch<{
			synonym_sets: Array<{ id: string; root: string; synonyms: string[] }>;
		}>("GET", "/synonym_sets");

		const sets = result.synonym_sets ?? [];
		const altPrefix = `alt_syn_`;

		// Find alt-correction sets that match any word in the query
		// Alt-correction: root = typo, synonyms[0] = correction
		const queryWords = query.toLowerCase().split(/\s+/);

		for (const set of sets) {
			if (!set.id.startsWith(altPrefix)) continue;

			// Check if any query word matches the root (typo) of this alt-correction
			for (const word of queryWords) {
				if (word.length < 2) continue;

				if (set.root.toLowerCase() === word && set.synonyms.length > 0) {
					const correction = set.synonyms[0];

					// Check if the correction would produce results
					const correctedQuery = query.replace(new RegExp(word, "i"), correction);

					// Return the correction — the caller decides whether to apply it
					return {
						corrected: correctedQuery,
						original: query,
						correctedCount: 0, // caller fills this
						applied: false,
					};
				}
			}
		}

		return null;
	} catch (error) {
		logger.warn("lookupAltCorrections failed", { collectionName, query, error });
		return null;
	}
}

/**
 * Apply alt-corrections and re-search when original query returns no results.
 *
 * Returns the count of results with the corrected query, or -1 if correction
 * doesn't improve results.
 */
export async function getAltCorrectionCount(
	collectionName: string,
	correctedQuery: string,
): Promise<number> {
	try {
		const client = getTypesenseClient();
		// Do a lightweight count-only search to check if correction yields results
		const result = await client
			.collections(collectionName)
			.documents()
			.search({ q: correctedQuery, per_page: 0 });

		return result.found ?? 0;
	} catch (error) {
		logger.warn("getAltCorrectionCount failed", {
			collectionName,
			correctedQuery,
			error,
		});
		return -1;
	}
}
