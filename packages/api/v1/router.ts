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
 *   GET    /v1/indexes/:indexId/stats           — index statistics
 *   PUT    /v1/indexes/:indexId/documents/:documentId         — upsert doc
 *   POST   /v1/indexes/:indexId/documents:batch               — batch upsert
 *   DELETE /v1/indexes/:indexId/documents/:documentId         — delete doc
 *   POST   /v1/indexes/:indexId/search          — search index
 *   POST   /v1/multi-search                     — multi-search
 *   POST   /v1/projects/:projectId/keys         — create API key
 *   GET    /v1/projects/:projectId/keys         — list API keys
 *   DELETE /v1/keys/:keyId                      — revoke API key
 *   GET    /v1/projects/:projectId/analytics    — analytics
 *   GET    /v1/projects/:projectId/usage        — usage data
 *   GET    /v1/openapi.json                     — OpenAPI spec
 */

import { Hono } from "hono";

import { analyticsApp } from "./analytics";
import { documentsApp } from "./documents";
import { indexesApp } from "./indexes";
import { keysApp } from "./keys";
import { generateOpenApiSpec } from "./openapi";
import { projectsApp } from "./projects";
import { searchApp } from "./search";

const v1Router = new Hono()
	.route("/", projectsApp)
	.route("/", indexesApp)
	.route("/", documentsApp)
	.route("/", searchApp)
	.route("/", keysApp)
	.route("/", analyticsApp);

// OpenAPI spec (no auth required for API discovery)
v1Router.get("/openapi.json", (c) => c.json(generateOpenApiSpec()));

export { v1Router };
export type V1Router = typeof v1Router;
