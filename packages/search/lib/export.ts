import "server-only";
import { logger } from "@repo/logs";

import { getTypesenseClient, getTypesenseClientForOrg } from "./client";

export interface ExportDocumentsInput {
	/** Physical collection name (not alias) */
	collection: string;
	/** Optional filter_by expression */
	filterBy?: string;
	/** Optional per-batch page size for paginated export */
	perPage?: number;
	/** Organization ID for region-aware routing. If provided, uses the org's storage region Typesense cluster. */
	organizationId?: string;
}

export interface ExportDocumentsResult {
	/** Total number of documents exported */
	total: number;
	/** Parsed document objects */
	documents: Record<string, unknown>[];
	/** Number of parse failures */
	parseFailures: number;
}

/**
 * Export documents from a Typesense collection with optional filtering.
 *
 * Uses Typesense's native `documents().export()` which returns JSONL.
 * Supports `filter_by` for partial exports.
 */
export async function exportDocuments(input: ExportDocumentsInput): Promise<ExportDocumentsResult> {
	const client = input.organizationId
		? await getTypesenseClientForOrg(input.organizationId)
		: getTypesenseClient();

	const exportParams: Record<string, unknown> = {};
	if (input.filterBy) {
		exportParams.filter_by = input.filterBy;
	}
	if (input.perPage) {
		exportParams.page = 1;
		exportParams.per_page = input.perPage;
	}

	const raw = await client.collections(input.collection).documents().export(exportParams);

	const lines = raw.split("\n").filter((line) => line.trim().length > 0);
	const documents: Record<string, unknown>[] = [];
	let parseFailures = 0;

	for (const line of lines) {
		try {
			const doc = JSON.parse(line) as Record<string, unknown>;
			documents.push(doc);
		} catch {
			parseFailures += 1;
			logger.warn("Failed to parse exported document line", { line: line.slice(0, 200) });
		}
	}

	return {
		total: documents.length,
		documents,
		parseFailures,
	};
}

export interface ExportDocumentsStreamInput {
	/** Physical collection name (not alias) */
	collection: string;
	/** Optional filter_by expression */
	filterBy?: string;
	/** Organization ID for region-aware routing. If provided, uses the org's storage region Typesense cluster. */
	organizationId?: string;
}

/**
 * Export documents as a raw JSONL string (streaming ready).
 * Useful for large exports where you don't want to hold all docs in memory.
 */
export async function exportDocumentsRaw(input: ExportDocumentsStreamInput): Promise<string> {
	const client = input.organizationId
		? await getTypesenseClientForOrg(input.organizationId)
		: getTypesenseClient();

	const exportParams: Record<string, unknown> = {};
	if (input.filterBy) {
		exportParams.filter_by = input.filterBy;
	}

	return client.collections(input.collection).documents().export(exportParams);
}
