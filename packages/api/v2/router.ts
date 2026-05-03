/**
 * V2 API main router.
 *
 * Mounts all sub-routers under the /v2/ base path and provides the
 * OpenAPI specification endpoint.
 *
 * Routes:
 *   GET    /v2/openapi.json                        — OpenAPI 3.1 spec
 *   GET    /v2/projects                            — list/self project
 *   POST   /v2/projects                            — create project
 *   GET    /v2/projects/:projectId                 — get project
 *   GET    /v2/projects/:projectId/indexes         — list indexes
 *   POST   /v2/projects/:projectId/indexes         — create index
 *   GET    /v2/indexes/:indexId                    — get index
 *   PATCH  /v2/indexes/:indexId                    — update index
 *   DELETE /v2/indexes/:indexId                    — delete index
 *   GET    /v2/indexes/:indexId/stats              — index statistics
 *   POST   /v2/indexes/:indexId/search             — search index
 *   POST   /v2/multi-search                        — multi-search
 */
import { Hono } from "hono";

import { indexesApp } from "./indexes";
import { generateV2OpenApiSpec } from "./openapi";
import { projectsApp } from "./projects";
import { searchApp } from "./search";

const v2Router = new Hono()
	.route("/", projectsApp)
	.route("/", indexesApp)
	.route("/", searchApp);

// OpenAPI spec (no auth required for API discovery)
v2Router.get("/openapi.json", (c) => c.json(generateV2OpenApiSpec()));

export { v2Router };
export type V2Router = typeof v2Router;
