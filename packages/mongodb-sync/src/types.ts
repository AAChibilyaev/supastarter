/**
 * MongoDB Sync Connector — configuration types for @aacsearch/mongodb-sync
 */

/** AACsearch connection configuration */
export interface AacSearchConfig {
	/** AACsearch API base URL (e.g. https://api.aacsearch.com) */
	baseUrl: string;
	/** Connector bearer token (ss_connector_* prefix) */
	token: string;
	/** Organization/project ID */
	projectId: string;
}

/** Sync configuration for a single MongoDB collection */
export interface CollectionConfig {
	/** MongoDB collection name */
	collection: string;
	/** AACsearch index slug to sync to */
	indexSlug: string;
	/** Field mapping: MongoDB field → AACsearch document field (default: passthrough) */
	fieldMapping?: Record<string, string>;
	/** Column to use as _external_id (default: "_id") */
	idColumn?: string;
	/** Custom document transform function */
	transform?: (doc: Record<string, unknown>) => Record<string, unknown>;
	/** Include only these fields (whitelist) */
	includeFields?: string[];
	/** Exclude these fields (blacklist, e.g. ["password", "secret"]) */
	excludeFields?: string[];
}

/** Top-level MongoDB sync configuration */
export interface MongoSyncConfig {
	aacsearch: AacSearchConfig;
	/** MongoDB connection URI */
	mongoUri: string;
	/** Database name */
	dbName: string;
	/** Collection(s) to sync */
	collections: CollectionConfig[];
	/** Batch size for sending documents (default: 100) */
	batchSize?: number;
	/** Resume tokens file path to persist across restarts */
	resumeTokenFile?: string;
	/** Enable verbose logging */
	debug?: boolean;
}

/** Type of sync operation */
export type SyncAction = "INSERT" | "UPDATE" | "DELETE" | "REPLACE";

/** A single change event from MongoDB change stream */
export interface ChangeEvent {
	action: SyncAction;
	documentKey: { _id: unknown };
	fullDocument: Record<string, unknown> | null;
	/** The raw change stream event */
	raw: unknown;
}

/** Sync status callbacks */
export interface SyncCallbacks {
	onSync?: (event: { collection: string; action: SyncAction; documentCount: number; indexSlug: string }) => void;
	onError?: (error: Error, context?: Record<string, unknown>) => void;
	onConnected?: () => void;
	onDisconnected?: () => void;
	onInitialSyncProgress?: (event: { collection: string; indexSlug: string; total: number; synced: number }) => void;
}

/** Result of a sync operation */
export interface SyncResult {
	synced: number;
	skipped: number;
	errors: string[];
}

/** Resume token state for a single collection */
export interface ResumeTokenState {
	collection: string;
	token: unknown;
	timestamp: number;
}

/** Initial sync state */
export interface InitialSyncState {
	collection: string;
	indexSlug: string;
	totalDocuments: number;
	syncedDocuments: number;
}
