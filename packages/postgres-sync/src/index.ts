/**
 * @aacsearch/postgres-sync — PostgreSQL real-time sync connector for AACsearch Engine.
 *
 * Three sync strategies:
 * 1. **pg_notify** — LISTEN/NOTIFY trigger-based (recommended, low latency).
 * 2. **Polling cursor** — periodic query on a cursor column (e.g. updated_at).
 * 3. **Sequin CDC** — logical replication via Sequin streams.
 *
 * ## Quick start (pg_notify)
 *
 * ```sql
 * CREATE OR REPLACE FUNCTION notify_aacsearch()
 * RETURNS trigger AS $$ BEGIN
 *   PERFORM pg_notify('aacsearch_sync', row_to_json(NEW)::text);
 *   RETURN NEW;
 * END; $$ LANGUAGE plpgsql;
 * ```
 *
 * ```typescript
 * import { startPgNotifyListener } from "@aacsearch/postgres-sync";
 *
 * const pg = await startPgNotifyListener({
 *   aacsearch: { baseUrl: "https://api.aacsearch.com", token: "ss_connector_xxx", projectId: "org_xxx" },
 *   connectionString: "postgresql://...",
 *   table: "products",
 * });
 * ```
 *
 * ## Quick start (polling)
 *
 * ```typescript
 * import { startPollingSync } from "@aacsearch/postgres-sync";
 *
 * const poller = startPollingSync({
 *   aacsearch: { baseUrl: "https://api.aacsearch.com", token: "ss_connector_xxx", projectId: "org_xxx" },
 *   connectionString: "postgresql://...",
 *   table: "products",
 *   cursorColumn: "updated_at",
 *   pollIntervalMs: 5000,
 * });
 *
 * // Later: poller.stop();
 * ```
 *
 * ## Quick start (Sequin CDC)
 *
 * ```typescript
 * import { startSequinCdcSync } from "@aacsearch/postgres-sync";
 *
 * const sequin = startSequinCdcSync({
 *   aacsearch: { baseUrl: "https://api.aacsearch.com", token: "ss_connector_xxx", projectId: "org_xxx" },
 *   streamUrl: "https://api.sequin.io/streams/YOUR_STREAM_ID",
 *   accessToken: "seq_xxx",
 *   table: "products",
 * });
 * ```
 */

export { startPgNotifyListener } from "./pg-notify";
export { startPollingSync } from "./poller";
export { startSequinCdcSync } from "./sequin-cdc";
export { AacSearchClient } from "./client";
export { withRetry, chunk, mergeResults } from "./batch";
export type {
	AacSearchConfig,
	PgNotifyConfig,
	PollerConfig,
	SequinConfig,
	PostgresSyncConfig,
	SyncAction,
	ChangeEvent,
	SyncCallbacks,
	SyncResult,
	RowMapper,
} from "./types";
