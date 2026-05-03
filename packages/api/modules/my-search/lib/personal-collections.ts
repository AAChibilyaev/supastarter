import { logger } from "@repo/logs";
import {
	aliasName,
	bulkUpsert,
	deleteByQuery,
	getTypesenseClient,
	physicalCollectionName,
	searchConfig,
} from "@repo/search";

/**
 * Typesense field definitions for personal search document chunks.
 * Tenant field (`tenant_id`) is added automatically by the collection creation
 * helper in `@repo/search`; it is not duplicated here.
 */
export const PERSONAL_CHUNK_FIELDS = [
	{ name: "index_id", type: "string", facet: true, index: true },
	{ name: "file_id", type: "string", facet: true, index: true },
	{ name: "chunk_id", type: "string", index: true },
	{ name: "content", type: "string", index: true },
	{ name: "filename", type: "string", facet: true, index: true },
	{ name: "file_type", type: "string", facet: true, index: true },
	{ name: "source_url", type: "string", optional: true },
	{ name: "uploaded_at", type: "int64", sort: true },
] as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the alias name for a personal chunk collection.
 * Pattern: `{prefix}_{orgId}_{slug}_chunks`
 */
function chunkAliasName(organizationId: string, slug: string): string {
	return `${aliasName(organizationId, slug)}_chunks`;
}

/**
 * Returns the physical collection name for a personal chunk collection version.
 * Pattern: `{prefix}_{orgId}_{slug}_v{version}_chunks`
 */
function chunkPhysicalName(organizationId: string, slug: string, version: number): string {
	return `${physicalCollectionName(organizationId, slug, version)}_chunks`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Ensures the Typesense collection + alias exist for a personal search index's
 * document chunks.
 *
 * Creates a physical collection with the `_chunks` naming convention and
 * upserts a corresponding alias so consumers can use a version-agnostic
 * reference.
 *
 * @param organizationId - The owning organization's ID (used as the tenant).
 * @param slug            - The personal search index slug.
 * @param version         - The schema version for the physical collection name.
 * @returns An object containing the resolved alias and physical collection
 *          names.
 */
export async function ensurePersonalSearchCollection(
	organizationId: string,
	slug: string,
	version: number,
): Promise<{ alias: string; physicalName: string }> {
	const client = getTypesenseClient();
	const alias = chunkAliasName(organizationId, slug);
	const physicalName = chunkPhysicalName(organizationId, slug, version);

	// Check if the physical collection already exists.
	try {
		await client.collections(physicalName).retrieve();
		logger.info("Personal chunk collection already exists — ensuring alias", {
			physicalName,
			alias,
		});
		await client.aliases().upsert(alias, { collection_name: physicalName });
		return { alias, physicalName };
	} catch {
		// Collection does not exist — create it below.
	}

	// Build schema: tenant field followed by the chunk-specific fields.
	const tenantField = {
		name: searchConfig.tenantField,
		type: "string" as const,
		facet: true,
		index: true,
	};
	const fields = [tenantField, ...PERSONAL_CHUNK_FIELDS.map((f) => ({ ...f }))];

	await client.collections().create({
		name: physicalName,
		fields,
		default_sorting_field: "uploaded_at",
		enable_nested_fields: true,
	});

	logger.info("Created personal chunk physical collection", { physicalName });

	// Upsert the alias so future lookups use the version-agnostic name.
	await client.aliases().upsert(alias, { collection_name: physicalName });
	logger.info("Upserted personal chunk alias", { alias, physicalName });

	return { alias, physicalName };
}

/**
 * Indexes document chunks into the personal search Typesense collection.
 *
 * Each entry in `input.chunks` becomes one Typesense document with
 * `chunk_id = "{fileId}_{index}"`.
 *
 * @param organizationId - The owning organization's ID (used as the tenant).
 * @param slug            - The personal search index slug.
 * @param version         - The schema version for the collection.
 * @param input           - File metadata and chunk text array.
 * @returns The result of the bulk upsert operation.
 */
export async function indexPersonalDocumentChunks(
	organizationId: string,
	slug: string,
	version: number,
	input: {
		fileId: string;
		filename: string;
		fileType: string;
		sourceUrl?: string;
		chunks: string[];
	},
) {
	const alias = chunkAliasName(organizationId, slug);
	const now = Math.floor(Date.now() / 1000);

	const documents = input.chunks.map((content, index) => ({
		index_id: slug,
		file_id: input.fileId,
		chunk_id: `${input.fileId}_${index}`,
		content,
		filename: input.filename,
		file_type: input.fileType,
		source_url: input.sourceUrl ?? null,
		uploaded_at: now,
	}));

	const result = await bulkUpsert({
		collection: alias,
		tenantId: organizationId,
		documents,
	});

	logger.info("Indexed personal document chunks", {
		fileId: input.fileId,
		filename: input.filename,
		chunkCount: documents.length,
		successCount: result.successCount,
		failureCount: result.failures.length,
	});

	return result;
}

/**
 * Deletes all Typesense documents for a specific file from the personal search
 * collection.
 *
 * @param organizationId - The owning organization's ID.
 * @param slug            - The personal search index slug.
 * @param version         - The schema version for the collection.
 * @param fileId          - The file ID whose chunks should be removed.
 * @returns The raw Typesense delete response (shape depends on the client
 *          version).
 */
export async function deletePersonalDocumentChunks(
	organizationId: string,
	slug: string,
	version: number,
	fileId: string,
) {
	const alias = chunkAliasName(organizationId, slug);
	const filterBy = `file_id:=${fileId}`;

	const result = await deleteByQuery(alias, filterBy);

	const deletedCount =
		result && typeof result === "object" && "num_deleted" in result
			? (result as { num_deleted: number }).num_deleted
			: 0;

	logger.info("Deleted personal document chunks", {
		fileId,
		collectionAlias: alias,
		deletedCount,
	});

	return result;
}
