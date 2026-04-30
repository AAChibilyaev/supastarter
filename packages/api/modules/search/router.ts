import { analytics } from "./procedures/analytics";
import { createApiKey } from "./procedures/create-api-key";
import { createConnectorToken } from "./procedures/create-connector-token";
import { createIndex } from "./procedures/create-index";
import { createScopedToken } from "./procedures/create-scoped-token";
import { getCurations, updateCurations } from "./procedures/curations";
import { importDocuments } from "./procedures/import-documents";
import { importJobs } from "./procedures/import-jobs";
import { listApiKeys } from "./procedures/list-api-keys";
import { listConnectorSyncJobs } from "./procedures/list-connector-sync-jobs";
import { listConnectorTokens } from "./procedures/list-connector-tokens";
import { listDocuments } from "./procedures/list-documents";
import { listIndexes } from "./procedures/list-indexes";
import { onboardingStatus } from "./procedures/onboarding-status";
import { pipelineStatus } from "./procedures/pipelineStatus";
import { recentActivity } from "./procedures/recent-activity";
import { reindex } from "./procedures/reindex";
import { retryFailedBatches } from "./procedures/retry-failed-batches";
import { revokeApiKey } from "./procedures/revoke-api-key";
import { revokeConnectorToken } from "./procedures/revoke-connector-token";
import { getSchema, updateSchema } from "./procedures/schema";
import { getSynonyms, updateSynonyms } from "./procedures/synonyms";
import { topQueries } from "./procedures/top-queries";
import { upsertDocument } from "./procedures/upsert-document";
import { usage } from "./procedures/usage";
import { usageSummary } from "./procedures/usage-summary";
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
};
