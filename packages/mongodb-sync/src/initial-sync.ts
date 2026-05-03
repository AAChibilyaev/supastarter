/**
 * MongoDB initial full sync — bulk export all documents from a collection to AACsearch.
 */

import { MongoClient } from "mongodb";

import { AacSearchClient } from "./client";
import type { MongoSyncConfig, CollectionConfig, SyncResult, SyncCallbacks } from "./types";

/**
 * Perform an initial full sync of a MongoDB collection to AACsearch.
 * Reads all documents from the collection and pushes them as a full sync.
 *
 * @param config - Top-level MongoDB sync configuration
 * @param collectionConfig - Collection-specific sync configuration
 * @param callbacks - Optional callbacks for progress reporting
 * @returns SyncResult with counts
 */
export async function initialFullSync(
	config: MongoSyncConfig,
	collectionConfig: CollectionConfig,
	callbacks?: SyncCallbacks,
): Promise<SyncResult> {
	const { mongoUri, dbName, aacsearch, batchSize = 100, debug } = config;
	const { collection, fieldMapping, transform, includeFields, excludeFields } = collectionConfig;
	const indexSlug = collectionConfig.indexSlug;

	const mongo = new MongoClient(mongoUri);
	const aac = new AacSearchClient(aacsearch);

	try {
		await mongo.connect();
		const db = mongo.db(dbName);
		const coll = db.collection(collection);

		// Count total documents for progress reporting
		const totalDocs = await coll.countDocuments();
		if (debug) {
			console.log(
				`[mongodb-sync] Initial sync: ${collection} → ${indexSlug} (${totalDocs} documents)`,
			);
		}

		if (totalDocs === 0) {
			return { synced: 0, skipped: 0, errors: [] };
		}

		let synced = 0;
		const errors: string[] = [];

		// Stream all documents in batches
		const cursor = coll.find({}).batchSize(batchSize);
		let batch: Record<string, unknown>[] = [];

		for await (const doc of cursor) {
			let mapped = doc as Record<string, unknown>;

			// Apply field mapping
			if (fieldMapping) {
				const mappedDoc: Record<string, unknown> = {};
				for (const [mongoField, aacField] of Object.entries(fieldMapping)) {
					if (mongoField in mapped) {
						mappedDoc[aacField] = mapped[mongoField];
					}
				}
				mapped = mappedDoc;
			} else {
				mapped = { ...mapped };
			}

			// Apply include filter
			if (includeFields && includeFields.length > 0) {
				mapped = Object.fromEntries(
					Object.entries(mapped).filter(([key]) => includeFields.includes(key)),
				);
			}

			// Apply exclude filter
			if (excludeFields && excludeFields.length > 0) {
				for (const field of excludeFields) {
					delete mapped[field];
				}
			}

			// Apply custom transform
			if (transform) {
				try {
					mapped = transform(mapped);
				} catch (err) {
					const msg = `Transform failed for doc: ${err instanceof Error ? err.message : String(err)}`;
					errors.push(msg);
					if (debug) console.error(`[mongodb-sync] ${msg}`);
					continue;
				}
			}

			batch.push(mapped);

			if (batch.length >= batchSize) {
				try {
					const result = await aac.syncDocuments(indexSlug, batch);
					synced += result.synced;
					errors.push(...result.errors);
				} catch (err) {
					const msg = `Batch sync failed: ${err instanceof Error ? err.message : String(err)}`;
					errors.push(msg);
					if (debug) console.error(`[mongodb-sync] ${msg}`);
				}
				batch = [];

				callbacks?.onInitialSyncProgress?.({
					collection,
					indexSlug,
					total: totalDocs,
					synced,
				});
			}
		}

		// Flush remaining batch
		if (batch.length > 0) {
			try {
				const result = await aac.syncDocuments(indexSlug, batch);
				synced += result.synced;
				errors.push(...result.errors);
			} catch (err) {
				const msg = `Final batch sync failed: ${err instanceof Error ? err.message : String(err)}`;
				errors.push(msg);
			}
		}

		if (debug) {
			console.log(
				`[mongodb-sync] Initial sync complete: ${collection} → ${indexSlug} (${synced}/${totalDocs})`,
			);
		}

		return { synced, skipped: totalDocs - synced - errors.length, errors };
	} finally {
		await mongo.close();
	}
}
