import { ask } from "./procedures/ask";
import { askStream } from "./procedures/ask-stream";
import { createSource } from "./procedures/create-source";
import { createSpace } from "./procedures/create-space";
import { deleteFile } from "./procedures/delete-file";
import { deleteSource } from "./procedures/delete-source";
import { deleteSpace } from "./procedures/delete-space";
import { graphragExplain } from "./procedures/graphrag-explain";
import { ingestFile } from "./procedures/ingest-file";
import { ingestUrl } from "./procedures/ingest-url";
import { listFiles } from "./procedures/list-files";
import { listIngestionJobs } from "./procedures/list-ingestion-jobs";
import { listSources } from "./procedures/list-sources";
import { listSpaces } from "./procedures/list-spaces";
import { mySearchBilling } from "./procedures/my-search-billing";
import { getRagConfig, updateRagConfig } from "./procedures/space-rag-config";
import { usageMetrics } from "./procedures/usage-metrics";

export const knowledgeRouter = {
	createSpace,
	listSpaces,
	createSource,
	listSources,
	deleteSource,
	deleteSpace,
	ingestFile,
	ingestUrl,
	listFiles,
	deleteFile,
	ask,
	askStream,
	graphragExplain,
	listIngestionJobs,
	usageMetrics,
	mySearchBilling,
	getRagConfig,
	updateRagConfig,
};
