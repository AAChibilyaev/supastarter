/**
 * Firebase Sync Connector — configuration types for @aacsearch/firebase-sync
 */

/** AACsearch connection configuration */
export interface AacSearchConfig {
	baseUrl: string;
	token: string;
	projectId: string;
}

/** Field mapping: Firestore field → AACsearch document field */
export interface FieldMapping {
	[mongoField: string]: string;
}

/** Sync configuration for a single Firestore collection */
export interface CollectionConfig {
	/** Firestore collection path (e.g. "products" or "users/abc/orders") */
	collectionPath: string;
	/** AACsearch index slug */
	indexSlug: string;
	/** Field mapping from Firestore field names to AACsearch field names */
	fieldMapping?: FieldMapping;
	/** Document ID field in AACsearch (default: "id") */
	idField?: string;
	/** Include only these fields */
	includeFields?: string[];
	/** Exclude these fields */
	excludeFields?: string[];
	/** Custom document transform function */
	transform?: (doc: Record<string, unknown>, docId: string) => Record<string, unknown>;
}

/** Top-level Firebase sync configuration */
export interface FirebaseSyncConfig {
	aacsearch: AacSearchConfig;
	/** Google Cloud Project ID (auto-detected if deployed) */
	gcpProjectId?: string;
	/** Collections to sync */
	collections: CollectionConfig[];
	/** Batch size (default: 100) */
	batchSize?: number;
	/** Enable verbose logging */
	debug?: boolean;
}

/** Change event type from Firestore */
export type FirestoreChangeType = "create" | "update" | "delete";

/** A Firestore change event */
export interface FirestoreChangeEvent {
	type: FirestoreChangeType;
	documentId: string;
	data: Record<string, unknown> | null;
	oldData: Record<string, unknown> | null;
}

/** Sync callbacks */
export interface SyncCallbacks {
	onSync?: (event: {
		collection: string;
		action: string;
		documentCount: number;
		indexSlug: string;
	}) => void;
	onError?: (error: Error, context?: Record<string, unknown>) => void;
	onInitialSyncProgress?: (event: {
		collection: string;
		indexSlug: string;
		total: number;
		synced: number;
	}) => void;
}

/** Sync result */
export interface SyncResult {
	synced: number;
	skipped: number;
	errors: string[];
}
