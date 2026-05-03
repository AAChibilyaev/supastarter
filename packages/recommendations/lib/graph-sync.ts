/**
 * Graph sync module — synchronizes Prisma data into Neo4j.
 * Uses Neo4j's MERGE for idempotent upserts.
 *
 * Two modes:
 * 1. Full sync — rebuild entire graph for a collection
 * 2. Incremental sync — sync a single product/document change
 */

import { type Driver } from "neo4j-driver";

import { executeWrite, executeTransaction } from "./neo4j-client";
import {
	MERGE_PRODUCT,
	MERGE_CATEGORY,
	LINK_PRODUCT_TO_CATEGORY,
	MERGE_SIMILAR,
	MERGE_ALSO_BOUGHT,
	DELETE_COLLECTION,
} from "./queries.cypher";

export interface ProductInput {
	id: string;
	collectionSlug: string;
	title: string;
	category?: string;
	metadata?: Record<string, unknown>;
}

export interface SimilarityInput {
	productIdA: string;
	productIdB: string;
	score: number;
	similarityType: string;
}

// ─── PRODUCT SYNC ───────────────────────────────────────────────────────────

/**
 * Sync a single product into Neo4j.
 * Creates/updates the product node and links it to its category/collection.
 */
export async function syncProduct(product: ProductInput, driver?: Driver): Promise<void> {
	const statements: Array<{
		cypher: string;
		params?: Record<string, unknown>;
	}> = [
		{
			cypher: MERGE_PRODUCT,
			params: {
				id: product.id,
				collectionSlug: product.collectionSlug,
				title: product.title,
				category: product.category ?? "",
			},
		},
	];

	// Link to category if provided
	if (product.category) {
		statements.push({
			cypher: MERGE_CATEGORY,
			params: {
				name: product.category,
				collectionSlug: product.collectionSlug,
			},
		});
		statements.push({
			cypher: LINK_PRODUCT_TO_CATEGORY,
			params: {
				productId: product.id,
				categoryName: product.category,
				collectionSlug: product.collectionSlug,
			},
		});
	}

	await executeTransaction(statements, driver);
}

/**
 * Batch sync multiple products into Neo4j.
 * Uses batched transactions for performance.
 */
export async function syncProductsBatch(
	products: ProductInput[],
	driver?: Driver,
	batchSize = 100,
): Promise<{ synced: number; failed: number }> {
	let synced = 0;
	let failed = 0;

	for (let i = 0; i < products.length; i += batchSize) {
		const batch = products.slice(i, i + batchSize);
		try {
			const statements: Array<{
				cypher: string;
				params?: Record<string, unknown>;
			}> = batch.flatMap((product) => {
				const stmts: Array<{
					cypher: string;
					params?: Record<string, unknown>;
				}> = [
					{
						cypher: MERGE_PRODUCT,
						params: {
							id: product.id,
							collectionSlug: product.collectionSlug,
							title: product.title,
							category: product.category ?? "",
						},
					},
				];
				if (product.category) {
					stmts.push({
						cypher: MERGE_CATEGORY,
						params: {
							name: product.category,
							collectionSlug: product.collectionSlug,
						},
					});
					stmts.push({
						cypher: LINK_PRODUCT_TO_CATEGORY,
						params: {
							productId: product.id,
							categoryName: product.category,
							collectionSlug: product.collectionSlug,
						},
					});
				}
				return stmts;
			});

			await executeTransaction(statements, driver);
			synced += batch.length;
		} catch {
			failed += batch.length;
		}
	}

	return { synced, failed };
}

// ─── SIMILARITY SYNC ────────────────────────────────────────────────────────

/**
 * Sync similarity relationships between products.
 */
export async function syncSimilarities(
	similarities: SimilarityInput[],
	driver?: Driver,
): Promise<void> {
	const statements = similarities.map((s) => ({
		cypher: MERGE_SIMILAR,
		params: {
			productIdA: s.productIdA,
			productIdB: s.productIdB,
			score: s.score,
			similarityType: s.similarityType,
		},
	}));

	await executeTransaction(statements, driver);
}

/**
 * Sync also-bought relationship (incremented on purchase).
 */
export async function recordAlsoBought(
	productIdA: string,
	productIdB: string,
	driver?: Driver,
): Promise<void> {
	await executeWrite(MERGE_ALSO_BOUGHT, { productIdA, productIdB }, driver);
}

// ─── COLLECTION MANAGEMENT ──────────────────────────────────────────────────

/**
 * Full re-sync of a collection: delete all existing graph data
 * then re-sync all products.
 */
export async function fullCollectionSync(
	collectionSlug: string,
	products: ProductInput[],
	similarities?: SimilarityInput[],
	driver?: Driver,
): Promise<{ deleted: boolean; synced: number }> {
	// Delete existing graph data for this collection
	await executeWrite(DELETE_COLLECTION, { collectionSlug }, driver);

	// Re-sync all products
	const result = await syncProductsBatch(products, driver);

	// Sync similarity edges if provided
	if (similarities && similarities.length > 0) {
		await syncSimilarities(similarities, driver);
	}

	return { deleted: true, synced: result.synced };
}

// ─── DELETE OPERATIONS ──────────────────────────────────────────────────────

/**
 * Remove a single product from the graph.
 */
export async function deleteProduct(productId: string, driver?: Driver): Promise<void> {
	await executeWrite("MATCH (p:Product {id: $id}) DETACH DELETE p", { id: productId }, driver);
}

/**
 * Remove stale products not updated within the specified duration.
 */
export async function removeStaleProducts(staleAge: string, driver?: Driver): Promise<number> {
	const result = await executeWrite(
		"MATCH (p:Product) WHERE p.updatedAt < datetime() - duration($staleAge) DETACH DELETE p RETURN count(*) AS removed",
		{ staleAge },
		driver,
	);
	const record = result.records[0];
	return record ? (record.get("removed") as number) : 0;
}
