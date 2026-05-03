/**
 * Sequin CDC strategy.
 *
 * Polls a Sequin stream endpoint (logical replication consumer)
 * and pushes change events to AACsearch.
 *
 * Sequin streams deliver CDC events as ordered HTTP batches.
 * See: https://docs.sequin.io
 */

import { AacSearchClient } from "./client";
import type { SequinConfig, SyncCallbacks, RowMapper, SyncResult } from "./types";

interface SequinEvent {
	record: {
		id: string;
		action: "insert" | "update" | "delete";
		fields: Record<string, unknown>;
		commit_timestamp: string;
		table_name: string;
	};
}

/**
 * Start consuming a Sequin CDC stream and sync to AACsearch.
 * Returns an object with `.stop()` to gracefully shut down.
 */
export function startSequinCdcSync(
	config: SequinConfig,
	mapper?: RowMapper,
	callbacks?: SyncCallbacks,
): { stop: () => void } {
	const client = new AacSearchClient(config.aacsearch);
	const idCol = config.idColumn ?? "id";
	const batchSize = config.batchSize ?? 100;
	const log = config.debug
		? (...args: unknown[]) => console.log("[postgres-sync:sequin]", ...args)
		: () => {};

	let running = true;
	let lastCursor: string | null = null;

	function defaultMapperFn(row: Record<string, unknown>): Record<string, unknown> {
		const doc: Record<string, unknown> = { external_id: String(row[idCol] ?? "") };
		for (const [key, value] of Object.entries(row)) {
			if (key === idCol) continue;
			if (value === null || value === undefined) continue;
			doc[key] = typeof value === "object" ? JSON.stringify(value) : value;
		}
		return doc;
	}

	const effectiveMapper = mapper ?? defaultMapperFn;

	async function pollStream(): Promise<void> {
		while (running) {
			try {
				const url = lastCursor
					? `${config.streamUrl}?cursor=${encodeURIComponent(lastCursor)}&limit=100`
					: `${config.streamUrl}?limit=100`;

				const res = await fetch(url, {
					headers: {
						Authorization: `Bearer ${config.accessToken}`,
						"Content-Type": "application/json",
					},
				});

				if (!res.ok) {
					const body = await res.text().catch(() => "");
					throw new Error(`Sequin stream fetch failed: ${res.status} ${body}`);
				}

				const data = (await res.json()) as {
					events: SequinEvent[];
					cursor?: string;
				};

				if (!data.events || data.events.length === 0) {
					await sleep(5000);
					continue;
				}

				// Process events in batches
				const inserts: Record<string, unknown>[] = [];
				const deletes: string[] = [];

				for (const event of data.events) {
					if (event.record.action === "delete") {
						const externalId = String(event.record.fields[idCol] ?? "");
						if (externalId) deletes.push(externalId);
					} else {
						const doc = effectiveMapper(event.record.fields);
						inserts.push(doc);
					}
				}

				// Batch sync inserts/updates
				for (let i = 0; i < inserts.length; i += batchSize) {
					const batch = inserts.slice(i, i + batchSize);
					await client.syncDocuments(batch);
				}
				log(`Synced ${inserts.length} inserts/updates from Sequin stream`);

				// Batch deletes
				if (deletes.length > 0) {
					await client.batchDelete(deletes);
					log(`Deleted ${deletes.length} documents from Sequin stream`);
				}

				callbacks?.onSync?.({
					table: config.table,
					action: inserts.length > 0 ? "INSERT" : "DELETE",
					documentCount: inserts.length + deletes.length,
				});

				// Advance cursor
				if (data.cursor) {
					lastCursor = data.cursor;
				}
			} catch (error) {
				callbacks?.onError?.(error instanceof Error ? error : new Error(String(error)), {
					table: config.table,
					strategy: "sequin",
				});
				if (running) await sleep(5000);
			}
		}
	}

	pollStream().catch((err) => {
		callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)), {
			table: config.table,
			strategy: "sequin",
		});
	});

	return {
		stop: () => {
			running = false;
		},
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
