import { createApiKey } from "./procedures/create-api-key";
import { createIndex } from "./procedures/create-index";
import { createScopedToken } from "./procedures/create-scoped-token";
import { importDocuments } from "./procedures/import-documents";
import { listApiKeys } from "./procedures/list-api-keys";
import { listIndexes } from "./procedures/list-indexes";
import { reindex } from "./procedures/reindex";
import { revokeApiKey } from "./procedures/revoke-api-key";
import { usage } from "./procedures/usage";

export const searchRouter = {
	listIndexes,
	createIndex,
	importDocuments,
	listApiKeys,
	createApiKey,
	createScopedToken,
	revokeApiKey,
	reindex,
	usage,
};
