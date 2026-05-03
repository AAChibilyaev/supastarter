/**
 * MongoSyncManager — manages multiple collection syncs.
 * Convenience wrapper around startChangeStreamListener and initialFullSync.
 */

import type { MongoSyncConfig, CollectionConfig, SyncCallbacks, SyncResult } from "./types";
import { startChangeStreamListener, type ChangeStreamController } from "./change-stream";
import { initialFullSync } from "./initial-sync";

/**
 * Manages multiple MongoDB collection syncs.
 * Provides startAll/stopAll and per-collection control.
 */
export class MongoSyncManager {
	private readonly config: MongoSyncConfig;
	private readonly callbacks?: SyncCallbacks;
	private controllers: Map<string, ChangeStreamController> = new Map();

	constructor(config: MongoSyncConfig, callbacks?: SyncCallbacks) {
		this.config = config;
		this.callbacks = callbacks;
	}

	/** Start sync for all configured collections */
	async startAll(): Promise<Map<string, SyncResult>> {
		const results = new Map<string, SyncResult>();

		for (const collConfig of this.config.collections) {
			const key = `${collConfig.collection}→${collConfig.indexSlug}`;
			const result = await this.startCollection(collConfig);
			results.set(key, result);
		}

		return results;
	}

	/** Start sync for a single collection (initial sync + change stream) */
	async startCollection(collectionConfig: CollectionConfig): Promise<SyncResult> {
		const key = `${collectionConfig.collection}→${collectionConfig.indexSlug}`;

		if (this.controllers.has(key)) {
			throw new Error(`Sync already running for ${key}`);
		}

		// Step 1: Initial full sync
		const syncResult = await initialFullSync(this.config, collectionConfig, this.callbacks);

		// Step 2: Start change stream listener
		const controller = await startChangeStreamListener(
			this.config,
			collectionConfig,
			this.callbacks,
		);

		this.controllers.set(key, controller);

		// Start listening (non-blocking — runs in background)
		controller.start().catch((err) => {
			this.callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)), {
				collection: collectionConfig.collection,
				indexSlug: collectionConfig.indexSlug,
			});
		});

		return syncResult;
	}

	/** Stop sync for a single collection */
	async stopCollection(collection: string): Promise<void> {
		for (const [key, controller] of this.controllers.entries()) {
			if (key.startsWith(collection)) {
				await controller.stop();
				this.controllers.delete(key);
			}
		}
	}

	/** Stop all syncs */
	async stopAll(): Promise<void> {
		const promises = Array.from(this.controllers.values()).map((c) => c.stop());
		await Promise.all(promises);
		this.controllers.clear();
	}

	/** Get status of all running syncs */
	getAllStatus(): Array<{ collection: string; indexSlug: string; running: boolean; pendingCount: number; errorCount: number }> {
		return Array.from(this.controllers.entries()).map(([key, controller]) => {
			const [collection, indexSlug] = key.split("→");
			const status = controller.status();
			return {
				collection: collection ?? key,
				indexSlug: indexSlug ?? "",
				running: status.running,
				pendingCount: status.pendingCount,
				errorCount: status.errorCount,
			};
		});
	}

	/** Check if a collection is being synced */
	isRunning(collection: string): boolean {
		for (const key of this.controllers.keys()) {
			if (key.startsWith(collection)) return true;
		}
		return false;
	}
}
