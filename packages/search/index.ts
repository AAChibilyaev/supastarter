export { config as searchConfig } from "./config";
export { getTypesenseClient } from "./lib/client";
export {
	aliasName,
	cloneCollection,
	createPhysicalCollection,
	deleteSearchIndexCollections,
	dropCollection,
	dropOldVersions,
	ensureAlias,
	physicalCollectionName,
	swapAliasToVersion,
	type CollectionFieldInput,
	type CreatePhysicalCollectionInput,
	type FieldType,
	type HnswParams,
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
	truncateCollection,
	updateDocumentsByFilter,
	type BulkUpsertInput,
	type BulkUpsertResult,
} from "./lib/ingest";
export {
	multiSearchDocuments,
	searchDocuments,
	type GeoBoundingBoxFilter,
	type GeoMultiLocationFilter,
	type GeoPolygonFilter,
	type MultiSearchEntry,
	type SearchDocumentsInput,
	type SearchDocumentsResult,
} from "./lib/search";
export {
	checkIndexHealth as checkOrgIndexHealth,
	checkIngestLag,
	checkErrorRate,
	detectAnomalies,
	getDocumentDrift,
	autoPauseIndexing,
	shouldSendAlert,
	markAlertSent,
	buildAnomalyAlertSlackMessage,
	type DriftResult,
	type LagResult,
	type ErrorRateResult,
	type IndexHealthCheck,
	type AnomalyEvent,
} from "./lib/index-health";
export { joinRef, joinFilter, joinSort } from "./lib/join-refs";
export { processQuery, type ProcessedQuery } from "./lib/query-processor";
export { flushSearchIngestBuffer } from "./lib/buffer";
export {
	flushAllSearchIngestBuffers,
	type FlushAllOptions,
	type FlushAllResult,
} from "./lib/maintenance";
export { verifySearchApiKey, type VerifiedSearchKey } from "./lib/verify";
export { reindexCollection, type ReindexInput, type ReindexResult } from "./lib/reindex";
export { deltaSync, type DeltaSyncInput, type DeltaSyncResult } from "./lib/delta-sync";
export {
	exportDocuments,
	exportDocumentsRaw,
	type ExportDocumentsInput,
	type ExportDocumentsResult,
	type ExportDocumentsStreamInput,
} from "./lib/export";
export {
	EMBEDDING_MODELS,
	formatVectorQuery,
	generateEmbedding,
	generateEmbeddings,
	getOpenAIClient,
	getAzureOpenAIClient,
	AUTO_EMBED_FIELDS,
	autoEmbedDocument,
	autoEmbedDocuments,
	buildEmbeddingText,
	detectEmbeddingField,
	type AutoEmbedConfig,
	type EmbeddingModelName,
	type EmbeddingResult,
} from "./lib/embeddings";
export {
	sendAnalyticsEvent,
	sendAnalyticsEvents,
	widgetEventToAnalyticsEvent,
	isForwardableEvent,
	type AnalyticsEvent,
} from "./lib/analytics-events";
export {
	getCurationSetsForCollection,
	deleteCurationSetById,
	getSynonymSetsForCollection,
	deleteSynonymSetById,
	syncCurationsToTypesense,
	syncSynonymsToTypesense,
	typesenseFetch,
	type CurationRule,
	type CurationSetRecord,
	type SynonymPair,
	type SynonymSetRecord,
} from "./lib/synonyms-sync";
export {
	checkAllIndexesHealth,
	checkIndexHealth,
	type HealthStatus,
	type IndexHealthResult,
} from "./lib/health";
export { sendSlackAlert, type SlackAlertPayload } from "./lib/slack";
