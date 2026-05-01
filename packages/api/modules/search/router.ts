import { analytics } from "./procedures/analytics";
import {
	listAnalyticsRules,
	createAnalyticsRule,
	deleteAnalyticsRule,
} from "./procedures/analytics-rules";
import { performClusterOperation, clusterMetrics } from "./procedures/cluster-ops";
import { conversationalSearch } from "./procedures/conversational-search";
import { createApiKey } from "./procedures/create-api-key";
import { createConnectorToken } from "./procedures/create-connector-token";
import { createIndex } from "./procedures/create-index";
import { createScopedToken } from "./procedures/create-scoped-token";
import { getCurations, updateCurations } from "./procedures/curations";
import { dynamicSearch } from "./procedures/dynamic-search";
import { federatedSearch } from "./procedures/federated-search";
import { geoSearch } from "./procedures/geo-search";
import { groupedSearch } from "./procedures/grouped-search";
import { hybridSearch } from "./procedures/hybrid-search";
import { imageSearch } from "./procedures/image-search";
import { importDocuments } from "./procedures/import-documents";
import { importJobs } from "./procedures/import-jobs";
import { listApiKeys } from "./procedures/list-api-keys";
import { listConnectorSyncJobs } from "./procedures/list-connector-sync-jobs";
import { listConnectorTokens } from "./procedures/list-connector-tokens";
import { listDocuments } from "./procedures/list-documents";
import { listIndexes } from "./procedures/list-indexes";
import { listModels, getModelConfig, updateModelConfig } from "./procedures/models";
import { onboardingStatus } from "./procedures/onboarding-status";
import {
	createSnapshot,
	healthCheck,
	listAliases,
	listPresets,
	upsertAlias,
	upsertPreset,
} from "./procedures/operations";
import { pipelineStatus } from "./procedures/pipelineStatus";
import { querySuggestions } from "./procedures/query-suggestions";
import { recentActivity } from "./procedures/recent-activity";
import { reindex } from "./procedures/reindex";
import { retryFailedBatches } from "./procedures/retry-failed-batches";
import { revokeApiKey } from "./procedures/revoke-api-key";
import { revokeConnectorToken } from "./procedures/revoke-connector-token";
import { getSchema, updateSchema } from "./procedures/schema";
import { semanticSearch } from "./procedures/semantic-search";
import { listStemmingOverrides, upsertStemmingOverride } from "./procedures/stemming";
import { listStopwords, upsertStopwords } from "./procedures/stopwords";
import { getSynonyms, updateSynonyms } from "./procedures/synonyms";
import { topQueries } from "./procedures/top-queries";
import { upsertDocument } from "./procedures/upsert-document";
import { usage } from "./procedures/usage";
import { usageSummary } from "./procedures/usage-summary";
import { vectorSearch } from "./procedures/vector-search";
import { voiceSearch } from "./procedures/voice-search";
import { getWidgetConfig } from "./procedures/widget-config";

export const searchRouter = {
	listIndexes,
	createIndex,
	importDocuments,
	importJobs,
	upsertDocument,
	listApiKeys,
	createApiKey,
	createScopedToken,
	revokeApiKey,
	reindex,
	usage,
	usageSummary,
	topQueries,
	recentActivity,
	widgetConfig: getWidgetConfig,
	analytics,
	pipelineStatus,
	listDocuments,
	onboardingStatus,
	retryFailedBatches,
	schema: {
		get: getSchema,
		update: updateSchema,
	},
	synonyms: {
		get: getSynonyms,
		update: updateSynonyms,
	},
	curations: {
		get: getCurations,
		update: updateCurations,
	},
	listConnectorTokens,
	createConnectorToken,
	revokeConnectorToken,
	listConnectorSyncJobs,
	vectorSearch,
	hybridSearch,
	semanticSearch,
	geoSearch,
	federatedSearch,
	groupedSearch,
	querySuggestions,
	listModels,
	modelConfig: {
		get: getModelConfig,
		update: updateModelConfig,
	},
	presets: {
		list: listPresets,
		upsert: upsertPreset,
	},
	aliases: {
		list: listAliases,
		upsert: upsertAlias,
	},
	snapshot: createSnapshot,
	health: healthCheck,
	conversationalSearch,
	voiceSearch,
	imageSearch,
	stemming: {
		list: listStemmingOverrides,
		upsert: upsertStemmingOverride,
	},
	stopwords: {
		list: listStopwords,
		upsert: upsertStopwords,
	},
	clusterOps: {
		perform: performClusterOperation,
		metrics: clusterMetrics,
	},
	analyticsRules: {
		list: listAnalyticsRules,
		create: createAnalyticsRule,
		delete: deleteAnalyticsRule,
	},
	dynamicSearch,
};
