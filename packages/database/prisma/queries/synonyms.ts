import { db } from "../client";

export interface SynonymRow {
	id: string;
	indexId: string;
	organizationId: string;
	root: string;
	synonym: string;
	locale: string | null;
	createdAt: Date;
	updatedAt: Date;
}

/** Get all synonyms for a search index. */
export async function getSynonymsByIndexId(indexId: string): Promise<SynonymRow[]> {
	return db.searchIndexSynonym.findMany({
		where: { indexId },
		orderBy: { root: "asc" },
	});
}

/** Get all synonyms for multiple index IDs (e.g., from a reindexed collection). */
export async function getSynonymsByIndexIds(indexIds: string[]): Promise<SynonymRow[]> {
	return db.searchIndexSynonym.findMany({
		where: { indexId: { in: indexIds } },
		orderBy: { root: "asc" },
	});
}

/** Replace all synonyms for an index (delete old, insert new, transactionally). */
export async function replaceSynonyms(
	indexId: string,
	organizationId: string,
	synonyms: { root: string; synonym: string; locale?: string | null }[],
): Promise<SynonymRow[]> {
	return db.$transaction(async (tx) => {
		await tx.searchIndexSynonym.deleteMany({
			where: { indexId },
		});

		if (synonyms.length === 0) return [];

		await tx.searchIndexSynonym.createMany({
			data: synonyms.map((s) => ({
				indexId,
				organizationId,
				root: s.root,
				synonym: s.synonym,
				locale: s.locale ?? "en",
			})),
			skipDuplicates: true,
		});

		return tx.searchIndexSynonym.findMany({
			where: { indexId },
			orderBy: { root: "asc" },
		});
	});
}

/** Convert SynonymRow[] to SynonymPair[] (for Typesense sync). */
export function rowsToSynonymPairs(rows: SynonymRow[]): { synonym: string; root: string }[] {
	return rows.map((r) => ({ synonym: r.synonym, root: r.root }));
}
