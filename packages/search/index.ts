export { config as searchConfig } from "./config";
export {
	getTypesenseClient,
	getTypesenseClientForOrg,
	clearTypesenseClientCache,
} from "./lib/client";
export {
	AVAILABLE_REGIONS,
	DEFAULT_REGION,
	getOrganizationStorageRegion,
	isValidRegion,
} from "./lib/org-region";
export type { RegionInfo, StorageRegion } from "./lib/regions";
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
	computeDisjunctiveFacetCounts,
	removeFilterByClause,
	parseFacetBy,
	type FacetStrategy,
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
	checkAllRegionsHealth,
	checkRegionHealth,
	type HealthStatus,
	type IndexHealthResult,
	type RegionHealthResult,
} from "./lib/health";
export {
	migrateCollection,
	migrateOrganizationData,
	migrateAllOrganizations,
	type MigrateCollectionInput,
	type MigrationProgress,
	type MigrationResult,
} from "./lib/migration";
export { sendSlackAlert, type SlackAlertPayload } from "./lib/slack";
export {
	buildPopularitySortBy,
	buildPopularityThresholdSortBy,
	DEFAULT_CLICK_COUNTER_RULE,
	DEFAULT_CONVERSION_COUNTER_RULE,
	DEFAULT_COMBINED_COUNTER_RULE,
	type PopularityMetric,
	type SortDirection,
} from "./lib/popularity-ranking";
export {
	decaySort,
	hasDecaySort,
	textMatchDecay,
	evalSort,
	randomSort,
	bucketSort,
	missingValues,
	type DecayFunctionType,
	type DecaySortParams,
} from "./lib/sort";
export {
	getClientWithFailover,
	getAllRegionHealth,
	recordRegionHealth,
	recordRegionOnline,
	recordRegionOffline,
	clearHealthCache,
	type FailoverResult,
	type RegionHealthEntry,
} from "./lib/routing";
