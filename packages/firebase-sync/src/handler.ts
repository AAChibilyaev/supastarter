/**
 * Firebase Cloud Function that triggers on Firestore document changes.
 * Deploy as a Firestore `onDocumentWritten` or `onDocumentCreated/Updated/Deleted` handler.
 *
 * ## Deployment
 *
 * ```bash
 * firebase deploy --only functions
 * ```
 *
 * ## Extension usage
 * When deployed as a Firebase Extension, this function is configured via
 * extension.yaml parameters (collection path, API key, etc.).
 */

import type { CollectionConfig, AacSearchConfig, SyncCallbacks } from "./types";

/**
 * Process a Firestore document change and sync to AACsearch.
 * This is the core handler used by Cloud Functions and CLI sync.
 *
 * @param changeEvent - The Firestore document change
 * @param collectionConfig - Configuration for this collection
 * @param aacsearch - AACsearch API config
 * @param callbacks - Optional sync callbacks
 */
export async function handleFirestoreChange(
	changeEvent: {
		type: "create" | "update" | "delete";
		documentId: string;
		data: Record<string, unknown> | null;
		oldData: Record<string, unknown> | null;
	},
	collectionConfig: CollectionConfig,
	aacsearch: AacSearchConfig,
	callbacks?: SyncCallbacks,
): Promise<void> {
	const { AacSearchClient } = await import("./client");
	const client = new AacSearchClient(aacsearch);
	const {
		indexSlug,
		fieldMapping,
		includeFields,
		excludeFields,
		transform,
		idField = "id",
	} = collectionConfig;

	try {
		if (changeEvent.type === "delete") {
			// Delete from AACsearch
			await client.deleteDocument(indexSlug, changeEvent.documentId);
			callbacks?.onSync?.({
				collection: collectionConfig.collectionPath,
				action: "DELETE",
				documentCount: 1,
				indexSlug,
			});
			return;
		}

		// Transform for create/update
		const rawData = changeEvent.data ?? {};
		const mapped = applyFieldMapping(rawData, changeEvent.documentId, {
			fieldMapping,
			includeFields,
			excludeFields,
			transform,
			idField,
		});

		await client.syncDocuments(indexSlug, [mapped]);
		callbacks?.onSync?.({
			collection: collectionConfig.collectionPath,
			action: changeEvent.type === "create" ? "INSERT" : "UPDATE",
			documentCount: 1,
			indexSlug,
		});
	} catch (err) {
		callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)), {
			collection: collectionConfig.collectionPath,
			documentId: changeEvent.documentId,
		});
		throw err;
	}
}

/**
 * Apply field mapping and filtering to a Firestore document.
 */
export function applyFieldMapping(
	data: Record<string, unknown>,
	documentId: string,
	options: {
		fieldMapping?: Record<string, string>;
		includeFields?: string[];
		excludeFields?: string[];
		transform?: (doc: Record<string, unknown>, docId: string) => Record<string, unknown>;
		idField: string;
	},
): Record<string, unknown> {
	const { fieldMapping, includeFields, excludeFields, transform, idField } = options;

	let result: Record<string, unknown>;

	// Start with the doc ID
	result = { [idField]: documentId };

	// Apply field mapping or passthrough
	if (fieldMapping) {
		for (const [firestoreField, aacField] of Object.entries(fieldMapping)) {
			if (firestoreField in data) {
				result[aacField] = data[firestoreField];
			}
		}
	} else {
		// Passthrough all fields except the id field (already set)
		for (const [key, value] of Object.entries(data)) {
			if (key !== idField) {
				result[key] = value;
			}
		}
	}

	// Apply include filter
	if (includeFields && includeFields.length > 0) {
		result = Object.fromEntries(
			Object.entries(result).filter(
				([key]) => key === idField || includeFields.includes(key),
			),
		);
	}

	// Apply exclude filter
	if (excludeFields && excludeFields.length > 0) {
		for (const field of excludeFields) {
			delete result[field];
		}
	}

	// Apply custom transform
	if (transform) {
		result = transform(result, documentId);
	}

	return result;
}
