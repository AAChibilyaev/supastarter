/**
 * V1 API main router.
 *
 * Mounts all sub-routers under the /v1/ base path.
 *
 * Routes:
 *   GET    /v1/projects                         — list/self project
 *   POST   /v1/projects                         — create project
 *   GET    /v1/projects/:id                     — get project
 *   POST   /v1/projects/:projectId/indexes      — create index
 *   GET    /v1/projects/:projectId/indexes      — list indexes
 *   GET    /v1/indexes/:indexId                 — get index
 *   PATCH  /v1/indexes/:indexId                 — update index (displayName, enabled)
 *   DELETE /v1/indexes/:indexId                 — delete index + Typesense cleanup
 *   GET    /v1/indexes/:indexId/stats           — index statistics
 *   GET    /v1/indexes/:indexId/documents                      — list / browse documents
 *   PUT    /v1/indexes/:indexId/documents/:documentId         — upsert doc
 *   POST   /v1/indexes/:indexId/documents:batch               — batch upsert
 *   POST   /v1/indexes/:indexId/documents:batchDelete         — batch delete by IDs
 *   GET    /v1/indexes/:indexId/documents/export              — export documents as JSONL/JSON
 *   POST   /v1/indexes/:indexId/documents/delete-by-query     — delete documents by filter expression
 *   DELETE /v1/indexes/:indexId/documents/:documentId         — delete doc
 *   POST   /v1/indexes/:indexId/search             — search index
 *   POST   /v1/multi-search                        — multi-search
 *   POST   /v1/indexes/:indexId/suggest            — query suggestions / autocomplete
 *   POST   /v1/projects/:projectId/keys             — create API key
 *   GET    /v1/projects/:projectId/keys             — list API keys
 *   DELETE /v1/keys/:keyId                          — revoke API key
 *   GET    /v1/projects/:projectId/analytics        — analytics
 *   GET    /v1/projects/:projectId/failed-queries   — failed queries analytics
 *   GET    /v1/projects/:projectId/usage            — usage data
 *   GET    /v1/indexes/:indexId/synonyms            — list synonyms
 *   POST   /v1/indexes/:indexId/synonyms            — create synonym
 *   PUT    /v1/indexes/:indexId/synonyms            — upsert synonyms
 *   DELETE /v1/indexes/:indexId/synonyms/:synonymId — delete synonym
 *   GET    /v1/indexes/:indexId/curations           — list curations
 *   POST   /v1/indexes/:indexId/curations           — create curation
 *   PUT    /v1/indexes/:indexId/curations           — upsert curations
 *   DELETE /v1/indexes/:indexId/curations/:curationId — delete curation
 *   GET    /v1/indexes/:indexId/sorting             — list sorting fields
 *   POST   /v1/indexes/:indexId/sorting             — add sorting field
 *   PUT    /v1/indexes/:indexId/sorting             — replace sorting fields
 *   DELETE /v1/indexes/:indexId/sorting/:fieldName   — remove sorting field
 *   GET    /v1/indexes/:indexId/facets              — list facets
 *   GET    /v1/openapi.json                         — OpenAPI spec
 */

import { Hono } from "hono";

import { analyticsApp } from "./analytics";
import { billingApp } from "./billing";
import { crawlerApp } from "./crawler";
import { documentsApp } from "./documents";
import { indexesApp } from "./indexes";
import { keysApp } from "./keys";
import { generateOpenApiSpec } from "./openapi";
import { projectsApp } from "./projects";
import { recommendationsApp } from "./recommendations";
import { reindexApp } from "./reindex";
import { searchApp } from "./search";
import { spellCheckApp } from "./spell-check";
import { suggestApp } from "./suggest";
import { syncJobsApp } from "./sync-jobs";
import { synonymsApp } from "./synonyms";

const v1Router = new Hono()
	.route("/", projectsApp)
	.route("/", indexesApp)
	.route("/", documentsApp)
	.route("/", searchApp)
	.route("/", spellCheckApp)
	.route("/", suggestApp)
	.route("/", keysApp)
	.route("/", analyticsApp)
	.route("/", synonymsApp)
	.route("/", billingApp)
	.route("/", recommendationsApp)
	.route("/", reindexApp)
	.route("/", crawlerApp)
	.route("/", syncJobsApp);

// OpenAPI spec (no auth required for API discovery)
v1Router.get("/openapi.json", (c) => c.json(generateOpenApiSpec()));

export { v1Router };
export type V1Router = typeof v1Router;
