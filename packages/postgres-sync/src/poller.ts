/**
 * Polling cursor strategy.
 *
 * Periodically queries the PG table ordered by a cursor column
 * (e.g. updated_at) and fetches rows newer than the last seen cursor value.
 * Suitable for tables without triggers or where pg_notify is unavailable.
 */

import { Client } from "pg";

import { AacSearchClient } from "./client";
import type { PollerConfig, SyncCallbacks, RowMapper } from "./types";

interface CursorState {
	value: string | number | Date | null;
}

function defaultMapper(row: Record<string, unknown>, idColumn: string): Record<string, unknown> {
	const doc: Record<string, unknown> = { external_id: String(row[idColumn] ?? "") };
	for (const [key, value] of Object.entries(row)) {
		if (key === idColumn) continue;
		if (value === null || value === undefined) continue;
		doc[key] = typeof value === "object" ? JSON.stringify(value) : value;
	}
	return doc;
}

/** Fetch all rows for initial full sync */
async function fetchAllRows(
	pg: Client,
	schema: string,
	table: string,
	idCol: string,
): Promise<Record<string, unknown>[]> {
	const result = await pg.query(`SELECT * FROM "${schema}"."${table}" ORDER BY "${idCol}"`);
	return result.rows as Record<string, unknown>[];
}

/** Poll once and return the number of rows synced */
async function pollOnce(
	pg: Client,
	client: AacSearchClient,
	schema: string,
	table: string,
	idCol: string,
	cursorCol: string,
	batchSize: number,
	cursor: CursorState,
	mapper: RowMapper | undefined,
	callbacks: SyncCallbacks | undefined,
	log: (...args: unknown[]) => void,
): Promise<void> {
	let query: string;
	let params: unknown[];
	if (cursor.value !== null) {
		query = `SELECT * FROM "${schema}"."${table}" WHERE "${cursorCol}" > $1 ORDER BY "${cursorCol}"`;
		params = [cursor.value];
	} else {
		query = `SELECT * FROM "${schema}"."${table}" ORDER BY "${cursorCol}"`;
		params = [];
	}

	const result = await pg.query(query, params);
	if (result.rows.length === 0) return;

	const rows = result.rows as Record<string, unknown>[];
	const documents = rows.map((r) => (mapper ?? ((row) => defaultMapper(row, idCol)))(r));

	for (let i = 0; i < documents.length; i += batchSize) {
		const batch = documents.slice(i, i + batchSize);
		await client.syncDocuments(batch);
	}

	// Update cursor
	const lastRow = rows[rows.length - 1];
	cursor.value = (lastRow[cursorCol] as string | number | Date) ?? null;

	log(`Polled ${rows.length} rows, cursor now at ${cursor.value}`);
	callbacks?.onSync?.({
		table,
		action: "UPDATE",
		documentCount: documents.length,
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Start a polling cursor that periodically queries the PG table
 * and pushes new/updated rows to AACsearch.
 *
 * Returns an object with `.stop()` to gracefully shut down.
 */
export function startPollingSync(
	config: PollerConfig,
	mapper?: RowMapper,
	callbacks?: SyncCallbacks,
): { stop: () => void } {
	const client = new AacSearchClient(config.aacsearch);
	const idCol = config.idColumn ?? "id";
	const cursorCol = config.cursorColumn;
	const pollIntervalMs = config.pollIntervalMs ?? 5000;
	const batchSize = config.batchSize ?? 100;
	const schema = config.schema ?? "public";
	const table = config.table;
	const log = config.debug
		? (...args: unknown[]) => console.log("[postgres-sync:poller]", ...args)
		: () => {};

	// Mutable cursor state shared by reference
	const cursor: CursorState = { value: null };
	let running = true;
	let pgClient: Client | null = null;

	async function run(): Promise<void> {
		if (!running) return;

		try {
			pgClient = new Client({ connectionString: config.connectionString });
			await pgClient.connect();
			log("Polling client connected");

			callbacks?.onConnected?.();

			// Initial full sync
			if (config.initialFullSync ?? true) {
				const allRows = await fetchAllRows(pgClient, schema, table, idCol);
				const documents = allRows.map((r) =>
					(mapper ?? ((row) => defaultMapper(row, idCol)))(r),
				);
				for (let i = 0; i < documents.length; i += batchSize) {
					const batch = documents.slice(i, i + batchSize);
					await client.syncDocuments(batch);
				}
				callbacks?.onSync?.({
					table,
					action: "INSERT",
					documentCount: documents.length,
				});

				// Set cursor to the max value so next poll only gets newer rows
				if (allRows.length > 0) {
					const lastRow = allRows[allRows.length - 1];
					cursor.value = (lastRow[cursorCol] as string | number | Date) ?? null;
				}
			}

			// Poll loop
			while (running) {
				await pollOnce(
					pgClient,
					client,
					schema,
					table,
					idCol,
					cursorCol,
					batchSize,
					cursor,
					mapper,
					callbacks,
					log,
				);
				await sleep(pollIntervalMs);
			}
		} catch (error) {
			callbacks?.onError?.(error instanceof Error ? error : new Error(String(error)), {
				table,
				strategy: "poller",
			});
		} finally {
			if (pgClient) {
				await pgClient.end().catch(() => {});
				pgClient = null;
			}
		}
	}

	// Start in background
	run().catch((err) => {
		callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)), {
			table,
			strategy: "poller",
		});
	});

	return {
		stop: () => {
			running = false;
			if (pgClient) {
				pgClient.end().catch(() => {});
				pgClient = null;
			}
			callbacks?.onDisconnected?.();
		},
	};
}
