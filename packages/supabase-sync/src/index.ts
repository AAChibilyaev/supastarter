/**
 * @aacsearch/supabase-sync — Supabase real-time sync connector for AACsearch Engine.
 *
 * ## Quick start
 *
 * ```ts
 * import { createRealtimeSubscription } from "@aacsearch/supabase-sync";
 *
 * const rtClient = createRealtimeSubscription({
 *   aacsearch: {
 *     baseUrl: "https://api.aacsearch.com",
 *     token: "ss_connector_xxx",
 *     projectId: "org_xxx",
 *   },
 *   supabase: {
 *     url: "https://xxx.supabase.co",
 *     apiKey: "eyJhbGci...",
 *   },
 *   tables: [
 *     { table: "products", idColumn: "id" },
 *     { table: "categories", idColumn: "id", columns: ["name", "slug", "description"] },
 *   ],
 * });
 *
 * // Later: rtClient.disconnect();
 * ```
 *
 * ## Edge Function alternative
 *
 * For a serverless approach, deploy the Supabase Edge Function at
 * `src/edge-function/index.ts` as a Database Webhook trigger.
 */

export { createRealtimeSubscription } from "./realtime";
export { AacSearchClient } from "./client";
export { defaultMapper, pickColumns, flattenJsonColumn } from "./mapper";
export type {
	AacSearchConfig,
	SupabaseConfig,
	SupabaseSyncConfig,
	TableSyncConfig,
	RealtimeChangeEvent,
	RealtimeChangeType,
	SyncCallbacks,
	SyncResult,
} from "./types";
