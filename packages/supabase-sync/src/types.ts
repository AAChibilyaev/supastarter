/**
 * Supabase Sync Connector — configuration types for @aacsearch/supabase-sync
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

/** Supabase Realtime connection configuration */
export interface SupabaseConfig {
	/** Supabase project URL (e.g. https://xxx.supabase.co) */
	url: string;
	/** Supabase anon or service_role key */
	apiKey: string;
}

/** A single Supabase table to sync into AACsearch */
export interface TableSyncConfig {
	/** Schema name (default: "public") */
	schema?: string;
	/** Table name to subscribe to */
	table: string;
	/** Column to use as AACsearch external_id (default: "id") */
	idColumn?: string;
	/** Columns to include in the AACsearch document. If empty, all columns are included. */
	columns?: string[];
	/** A function that transforms a Supabase row into an AACsearch document.
	 *  If not provided, the raw row is used as-is. */
	mapper?: (row: Record<string, unknown>) => Record<string, unknown>;
	/** Filter: only sync rows matching this WHERE clause (e.g. "published = true") */
	filter?: string;
}

/** Full configuration for the Supabase Sync connector */
export interface SupabaseSyncConfig {
	aacsearch: AacSearchConfig;
	supabase: SupabaseConfig;
	tables: TableSyncConfig[];
	/** Batch size for sending documents to AACsearch (default: 50) */
	batchSize?: number;
	/** Enable verbose logging */
	debug?: boolean;
}

/** Type of database change received from Supabase Realtime */
export type RealtimeChangeType = "INSERT" | "UPDATE" | "DELETE";

/** A single change event from Supabase Realtime */
export interface RealtimeChangeEvent {
	type: RealtimeChangeType;
	schema: string;
	table: string;
	columns: Array<{
		name: string;
		type: string;
		flags?: string[];
	}>;
	commit_timestamp: string;
	old: Record<string, unknown> | null;
	new: Record<string, unknown> | null;
	errors: string | null;
}

/** Sync status callback for monitoring */
export interface SyncCallbacks {
	onSync?: (event: { table: string; type: RealtimeChangeType; documentCount: number }) => void;
	onError?: (error: Error, context?: Record<string, unknown>) => void;
}

/** Result of a sync operation */
export interface SyncResult {
	synced: number;
	skipped: number;
	errors: string[];
}
