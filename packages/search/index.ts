export { config as searchConfig } from "./config";
export { getTypesenseClient } from "./lib/client";
export {
	aliasName,
	createPhysicalCollection,
	deleteSearchIndexCollections,
	dropCollection,
	dropOldVersions,
	ensureAlias,
	physicalCollectionName,
	swapAliasToVersion,
	type CollectionFieldInput,
	type CreatePhysicalCollectionInput,
} from "./lib/collections";
export {
	generateSearchApiKey,
	hashSearchApiKey,
	isValidSearchApiKeyShape,
	SEARCH_API_KEY_SCOPES,
	type GeneratedSearchKey,
	type SearchApiKeyScope,
} from "./lib/keys";
export {
	bulkUpsert,
	deleteByQuery,
	type BulkUpsertInput,
	type BulkUpsertResult,
} from "./lib/ingest";
export {
	multiSearchDocuments,
	searchDocuments,
	type MultiSearchEntry,
	type SearchDocumentsInput,
	type SearchDocumentsResult,
} from "./lib/search";
export { flushSearchIngestBuffer } from "./lib/buffer";
export {
	flushAllSearchIngestBuffers,
	type FlushAllOptions,
	type FlushAllResult,
} from "./lib/maintenance";
export { verifySearchApiKey, type VerifiedSearchKey } from "./lib/verify";
export { reindexCollection, type ReindexInput, type ReindexResult } from "./lib/reindex";
export {
	EMBEDDING_MODELS,
	formatVectorQuery,
	generateEmbedding,
	generateEmbeddings,
	getOpenAIClient,
	type EmbeddingModelName,
	type EmbeddingResult,
} from "./lib/embeddings";
export {
	syncCurationsToTypesense,
	syncSynonymsToTypesense,
	type CurationRule,
	type SynonymPair,
} from "./lib/synonyms-sync";
export {
	checkAllIndexesHealth,
	checkIndexHealth,
	type HealthStatus,
	type IndexHealthResult,
} from "./lib/health";
export { sendSlackAlert, type SlackAlertPayload } from "./lib/slack";
