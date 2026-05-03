/**
 * @aacsearch/mongodb-sync — MongoDB real-time sync connector for AACsearch Engine.
 *
 * Sync MongoDB collections to AACsearch in real-time using Change Streams.
 * Requires MongoDB replica set (change streams require oplog).
 *
 * ## Quick start
 *
 * ```typescript
 * import { startChangeStreamListener, initialFullSync } from "@aacsearch/mongodb-sync";
 *
 * // 1. Initial full sync (load all existing documents)
 * await initialFullSync(config, {
 *   collection: "products",
 *   indexSlug: "products",
 * });
 *
 * // 2. Start change stream listener (real-time updates)
 * const listener = await startChangeStreamListener(config, {
 *   collection: "products",
 *   indexSlug: "products",
 *   fieldMapping: {
 *     "_id": "id",
 *     "name": "title",
 *     "description": "body",
 *   },
 * });
 *
 * await listener.start();
 *
 * // Stop on shutdown
 * process.on("SIGTERM", () => listener.stop());
 * ```
 */

export { startChangeStreamListener } from "./change-stream";
export type { ChangeStreamController } from "./change-stream";
export { initialFullSync } from "./initial-sync";
export { AacSearchClient } from "./client";
export { MongoSyncManager } from "./manager";
export type {
	AacSearchConfig,
	CollectionConfig,
	MongoSyncConfig,
	SyncAction,
	ChangeEvent,
	SyncCallbacks,
	SyncResult,
	ResumeTokenState,
	InitialSyncState,
} from "./types";
