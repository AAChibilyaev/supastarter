/**
 * Supabase Realtime subscription handler.
 * Subscribes to postgres_changes on configured tables and pushes
 * row-level changes to AACsearch via the Connector API.
 */

import { RealtimeClient } from "@supabase/realtime-js";

import { AacSearchClient } from "./client";
import type {
	SupabaseSyncConfig,
	TableSyncConfig,
	RealtimeChangeEvent,
	RealtimeChangeType,
	SyncCallbacks,
} from "./types";

/**
 * Subscribe to Supabase Realtime changes for all configured tables.
 * Returns the RealtimeClient instance so the caller can close it.
 */
export function createRealtimeSubscription(
	config: SupabaseSyncConfig,
	callbacks?: SyncCallbacks,
): RealtimeClient {
	const client = new AacSearchClient(config.aacsearch);
	const rtClient = new RealtimeClient(config.supabase.url, {
		params: { apikey: config.supabase.apiKey },
	});
	const batchSize = config.batchSize ?? 50;
	const log = config.debug
		? (...args: unknown[]) => console.log("[supabase-sync]", ...args)
		: () => {};

	for (const tableCfg of config.tables) {
		const schema = tableCfg.schema ?? "public";
		const channelName = `aacsearch-sync:${schema}:${tableCfg.table}`;

		const channelFilters: Record<string, unknown> = {
			event: "*",
			schema,
			table: tableCfg.table,
		};
		if (tableCfg.filter) {
			channelFilters.filter = tableCfg.filter;
		}

		const channel = rtClient.channel(channelName);

		channel.on("postgres_changes" as never, channelFilters, async (payload: unknown) => {
			const event = payload as RealtimeChangeEvent;
			try {
				await handleChange(client, tableCfg, event, batchSize, log, callbacks);
			} catch (error) {
				callbacks?.onError?.(error instanceof Error ? error : new Error(String(error)), {
					table: tableCfg.table,
					type: event.type,
					event,
				});
			}
		});

		channel.subscribe((status: string) => {
			log(`Channel "${channelName}" status: ${status}`);
		});

		log(`Subscribed to ${schema}.${tableCfg.table}`);
	}

	return rtClient;
}

/**
 * Handle a single Realtime change event.
 * For INSERT/UPDATE: push the new row as a document.
 * For DELETE: remove the document by external_id.
 */
async function handleChange(
	client: AacSearchClient,
	tableCfg: TableSyncConfig,
	event: RealtimeChangeEvent,
	batchSize: number,
	log: (...args: unknown[]) => void,
	callbacks?: SyncCallbacks,
): Promise<void> {
	const idColumn = tableCfg.idColumn ?? "id";

	if (event.type === "DELETE") {
		const oldRow = event.old ?? {};
		const externalId = String(oldRow[idColumn] ?? "");
		if (!externalId) {
			log(`DELETE event missing ${idColumn}, skipping`, event);
			return;
		}
		await client.deleteDocument(externalId);
		log(`Deleted document ${externalId} from ${tableCfg.table}`);
		callbacks?.onSync?.({
			table: tableCfg.table,
			type: "DELETE",
			documentCount: 1,
		});
		return;
	}

	// INSERT or UPDATE
	const row = event.new ?? {};
	if (!row || Object.keys(row as Record<string, unknown>).length === 0) {
		log(`Empty row in ${event.type} event, skipping`);
		return;
	}

	const rowRecord = row as Record<string, unknown>;
	const externalId = String(rowRecord[idColumn] ?? "");
	if (!externalId) {
		log(`${event.type} event missing ${idColumn}, skipping`);
		return;
	}

	// Build document
	let document: Record<string, unknown>;

	if (tableCfg.mapper) {
		document = tableCfg.mapper(rowRecord);
	} else if (tableCfg.columns && tableCfg.columns.length > 0) {
		document = { external_id: externalId };
		for (const col of tableCfg.columns) {
			if (col in rowRecord) {
				document[col] = rowRecord[col];
			}
		}
	} else {
		document = { external_id: externalId, ...rowRecord };
	}

	// Ensure external_id is always set
	document.external_id = externalId;

	await client.syncDocuments([document]);
	log(`Synced ${externalId} (${event.type}) to ${tableCfg.table}`);
	callbacks?.onSync?.({
		table: tableCfg.table,
		type: event.type as RealtimeChangeType,
		documentCount: 1,
	});
}
