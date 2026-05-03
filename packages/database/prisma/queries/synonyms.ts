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

/** Get all synonyms for an organization (across all indexes). */
export async function getSynonymsByOrganizationId(
	organizationId: string,
): Promise<(SynonymRow & { indexSlug: string })[]> {
	const rows = await db.searchIndexSynonym.findMany({
		where: { organizationId },
		include: { index: { select: { slug: true } } },
		orderBy: { root: "asc" },
	});
	return rows.map((r) => ({
		id: r.id,
		indexId: r.indexId,
		organizationId: r.organizationId,
		root: r.root,
		synonym: r.synonym,
		locale: r.locale,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		indexSlug: r.index.slug,
	}));
}

/** Get synonym roots for an index (to check for duplicates during import). */
export async function getSynonymRootsByIndexId(indexId: string): Promise<string[]> {
	const rows = await db.searchIndexSynonym.findMany({
		where: { indexId },
		select: { root: true },
		distinct: ["root"],
	});
	return rows.map((r) => r.root);
}

/** Convert SynonymRow[] to SynonymPair[] (for Typesense sync). */
export function rowsToSynonymPairs(
	rows: SynonymRow[],
): { synonym: string; root: string; locale?: string }[] {
	return rows.map((r) => ({
		synonym: r.synonym,
		root: r.root,
		...(r.locale ? { locale: r.locale } : {}),
	}));
}

/** Validate synonym import entries for duplicates and invalid values. */
export function validateSynonymEntries(
	entries: { root: string; synonym: string; locale?: string | null }[],
	existingRoots: string[],
): { valid: boolean; errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];
	const seen = new Set<string>();

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		const key = `${entry.root}:${entry.synonym}`;

		if (!entry.root || !entry.root.trim()) {
			errors.push(`Row ${i + 1}: root is empty`);
			continue;
		}
		if (entry.root.length > 255) {
			errors.push(`Row ${i + 1}: root "${entry.root.slice(0, 20)}..." exceeds 255 chars`);
			continue;
		}
		if (!entry.synonym || !entry.synonym.trim()) {
			errors.push(`Row ${i + 1}: synonym is empty for root "${entry.root}"`);
			continue;
		}
		if (entry.synonym.length > 255) {
			errors.push(
				`Row ${i + 1}: synonym "${entry.synonym.slice(0, 20)}..." exceeds 255 chars`,
			);
			continue;
		}

		if (seen.has(key)) {
			warnings.push(
				`Duplicate entry: root="${entry.root}" synonym="${entry.synonym}" (row ${i + 1})`,
			);
		}
		seen.add(key);
	}

	if (existingRoots.length > 0) {
		for (const root of existingRoots) {
			if (!entries.some((e) => e.root === root)) {
				warnings.push(`Existing root "${root}" will be removed (not present in import)`);
			}
		}
	}

	return { valid: errors.length === 0, errors, warnings };
}
