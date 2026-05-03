import {
	listABTests,
	createABTest,
	updateABTestStatus,
	deleteABTest,
	getABTestResults,
} from "./procedures/ab-test";
import { aiAnswer } from "./procedures/ai-answer";
import { getAlertRules, updateAlertRules } from "./procedures/alert-rules";
import { analytics } from "./procedures/analytics";
import {
	listAnalyticsEvents,
	getAnalyticsEvent,
	getAnalyticsEventsByQuery,
} from "./procedures/analytics-events-retrieval";
import {
	listAnalyticsRules,
	createAnalyticsRule,
	deleteAnalyticsRule,
} from "./procedures/analytics-rules";
import { bulkDeleteDocuments } from "./procedures/bulk-delete-documents";
import { cloneIndex } from "./procedures/clone-index";
import {
	performClusterOperation,
	clusterMetrics,
	configureSlowRequestLogging,
	clearClusterCache,
	getApiStats,
} from "./procedures/cluster-ops";
import {
	createConversationModel,
	listConversationModels,
	getConversationModel,
	updateConversationModel,
	deleteConversationModel,
} from "./procedures/conversation-models";
import { conversationalSearch } from "./procedures/conversational-search";
import { listConversations, getConversation, deleteConversation } from "./procedures/conversations";
import { createApiKey } from "./procedures/create-api-key";
import { createConnectorToken } from "./procedures/create-connector-token";
import { createIndex } from "./procedures/create-index";
import { createScopedToken } from "./procedures/create-scoped-token";
import { ctrAnalytics } from "./procedures/ctr-analytics";
import { getCurations, updateCurations } from "./procedures/curations";
import { customEmbedding } from "./procedures/custom-embedding";
import { deleteDocumentsByFilter } from "./procedures/delete-documents-by-filter";
import { deleteIndex } from "./procedures/delete-index";
import { dynamicSearch } from "./procedures/dynamic-search";
import { exportIndexDocuments } from "./procedures/export-documents";
import { federatedSearch } from "./procedures/federated-search";
import { geoSearch } from "./procedures/geo-search";
import { getGlobalCurations, updateGlobalCurations } from "./procedures/global-curations";
import {
	getEffectiveGlobalSynonyms,
	getGlobalSynonyms,
	updateGlobalSynonyms,
} from "./procedures/global-synonyms";
import { groupedSearch } from "./procedures/grouped-search";
import { hybridSearch } from "./procedures/hybrid-search";
import { hypeIndex } from "./procedures/hype-index";
import { imageSearch } from "./procedures/image-search";
import { importDocuments } from "./procedures/import-documents";
import { importJobs } from "./procedures/import-jobs";
import { indexHealth } from "./procedures/index-health";
import { indexHealthHistory } from "./procedures/index-health-history";
import { listApiKeys } from "./procedures/list-api-keys";
import { listConnectorSyncJobs } from "./procedures/list-connector-sync-jobs";
import { listConnectorTokens } from "./procedures/list-connector-tokens";
import { listDocuments } from "./procedures/list-documents";
import { listIndexes } from "./procedures/list-indexes";
import { listModels, getModelConfig, updateModelConfig } from "./procedures/models";
import { naturalLanguageSearch } from "./procedures/natural-language-search";
import { onboardingStatus } from "./procedures/onboarding-status";
import { healthCheck } from "./procedures/operations";
import {
	createSnapshot,
	deletePreset,
	listAliases,
	listPresets,
	upsertAlias,
	upsertPreset,
} from "./procedures/operations";
import { getOverageStatus } from "./procedures/overage-status";
import { pipelineStatus } from "./procedures/pipelineStatus";
import { getQueryRules, updateQueryRules } from "./procedures/query-rules";
import { querySuggestions } from "./procedures/query-suggestions";
import { getRankingRules, updateRankingRules } from "./procedures/ranking-rules";
import { recentActivity } from "./procedures/recent-activity";
import { reindex } from "./procedures/reindex";
import { rerank } from "./procedures/rerank";
import { retryFailedBatches } from "./procedures/retry-failed-batches";
import { revokeApiKey } from "./procedures/revoke-api-key";
import { revokeConnectorToken } from "./procedures/revoke-connector-token";
import { getSchema, updateSchema } from "./procedures/schema";
import { semanticSearch } from "./procedures/semantic-search";
import { spellCheck } from "./procedures/spell-check";
import { getSpellConfig, updateSpellConfig } from "./procedures/spell-config";
import {
	deleteStemmingOverride,
	listStemmingOverrides,
	upsertStemmingOverride,
} from "./procedures/stemming";
import { deleteStopwords, listStopwords, upsertStopwords } from "./procedures/stopwords";
import { getSuggestConfig, updateSuggestConfig } from "./procedures/suggest-config";
import {
	exportIndexSynonyms,
	importIndexSynonyms,
	exportGlobalSynonyms,
	importGlobalSynonyms,
} from "./procedures/synonym-import-export";
import { getSynonyms, updateSynonyms } from "./procedures/synonyms";
import { topQueries } from "./procedures/top-queries";
import { truncateIndex } from "./procedures/truncate-index";
import { updateDocumentsByFilterProcedure } from "./procedures/update-documents-by-filter";
import { upsertDocument } from "./procedures/upsert-document";
import { usage } from "./procedures/usage";
import { usageSummary } from "./procedures/usage-summary";
import { vectorSearch } from "./procedures/vector-search";
import { voiceSearch } from "./procedures/voice-search";
import {
	createWebhook,
	deleteWebhook,
	listWebhooks,
	deleteWebhookReceiverConfig,
	getWebhookReceiverConfig,
	saveWebhookReceiverConfig,
	listWebhookDeliveries,
} from "./procedures/webhooks";
import { getWidgetConfig, saveWidgetConfig } from "./procedures/widget-config";

export const searchRouter = {
	listIndexes,
	createIndex,
	cloneIndex,
	deleteIndex,
	exportDocuments: exportIndexDocuments,
	truncateIndex,
	updateDocumentsByFilter: updateDocumentsByFilterProcedure,
	deleteDocumentsByFilter,
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
	saveWidgetConfig,
	analytics,
	ctrAnalytics,
	indexHealth,
	indexHealthHistory,
	pipelineStatus,
	listDocuments,
	bulkDeleteDocuments,
	onboardingStatus,
	retryFailedBatches,
	schema: {
		get: getSchema,
		update: updateSchema,
	},
	synonyms: {
		get: getSynonyms,
		update: updateSynonyms,
		export: exportIndexSynonyms,
		import: importIndexSynonyms,
	},
	globalSynonyms: {
		get: getGlobalSynonyms,
		update: updateGlobalSynonyms,
		effective: getEffectiveGlobalSynonyms,
		export: exportGlobalSynonyms,
		import: importGlobalSynonyms,
	},
	curations: {
		get: getCurations,
		update: updateCurations,
	},
	globalCurations: {
		get: getGlobalCurations,
		update: updateGlobalCurations,
	},
	listConnectorTokens,
	createConnectorToken,
	revokeConnectorToken,
	listConnectorSyncJobs,
	listShopifyStores: listConnectorSyncJobs,
	vectorSearch,
	hybridSearch,
	semanticSearch,
	geoSearch,
	federatedSearch,
	groupedSearch,
	querySuggestions,
	naturalLanguageSearch,
	spellCheck,
	spellConfig: {
		get: getSpellConfig,
		update: updateSpellConfig,
	},
	suggestConfig: {
		get: getSuggestConfig,
		update: updateSuggestConfig,
	},
	listModels,
	modelConfig: {
		get: getModelConfig,
		update: updateModelConfig,
	},
	presets: {
		list: listPresets,
		upsert: upsertPreset,
		delete: deletePreset,
	},
	aliases: {
		list: listAliases,
		upsert: upsertAlias,
	},
	snapshot: createSnapshot,
	health: healthCheck,
	conversationalSearch,
	conversationModels: {
		create: createConversationModel,
		list: listConversationModels,
		get: getConversationModel,
		update: updateConversationModel,
		delete: deleteConversationModel,
	},
	conversations: {
		list: listConversations,
		get: getConversation,
		delete: deleteConversation,
	},
	voiceSearch,
	imageSearch,
	stemming: {
		list: listStemmingOverrides,
		upsert: upsertStemmingOverride,
		delete: deleteStemmingOverride,
	},
	stopwords: {
		list: listStopwords,
		upsert: upsertStopwords,
		delete: deleteStopwords,
	},
	clusterOps: {
		perform: performClusterOperation,
		metrics: clusterMetrics,
		configureSlowRequestLogging,
		clearCache: clearClusterCache,
		apiStats: getApiStats,
	},
	analyticsRules: {
		list: listAnalyticsRules,
		create: createAnalyticsRule,
		delete: deleteAnalyticsRule,
	},
	analyticsEvents: {
		list: listAnalyticsEvents,
		get: getAnalyticsEvent,
		byQuery: getAnalyticsEventsByQuery,
	},
	rankingRules: {
		get: getRankingRules,
		update: updateRankingRules,
	},
	dynamicSearch,
	webhooks: {
		list: listWebhooks,
		create: createWebhook,
		delete: deleteWebhook,
		deliveries: listWebhookDeliveries,
	},
	webhookReceiverConfig: {
		get: getWebhookReceiverConfig,
		save: saveWebhookReceiverConfig,
		delete: deleteWebhookReceiverConfig,
	},
	alertRules: {
		get: getAlertRules,
		update: updateAlertRules,
	},
	abTest: {
		list: listABTests,
		create: createABTest,
		updateStatus: updateABTestStatus,
		delete: deleteABTest,
		results: getABTestResults,
	},
	queryRules: {
		get: getQueryRules,
		update: updateQueryRules,
	},
	aiAnswer,
	customEmbedding,
	hypeIndex,
	rerank,
};
