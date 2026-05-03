/**
 * PostgreSQL Sync Connector — configuration types for @aacsearch/postgres-sync
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

/** Common sync options shared across strategies */
export interface SyncBaseConfig {
	aacsearch: AacSearchConfig;
	/** Schema name (default: "public") */
	schema?: string;
	/** Table name to sync */
	table: string;
	/** Column to use as AACsearch external_id (default: "id") */
	idColumn?: string;
	/** Initial full sync on start (default: true) */
	initialFullSync?: boolean;
	/** Batch size for sending documents (default: 100) */
	batchSize?: number;
	/** Enable verbose logging */
	debug?: boolean;
}

/** pg_notify LISTEN strategy configuration */
export interface PgNotifyConfig extends SyncBaseConfig {
	/** PostgreSQL connection string */
	connectionString: string;
	/** pg_notify channel name (default: "aacsearch_sync") */
	channel?: string;
}

/** Polling cursor strategy configuration */
export interface PollerConfig extends SyncBaseConfig {
	/** PostgreSQL connection string */
	connectionString: string;
	/** Column to use as cursor for incremental sync (e.g. "updated_at") */
	cursorColumn: string;
	/** Polling interval in milliseconds (default: 5000) */
	pollIntervalMs?: number;
}

/** Sequin CDC strategy configuration */
export interface SequinConfig extends SyncBaseConfig {
	/** Sequin stream HTTP endpoint */
	streamUrl: string;
	/** Sequin access token */
	accessToken: string;
}

/** Combined configuration for the PostgreSQL sync connector */
export type PostgresSyncConfig = PgNotifyConfig | PollerConfig | SequinConfig;

/** Type of sync operation */
export type SyncAction = "INSERT" | "UPDATE" | "DELETE";

/** A single change event from any strategy */
export interface ChangeEvent {
	action: SyncAction;
	row: Record<string, unknown>;
	/** Raw change payload (strategy-specific) */
	raw: unknown;
}

/** Sync status callbacks */
export interface SyncCallbacks {
	onSync?: (event: { table: string; action: SyncAction; documentCount: number }) => void;
	onError?: (error: Error, context?: Record<string, unknown>) => void;
	onConnected?: () => void;
	onDisconnected?: () => void;
}

/** Result of a sync operation */
export interface SyncResult {
	synced: number;
	skipped: number;
	errors: string[];
}

/** A function that transforms a PG row into an AACsearch document */
export type RowMapper = (row: Record<string, unknown>) => Record<string, unknown>;
