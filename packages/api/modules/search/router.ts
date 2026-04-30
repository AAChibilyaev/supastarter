import { analytics } from "./procedures/analytics";
import { createApiKey } from "./procedures/create-api-key";
import { createIndex } from "./procedures/create-index";
import { createScopedToken } from "./procedures/create-scoped-token";
import { getCurations, updateCurations } from "./procedures/curations";
import { importDocuments } from "./procedures/import-documents";
import { importJobs } from "./procedures/import-jobs";
import { listApiKeys } from "./procedures/list-api-keys";
import { listIndexes } from "./procedures/list-indexes";
import { reindex } from "./procedures/reindex";
import { revokeApiKey } from "./procedures/revoke-api-key";
import { getSynonyms, updateSynonyms } from "./procedures/synonyms";
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
	widgetConfig: getWidgetConfig,
	analytics,
	synonyms: {
		get: getSynonyms,
		update: updateSynonyms,
	},
	curations: {
		get: getCurations,
		update: updateCurations,
	},
};
