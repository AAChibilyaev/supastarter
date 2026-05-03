import { db } from "../client";

export interface GlobalSynonymSetRow {
	id: string;
	organizationId: string;
	name: string;
	root: string;
	synonyms: string[];
	locale: string | null;
	scope: string; // "all" | "selected"
	createdAt: Date;
	updatedAt: Date;
}

export interface GlobalSynonymSetCollectionRow {
	id: string;
	synonymSetId: string;
	indexId: string;
	organizationId: string;
}

export interface GlobalSynonymSetWithCollections extends GlobalSynonymSetRow {
	excludedCollectionIds: string[];
}

function toGlobalSynonymSetRow(row: any): GlobalSynonymSetRow {
	return {
		id: row.id,
		organizationId: row.organizationId,
		name: row.name,
		root: row.root,
		synonyms: row.synonyms,
		locale: row.locale,
		scope: row.scope,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

/** Get all global synonym sets for an organization, with excluded collection IDs. */
export async function getGlobalSynonymSets(
	organizationId: string,
): Promise<GlobalSynonymSetWithCollections[]> {
	const rows = await db.globalSynonymSet.findMany({
		where: { organizationId },
		include: { excludedCollections: { select: { indexId: true } } },
		orderBy: { createdAt: "desc" },
	});

	return rows.map((row) => ({
		...toGlobalSynonymSetRow(row),
		excludedCollectionIds: row.excludedCollections.map((ec) => ec.indexId),
	}));
}

/** Get global synonym sets that apply to a specific index (respects scope + exclusions). */
export async function getEffectiveGlobalSynonymSets(
	organizationId: string,
	indexId: string,
): Promise<GlobalSynonymSetRow[]> {
	// Get all global sets for the org, with their excluded collections
	const rows = await db.globalSynonymSet.findMany({
		where: { organizationId },
		include: {
			excludedCollections: {
				where: { indexId },
				select: { id: true },
			},
		},
	});

	// Filter: scope="all" AND index not in excluded collections
	return rows
		.filter((row) => row.scope === "all" && row.excludedCollections.length === 0)
		.map(toGlobalSynonymSetRow);
}

/** Replace all global synonym sets for an organization (transactional). */
export async function replaceGlobalSynonymSets(
	organizationId: string,
	sets: {
		name: string;
		root: string;
		synonyms: string[];
		locale?: string | null;
		scope?: string;
		excludedCollectionIds?: string[];
	}[],
): Promise<GlobalSynonymSetWithCollections[]> {
	return db.$transaction(async (tx) => {
		// Delete all existing global sets and their exclusions
		await tx.globalSynonymSetCollection.deleteMany({
			where: { organizationId },
		});
		await tx.globalSynonymSet.deleteMany({
			where: { organizationId },
		});

		if (sets.length === 0) return [];

		// Create new sets
		for (const set of sets) {
			const created = await tx.globalSynonymSet.create({
				data: {
					organizationId,
					name: set.name,
					root: set.root,
					synonyms: set.synonyms,
					locale: set.locale ?? "en",
					scope: set.scope ?? "all",
				},
			});

			// Create exclusion records
			const excludedIds = set.excludedCollectionIds ?? [];
			if (excludedIds.length > 0) {
				await tx.globalSynonymSetCollection.createMany({
					data: excludedIds.map((indexId) => ({
						synonymSetId: created.id,
						indexId,
						organizationId,
					})),
				});
			}
		}

		return getGlobalSynonymSets(organizationId);
	});
}

/** Convert GlobalSynonymSetRow[] to SynonymPair[] for Typesense sync. */
export function globalSynonymSetsToPairs(
	rows: GlobalSynonymSetRow[],
): { synonym: string; root: string }[] {
	const pairs: { synonym: string; root: string }[] = [];

	for (const set of rows) {
		for (const synonym of set.synonyms) {
			pairs.push({ synonym, root: set.root });
		}
	}

	return pairs;
}
