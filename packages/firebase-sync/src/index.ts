/**
 * @aacsearch/firebase-sync — Firebase/Firestore real-time sync connector for AACsearch Engine.
 *
 * Sync Firestore collections to AACsearch in real-time using Firebase Cloud Functions.
 *
 * ## Quick start (Cloud Function)
 *
 * ```typescript
 * import { onDocumentWritten } from "firebase-functions/v2/firestore";
 * import { createFirestoreSyncHandler } from "@aacsearch/firebase-sync";
 *
 * const config = {
 *   aacsearch: {
 *     baseUrl: process.env.AACSEARCH_URL!,
 *     token: process.env.AACSEARCH_TOKEN!,
 *     projectId: process.env.AACSEARCH_PROJECT_ID!,
 *   },
 *   collectionPath: "products",
 *   indexSlug: "products",
 * };
 *
 * export const syncProducts = onDocumentWritten("products/{docId}", createFirestoreSyncHandler(config));
 * ```
 *
 * ## Quick start (CLI initial sync)
 *
 * ```bash
 * npx aacsearch-firebase-sync index --config=firebase-config.json
 * ```
 */

export { createFirestoreSyncHandler } from "./cloud-function";
export { handleFirestoreChange, applyFieldMapping } from "./handler";
export { initialCollectionSync } from "./cli";
export { AacSearchClient } from "./client";
export type {
	AacSearchConfig,
	FieldMapping,
	CollectionConfig,
	FirebaseSyncConfig,
	FirestoreChangeType,
	FirestoreChangeEvent,
	SyncCallbacks,
	SyncResult,
} from "./types";
