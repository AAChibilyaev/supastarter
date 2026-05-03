/**
 * CLI tool for @aacsearch/firebase-sync.
 * Provides commands for initial sync, status, and monitoring.
 *
 * Usage:
 *   npx aacsearch-firebase-sync index --config=firebase-sync.json
 *   npx aacsearch-firebase-sync watch --config=firebase-sync.json
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { FirebaseSyncConfig, CollectionConfig } from "./types";

async function loadConfig(configPath: string): Promise<FirebaseSyncConfig> {
	const resolved = resolve(process.cwd(), configPath);
	const content = await readFile(resolved, "utf-8");
	return JSON.parse(content) as FirebaseSyncConfig;
}

/**
 * Perform initial full sync: read all documents from a Firestore collection and push to AACsearch.
 */
export async function initialCollectionSync(
	collectionConfig: CollectionConfig,
	aacsearch: FirebaseSyncConfig["aacsearch"],
	firestore: FirebaseFirestore.Firestore,
	onProgress?: (synced: number, total: number) => void,
): Promise<{ synced: number; errors: string[] }> {
	const { AacSearchClient } = await import("./client");
	const client = new AacSearchClient(aacsearch);
	const { applyFieldMapping } = await import("./handler");

	const { collectionPath, indexSlug, idField = "id" } = collectionConfig;
	const batchSize = 100;

	const snapshot = await firestore.collection(collectionPath).get();
	const total = snapshot.size;
	let synced = 0;
	const errors: string[] = [];

	let batch: Record<string, unknown>[] = [];

	for (const doc of snapshot.docs) {
		try {
			const data = doc.data() as Record<string, unknown>;
			const mapped = applyFieldMapping(data, doc.id, {
				fieldMapping: collectionConfig.fieldMapping,
				includeFields: collectionConfig.includeFields,
				excludeFields: collectionConfig.excludeFields,
				transform: collectionConfig.transform,
				idField,
			});
			batch.push(mapped);

			if (batch.length >= batchSize) {
				const result = await client.syncDocuments(indexSlug, batch);
				synced += result.synced;
				if (result.errors.length > 0) errors.push(...result.errors);
				batch = [];
				onProgress?.(synced, total);
			}
		} catch (err) {
			errors.push(
				`Failed to process document ${doc.id}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	// Flush remaining
	if (batch.length > 0) {
		const result = await client.syncDocuments(indexSlug, batch);
		synced += result.synced;
		if (result.errors.length > 0) errors.push(...result.errors);
	}

	onProgress?.(synced, total);
	return { synced, errors };
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const command = args[0];

	if (!command || command === "--help") {
		console.log(`
Usage:
  aacsearch-firebase-sync index --config=<path>   Initial full sync of all configured collections
  aacsearch-firebase-sync watch --config=<path>    Start cloud function watcher (local emulator)
  aacsearch-firebase-sync --help                   Show this help
		`);
		return;
	}

	const configArg = args.find((a) => a.startsWith("--config="));
	if (!configArg) {
		console.error("Error: --config=<path> is required");
		process.exit(1);
	}

	const configPath = configArg.split("=")[1]!;
	const config = await loadConfig(configPath);

	switch (command) {
		case "index": {
			console.log(`Starting initial sync for ${config.collections.length} collection(s)...`);
			for (const collConfig of config.collections) {
				console.log(`  Syncing ${collConfig.collectionPath} → ${collConfig.indexSlug}...`);
				// When running as CLI, initialize Firebase Admin SDK
				const { initializeApp, getApps, cert } = await import("firebase-admin/app");
				const { getFirestore } = await import("firebase-admin/firestore");

				if (getApps().length === 0) {
					initializeApp();
				}

				const firestore = getFirestore();
				const result = await initialCollectionSync(
					collConfig,
					config.aacsearch,
					firestore,
					(synced, total) => {
						process.stdout.write(`\r  Progress: ${synced}/${total} documents`);
					},
				);
				console.log(`  Done: ${result.synced} synced, ${result.errors.length} errors`);
			}
			break;
		}
		case "watch": {
			console.log("To deploy as a Firebase Cloud Function, run:");
			console.log("  firebase deploy --only functions");
			console.log("Or use the local emulator:");
			console.log("  firebase emulators:start");
			break;
		}
		default:
			console.error(`Unknown command: ${command}`);
			process.exit(1);
	}
}

// Run CLI if invoked directly
if (require.main === module) {
	main().catch((err) => {
		console.error("Fatal error:", err);
		process.exit(1);
	});
}
