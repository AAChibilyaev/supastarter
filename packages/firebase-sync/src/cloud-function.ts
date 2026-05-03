/**
 * Firebase Cloud Function entry point for AACsearch sync.
 *
 * Deploy as a Cloud Function that triggers on Firestore document writes.
 *
 * ## Quick deploy
 *
 * 1. `npm install @aacsearch/firebase-sync`
 * 2. Create `functions/index.ts` that re-exports or imports from this module
 * 3. `firebase deploy --only functions`
 *
 * ## Example functions/index.ts
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
 *   collection: "products",
 *   indexSlug: "products",
 * };
 *
 * export const syncProducts = onDocumentWritten("products/{docId}", createFirestoreSyncHandler(config));
 * ```
 */

import type { CollectionConfig, AacSearchConfig } from "./types";

/**
 * Create a Firestore v2 onDocumentWritten handler.
 *
 * @param config - Collection sync config + AACsearch config
 * @returns A handler function compatible with firebase-functions v2 onDocumentWritten
 */
export function createFirestoreSyncHandler(
	config: CollectionConfig & { aacsearch: AacSearchConfig },
): (event: FirestoreEvent) => Promise<void> {
	return async (event: FirestoreEvent) => {
		const { handleFirestoreChange: handler } = await import("./handler");

		const before = event.data?.data?.() as Record<string, unknown> | undefined;
		const after = event.data?.exists
			? (event.data.data?.() as Record<string, unknown> | undefined)
			: undefined;
		const documentId = event.params?.docId ?? event.data?.id ?? "";

		if (!before && !after) {
			return;
		}

		const type: "create" | "update" | "delete" =
			!before && after ? "create" : before && !after ? "delete" : "update";

		await handler(
			{
				type,
				documentId,
				data: (after as Record<string, unknown>) ?? null,
				oldData: (before as Record<string, unknown>) ?? null,
			},
			config as CollectionConfig,
			config.aacsearch,
		);
	};
}

/** Minimal Firestore event type for the handler */
export interface FirestoreEvent {
	data?: {
		id: string;
		exists: boolean;
		data?: () => Record<string, unknown> | undefined;
	};
	params?: Record<string, string>;
}
