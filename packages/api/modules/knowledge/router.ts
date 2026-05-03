import { ask } from "./procedures/ask";
import { createSource } from "./procedures/create-source";
import { createSpace } from "./procedures/create-space";
import { deleteFile } from "./procedures/delete-file";
import { graphragExplain } from "./procedures/graphrag-explain";
import { ingestFile } from "./procedures/ingest-file";
import { listFiles } from "./procedures/list-files";
import { listIngestionJobs } from "./procedures/list-ingestion-jobs";
import { listSources } from "./procedures/list-sources";
import { listSpaces } from "./procedures/list-spaces";
import { mySearchBilling } from "./procedures/my-search-billing";
import { usageMetrics } from "./procedures/usage-metrics";

export const knowledgeRouter = {
	createSpace,
	listSpaces,
	createSource,
	listSources,
	ingestFile,
	listFiles,
	deleteFile,
	ask,
	graphragExplain,
	listIngestionJobs,
	usageMetrics,
	mySearchBilling,
};
