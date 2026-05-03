/**
 * MongoDB Change Stream listener — watches collections and pushes changes to AACsearch.
 */

import { MongoClient, type ChangeStream, type ResumeToken, type Document as MongoDocument } from "mongodb";
import type { MongoSyncConfig, CollectionConfig, ChangeEvent, SyncCallbacks, SyncResult, ResumeTokenState } from "./types";
import { AacSearchClient } from "./client";

/**
 * Default batch interval in milliseconds.
 * Incoming change events are batched and flushed every N ms.
 */
const DEFAULT_FLUSH_INTERVAL_MS = 1000;

/**
 * Start a MongoDB Change Stream listener for a single collection.
 * Returns a controller with stop() and status() methods.
 */
export async function startChangeStreamListener(
	config: MongoSyncConfig,
	collectionConfig: CollectionConfig,
	callbacks?: SyncCallbacks,
	pipeline: MongoDocument[] = [],
): Promise<ChangeStreamController> {
	const { mongoUri, dbName, aacsearch, batchSize = 100, debug } = config;
	const { collection, fieldMapping, transform, includeFields, excludeFields } = collectionConfig;
	const idColumn = collectionConfig.idColumn ?? "_id";
	const indexSlug = collectionConfig.indexSlug;

	const client = new MongoClient(mongoUri);
	const aac = new AacSearchClient(aacsearch);

	let pendingBatch: Map<string, { action: string; doc: Record<string, unknown> }> = new Map();
	let flushTimer: ReturnType<typeof setInterval> | null = null;
	let isRunning = false;
	let stream: ChangeStream | null = null;
	let resumeToken: unknown = null;
	let errorCount = 0;

	/** Apply field mapping and filtering to a document */
	function applyFieldMapping(doc: Record<string, unknown>): Record<string, unknown> {
		let result: Record<string, unknown>;

		if (fieldMapping) {
			result = {};
			for (const [mongoField, aacField] of Object.entries(fieldMapping)) {
				if (mongoField in doc) {
					result[aacField] = doc[mongoField];
				}
			}
		} else {
			result = { ...doc };
		}

		// Apply include filter
		if (includeFields && includeFields.length > 0) {
			result = Object.fromEntries(
				Object.entries(result).filter(([key]) => includeFields.includes(key)),
			);
		}

		// Apply exclude filter
		if (excludeFields && excludeFields.length > 0) {
			for (const field of excludeFields) {
				delete result[field];
			}
		}

		// Apply custom transform
		if (transform) {
			result = transform(result);
		}

		return result;
	}

	/** Convert MongoDB _id to string for AACsearch external_id */
	function extractExternalId(doc: Record<string, unknown>): string {
		const id = doc[idColumn];
		if (id === null || id === undefined) return "";
		return String(id);
	}

	/** Flush pending batch to AACsearch */
	async function flushBatch(): Promise<SyncResult> {
		if (pendingBatch.size === 0) return { synced: 0, skipped: 0, errors: [] };

		const batch = Array.from(pendingBatch.values());
		pendingBatch.clear();

		// Split into inserts/updates and deletes
		const upserts = batch.filter((e) => e.action !== "delete").map((e) => e.doc);
		const deletes = batch.filter((e) => e.action === "delete").map((e) => extractExternalId(e.doc));

		let result: SyncResult = { synced: 0, skipped: 0, errors: [] };

		// Send upserts
		if (upserts.length > 0) {
			const upsertResult = await aac.syncDocuments(indexSlug, upserts);
			result.synced += upsertResult.synced;
			result.errors.push(...upsertResult.errors);
		}

		// Send deletes
		if (deletes.length > 0) {
			// Batch delete in chunks of 100
			for (let i = 0; i < deletes.length; i += 100) {
				const chunk = deletes.slice(i, i + 100);
				const deleted = await aac.batchDelete(indexSlug, chunk);
				result.synced += deleted;
			}
		}

		if (debug) {
			console.log(
				`[mongodb-sync] Flushed ${upserts.length} upserts + ${deletes.length} deletes → ${indexSlug}`,
			);
		}

		callbacks?.onSync?.({
			collection,
			action: "UPDATE",
			documentCount: upserts.length + deletes.length,
			indexSlug,
		});

		return result;
	}

	/** Handle a single change event */
	async function handleChange(change: MongoDocument): Promise<void> {
		const operationType = change.operationType as string;
		const docKey = change.documentKey as { _id: unknown };
		const externalId = String(docKey._id);

		if (debug) {
			console.log(`[mongodb-sync] Change: ${operationType} ${collection}/${externalId}`);
		}

		if (operationType === "delete") {
			pendingBatch.set(externalId, {
				action: "delete",
				doc: { [idColumn]: docKey._id },
			});
		} else if (operationType === "insert" || operationType === "update" || operationType === "replace") {
			const fullDoc = change.fullDocument as Record<string, unknown> | undefined;
			if (!fullDoc) {
				if (debug) {
					console.log(`[mongodb-sync] Skipping change without fullDocument (${operationType} ${externalId})`);
				}
				// For updates without fullDocument, try to apply if fullDocumentBeforeChange is available
				const before = change.fullDocumentBeforeChange as Record<string, unknown> | undefined;
				if (before) {
					const mapped = applyFieldMapping(before);
					pendingBatch.set(externalId, { action: "update", doc: mapped });
				}
				return;
			}
			const mapped = applyFieldMapping(fullDoc);
			pendingBatch.set(externalId, {
				action: operationType === "insert" ? "insert" : "update",
				doc: mapped,
			});
		}

		// Flush immediately if batch is large enough
		if (pendingBatch.size >= batchSize) {
			await flushBatch();
		}
	}

	/** Start listening for changes */
	async function start(): Promise<void> {
		await client.connect();

		const db = client.db(dbName);
		const coll = db.collection(collection);

		// Verify the collection exists
		const collections = await db.listCollections({ name: collection }).toArray();
		if (collections.length === 0) {
			throw new Error(`Collection "${collection}" not found in database "${dbName}"`);
		}

		// Build change stream pipeline to filter to this operation type
		const changePipeline = [
			{ $match: { "ns.db": dbName, "ns.coll": collection } },
			...pipeline,
		];

		// Create change stream with resume token if available
		const changeStreamOptions: Record<string, unknown> = {};
		if (resumeToken) {
			changeStreamOptions.resumeAfter = resumeToken;
		}

		stream = coll.watch(changePipeline, changeStreamOptions as Record<string, unknown>);

		isRunning = true;

		// Start flush timer
		flushTimer = setInterval(() => {
			flushBatch().catch((err) => {
				errorCount++;
				callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)), {
					collection,
					indexSlug,
				});
			});
		}, DEFAULT_FLUSH_INTERVAL_MS);

		callbacks?.onConnected?.();

		// Listen for changes
		for await (const change of stream) {
			if (!isRunning) break;
			try {
				await handleChange(change);
				// Store resume token
				resumeToken = change._id;
				errorCount = 0;
			} catch (err) {
				errorCount++;
				callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)), {
					collection,
					indexSlug,
				});
			}
		}
	}

	/** Stop the listener */
	async function stop(): Promise<void> {
		isRunning = false;
		if (flushTimer) {
			clearInterval(flushTimer);
			flushTimer = null;
		}
		// Flush any remaining changes
		await flushBatch();
		if (stream) {
			await stream.close();
			stream = null;
		}
		await client.close();
		callbacks?.onDisconnected?.();
	}

	/** Get current status */
	function status() {
		return {
			running: isRunning,
			collection,
			indexSlug,
			pendingCount: pendingBatch.size,
			errorCount,
		};
	}

	/** Get the current resume token */
	function getResumeToken(): unknown {
		return resumeToken;
	}

	return {
		start,
		stop,
		status,
		getResumeToken,
		flushBatch: () => flushBatch(),
	};
}

/** Controller returned by startChangeStreamListener */
export interface ChangeStreamController {
	/** Start listening (connects to MongoDB and begins change stream) */
	start(): Promise<void>;
	/** Stop listening (closes stream and connection) */
	stop(): Promise<void>;
	/** Get current listener status */
	status(): { running: boolean; collection: string; indexSlug: string; pendingCount: number; errorCount: number };
	/** Get the current resume token */
	getResumeToken(): unknown;
	/** Manually flush pending batch */
	flushBatch(): Promise<SyncResult>;
}
