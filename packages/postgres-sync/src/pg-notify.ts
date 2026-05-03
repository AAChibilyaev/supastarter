/**
 * pg_notify LISTEN strategy.
 *
 * Requires a trigger function on the PG table:
 * ```sql
 * CREATE OR REPLACE FUNCTION notify_aacsearch()
 * RETURNS trigger AS $$
 * BEGIN
 *   PERFORM pg_notify('aacsearch_sync', row_to_json(NEW)::text);
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql;
 *
 * CREATE TRIGGER products_aacsearch_trigger
 * AFTER INSERT OR UPDATE ON products
 * FOR EACH ROW EXECUTE FUNCTION notify_aacsearch();
 * ```
 */

import { Client } from "pg";

import { AacSearchClient } from "./client";
import type { PgNotifyConfig, ChangeEvent, SyncCallbacks, RowMapper } from "./types";

/** Default mapper: row → AACsearch document */
function defaultMapper(row: Record<string, unknown>, idColumn: string): Record<string, unknown> {
	const doc: Record<string, unknown> = {
		external_id: String(row[idColumn] ?? ""),
	};
	for (const [key, value] of Object.entries(row)) {
		if (key === idColumn) continue;
		if (value === null || value === undefined) continue;
		doc[key] = typeof value === "object" ? JSON.stringify(value) : value;
	}
	return doc;
}

/**
 * Start a pg_notify listener that subscribes to PostgreSQL
 * NOTIFY events and pushes changes to AACsearch.
 *
 * Returns the PG Client instance. Call `.end()` to stop.
 */
export async function startPgNotifyListener(
	config: PgNotifyConfig,
	mapper?: RowMapper,
	callbacks?: SyncCallbacks,
): Promise<Client> {
	const client = new AacSearchClient(config.aacsearch);
	const pg = new Client({ connectionString: config.connectionString });
	const channel = config.channel ?? "aacsearch_sync";
	const idCol = config.idColumn ?? "id";
	const batchSize = config.batchSize ?? 100;
	const log = config.debug
		? (...args: unknown[]) => console.log("[postgres-sync:pg_notify]", ...args)
		: () => {};

	await pg.connect();
	log(`Connected to PostgreSQL, listening on channel "${channel}"`);

	// Initial full sync if configured
	if (config.initialFullSync ?? true) {
		log("Running initial full sync...");
		const allRows = await fetchAllRows(pg, config.schema ?? "public", config.table, idCol, log);
		log(`Fetched ${allRows.length} rows for initial sync`);

		const documents = allRows.map((r) => (mapper ?? ((row) => defaultMapper(row, idCol)))(r));

		// Batch in chunks
		for (let i = 0; i < documents.length; i += batchSize) {
			const batch = documents.slice(i, i + batchSize);
			await client.syncDocuments(batch);
			log(
				`Initial sync batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`,
			);
		}
		callbacks?.onSync?.({
			table: config.table,
			action: "INSERT",
			documentCount: documents.length,
		});
	}

	// Listen for NOTIFY events
	await pg.query(`LISTEN "${channel}"`);
	log(`Listening for NOTIFY on channel "${channel}"`);

	pg.on("notification", async (msg) => {
		if (!msg.payload) return;
		try {
			const row = JSON.parse(msg.payload) as Record<string, unknown>;
			const doc = (mapper ?? ((r) => defaultMapper(r, idCol)))(row);
			const externalId = String(row[idCol] ?? "");
			if (externalId) doc.external_id = externalId;

			await client.syncDocuments([doc]);
			log(`Synced ${externalId} via pg_notify`);
			callbacks?.onSync?.({
				table: config.table,
				action: "INSERT",
				documentCount: 1,
			});
		} catch (error) {
			callbacks?.onError?.(error instanceof Error ? error : new Error(String(error)), {
				table: config.table,
				payload: msg.payload,
			});
		}
	});

	callbacks?.onConnected?.();

	pg.on("end", () => {
		callbacks?.onDisconnected?.();
	});

	return pg;
}

async function fetchAllRows(
	pg: Client,
	schema: string,
	table: string,
	idCol: string,
	log: (...args: unknown[]) => void,
): Promise<Record<string, unknown>[]> {
	const query = `SELECT * FROM "${schema}"."${table}" ORDER BY "${idCol}"`;
	const result = await pg.query(query);
	return result.rows.map((row: Record<string, unknown>) => ({ ...row }));
}
