/**
 * OpenAPI specification for the v1 public REST API.
 *
 * Served at GET /api/v1/openapi.json.
 */

export function generateOpenApiSpec() {
	return {
		openapi: "3.1.0",
		info: {
			title: "AACsearch API v1",
			version: "1.0.0",
			description:
				"Versioned public REST API for AACsearch. Manages projects (organizations), " +
				"search indexes, documents, API keys, and provides search/analytics endpoints.\n\n" +
				"All endpoints require Bearer token authentication. API keys are created " +
				"via the dashboard or the v1 API itself.",
		},
		servers: [
			{
				url: "/api/v1",
				description: "v1 API base path",
			},
		],
		paths: {
			// ─── Projects ───────────────────────────────────────────────
			"/projects": {
				get: {
					summary: "Get current project",
					description:
						"Returns the project (organization) associated with the authenticated API key.",
					tags: ["Projects"],
					security: [{ BearerAuth: [] }],
					responses: {
						"200": {
							description: "Project details",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											id: { type: "string" },
											name: { type: "string" },
											slug: { type: "string" },
											logo: { type: "string", nullable: true },
											membersCount: { type: "integer" },
											createdAt: { type: "string", format: "date-time" },
											updatedAt: { type: "string", format: "date-time" },
										},
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
				post: {
					summary: "Create project",
					description: "Creates a new project (organization). Requires admin scope key.",
					tags: ["Projects"],
					security: [{ BearerAuth: [] }],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["name", "slug"],
									properties: {
										name: { type: "string", maxLength: 120 },
										slug: {
											type: "string",
											pattern: "^[a-z0-9][a-z0-9-]*$",
											maxLength: 64,
										},
										logo: { type: "string", format: "uri", nullable: true },
									},
								},
							},
						},
					},
					responses: {
						"201": { description: "Project created" },
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"409": { description: "Project slug already exists" },
					},
				},
			},
			"/projects/{id}": {
				get: {
					summary: "Get project by ID",
					tags: ["Projects"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{ name: "id", in: "path", required: true, schema: { type: "string" } },
					],
					responses: {
						"200": { description: "Project details" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
			},

			// ─── Indexes ────────────────────────────────────────────────
			"/projects/{projectId}/indexes": {
				get: {
					summary: "List search indexes",
					tags: ["Indexes"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "projectId",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
					],
					responses: {
						"200": {
							description: "List of indexes",
							content: {
								"application/json": {
									schema: {
										type: "array",
										items: { $ref: "#/components/schemas/SearchIndex" },
									},
								},
							},
						},
					},
				},
				post: {
					summary: "Create search index",
					tags: ["Indexes"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "projectId",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["slug", "displayName", "fields"],
									properties: {
										slug: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$" },
										displayName: { type: "string", maxLength: 120 },
										fields: {
											type: "array",
											items: { $ref: "#/components/schemas/SearchField" },
										},
										defaultSortingField: { type: "string" },
									},
								},
							},
						},
					},
					responses: {
						"201": { description: "Index created" },
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"409": { description: "Index slug already exists" },
					},
				},
			},
			"/indexes/{indexId}": {
				get: {
					summary: "Get search index by ID",
					tags: ["Indexes"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{ name: "indexId", in: "path", required: true, schema: { type: "string" } },
					],
					responses: {
						"200": {
							description: "Index details",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/SearchIndexFull" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
				patch: {
					summary: "Update search index",
					description:
						"Updates mutable index fields (displayName, enabled). At least one field must be provided.",
					tags: ["Indexes"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{ name: "indexId", in: "path", required: true, schema: { type: "string" } },
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									minProperties: 1,
									properties: {
										displayName: { type: "string", maxLength: 120 },
										enabled: { type: "boolean" },
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated index",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/SearchIndexFull" },
								},
							},
						},
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
				delete: {
					summary: "Delete search index",
					description:
						"Deletes the index record, its Typesense alias, and all versioned collections. " +
						"This is irreversible — all indexed documents will be lost.",
					tags: ["Indexes"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{ name: "indexId", in: "path", required: true, schema: { type: "string" } },
					],
					responses: {
						"200": {
							description: "Index deleted",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											deleted: { type: "boolean", enum: [true] },
											id: { type: "string" },
											slug: { type: "string" },
										},
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
						"502": { description: "Typesense or database error during deletion" },
					},
				},
			},
			"/indexes/{indexId}/stats": {
				get: {
					summary: "Get index statistics",
					description:
						"Returns live document count from Typesense, 30-day usage aggregates, " +
						"ingest queue state, and active API key count for the specified index.",
					tags: ["Indexes"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{ name: "indexId", in: "path", required: true, schema: { type: "string" } },
					],
					responses: {
						"200": {
							description: "Index statistics",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/SearchIndexStats" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
			},

			// ─── Documents ──────────────────────────────────────────────
			"/indexes/{indexId}/documents": {
				get: {
					summary: "List documents",
					description:
						"Returns paginated documents from the index. Pass q=* (default) to browse " +
						"all documents, or a search query to filter results. Requires search scope.",
					tags: ["Documents"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
						{
							name: "q",
							in: "query",
							required: false,
							schema: { type: "string", default: "*" },
							description: "Search query. Use * to return all documents.",
						},
						{
							name: "page",
							in: "query",
							required: false,
							schema: { type: "integer", minimum: 1, default: 1 },
						},
						{
							name: "perPage",
							in: "query",
							required: false,
							schema: { type: "integer", minimum: 1, maximum: 250, default: 20 },
						},
						{
							name: "filterBy",
							in: "query",
							required: false,
							schema: { type: "string" },
							description: "Typesense filter expression (e.g. 'price:>100').",
						},
					],
					responses: {
						"200": {
							description: "Paginated document list",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											hits: {
												type: "array",
												description:
													"Matched documents (Typesense hit objects)",
											},
											found: {
												type: "integer",
												description: "Total documents matching the query",
											},
											page: { type: "integer" },
											perPage: { type: "integer" },
										},
									},
								},
							},
						},
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
						"502": { description: "Typesense query failed" },
					},
				},
			},
			"/indexes/{indexId}/documents/{documentId}": {
				put: {
					summary: "Upsert a single document",
					tags: ["Documents"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{ name: "indexId", in: "path", required: true, schema: { type: "string" } },
						{
							name: "documentId",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									description:
										"Document fields. The id from the path is merged into the body.",
									additionalProperties: true,
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Document enqueued for indexing",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											id: { type: "string" },
											queued: { type: "boolean" },
										},
									},
								},
							},
						},
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
				delete: {
					summary: "Delete a document",
					tags: ["Documents"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{ name: "indexId", in: "path", required: true, schema: { type: "string" } },
						{
							name: "documentId",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
					],
					responses: {
						"200": {
							description: "Document enqueued for deletion",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											id: { type: "string" },
											deleted: { type: "boolean" },
										},
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
			},
			"/indexes/{indexId}/documents:batch": {
				post: {
					summary: "Batch upsert documents",
					tags: ["Documents"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{ name: "indexId", in: "path", required: true, schema: { type: "string" } },
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["documents"],
									properties: {
										documents: {
											type: "array",
											minItems: 1,
											maxItems: 5000,
											items: {
												type: "object",
												additionalProperties: true,
											},
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Documents enqueued for indexing",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											queued: { type: "integer" },
											accepted: { type: "integer" },
										},
									},
								},
							},
						},
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
					},
				},
			},
			"/indexes/{indexId}/documents:batchDelete": {
				post: {
					summary: "Batch delete documents by IDs",
					description:
						"Enqueues up to 5 000 documents for deletion by their IDs. " +
						"Documents are removed asynchronously via the ingest worker.",
					tags: ["Documents"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{ name: "indexId", in: "path", required: true, schema: { type: "string" } },
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["ids"],
									properties: {
										ids: {
											type: "array",
											minItems: 1,
											maxItems: 5000,
											items: { type: "string", minLength: 1 },
											description: "Document IDs to delete",
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Deletions enqueued",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											queued: {
												type: "integer",
												description:
													"Number of rows inserted into the ingest queue",
											},
											accepted: {
												type: "integer",
												description:
													"Number of IDs received in the request",
											},
										},
									},
								},
							},
						},
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
						"502": { description: "Failed to enqueue deletions" },
					},
				},
			},

			// ─── Search ─────────────────────────────────────────────────
			"/indexes/{indexId}/search": {
				post: {
					summary: "Search a single index",
					tags: ["Search"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{ name: "indexId", in: "path", required: true, schema: { type: "string" } },
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										q: { type: "string", default: "*" },
										queryBy: { type: "string" },
										filterBy: { type: "string" },
										facetBy: { type: "string" },
										sortBy: { type: "string" },
										perPage: { type: "integer", minimum: 1, maximum: 100 },
										page: { type: "integer", minimum: 1, maximum: 1000 },
										highlightFields: { type: "string" },
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Search results",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											hits: { type: "array" },
											found: { type: "integer" },
											page: { type: "integer" },
											perPage: { type: "integer" },
											facetCounts: { type: "object" },
											searchTimeMs: { type: "integer" },
										},
									},
								},
							},
						},
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"502": { description: "Search failed" },
					},
				},
			},
			"/multi-search": {
				post: {
					summary: "Multi-search across an index",
					tags: ["Search"],
					security: [{ BearerAuth: [] }],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["searches"],
									properties: {
										searches: {
											type: "array",
											minItems: 1,
											maxItems: 20,
											items: {
												type: "object",
												properties: {
													q: { type: "string", default: "*" },
													queryBy: { type: "string" },
													filterBy: { type: "string" },
													facetBy: { type: "string" },
													sortBy: { type: "string" },
													perPage: {
														type: "integer",
														minimum: 1,
														maximum: 100,
													},
													page: {
														type: "integer",
														minimum: 1,
														maximum: 1000,
													},
													highlightFields: { type: "string" },
												},
											},
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Multi-search results",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											results: {
												type: "array",
												items: {
													type: "object",
													properties: {
														hits: { type: "array" },
														found: { type: "integer" },
														page: { type: "integer" },
														perPage: { type: "integer" },
														facetCounts: { type: "object" },
														searchTimeMs: { type: "integer" },
													},
												},
											},
										},
									},
								},
							},
						},
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"502": { description: "Search failed" },
					},
				},
			},

			// ─── API Keys ───────────────────────────────────────────────
			"/projects/{projectId}/keys": {
				get: {
					summary: "List API keys in a project",
					tags: ["API Keys"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "projectId",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
					],
					responses: {
						"200": {
							description: "List of API keys",
							content: {
								"application/json": {
									schema: {
										type: "array",
										items: { $ref: "#/components/schemas/ApiKey" },
									},
								},
							},
						},
					},
				},
				post: {
					summary: "Create API key",
					tags: ["API Keys"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "projectId",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["indexSlug", "name", "scopes"],
									properties: {
										indexSlug: { type: "string" },
										name: { type: "string", maxLength: 120 },
										scopes: {
											type: "array",
											items: {
												type: "string",
												enum: ["search", "ingest", "admin"],
											},
										},
										allowedOrigins: {
											type: "array",
											items: { type: "string" },
											maxItems: 20,
										},
										rateLimitPerMinute: {
											type: "integer",
											minimum: 1,
											maximum: 60000,
										},
										expiresAt: { type: "string", format: "date-time" },
									},
								},
							},
						},
					},
					responses: {
						"201": {
							description: "API key created (rawKey is returned once)",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											id: { type: "string" },
											name: { type: "string" },
											prefix: { type: "string" },
											scopes: {
												type: "array",
												items: { type: "string" },
											},
											allowedOrigins: {
												type: "array",
												items: { type: "string" },
											},
											rateLimitPerMinute: { type: "integer" },
											expiresAt: { type: "string", nullable: true },
											createdAt: { type: "string", format: "date-time" },
											rawKey: {
												type: "string",
												description:
													"The full API key. Only returned once.",
											},
										},
									},
								},
							},
						},
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { description: "Index not found" },
					},
				},
			},
			"/keys/{keyId}": {
				delete: {
					summary: "Revoke API key",
					tags: ["API Keys"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{ name: "keyId", in: "path", required: true, schema: { type: "string" } },
					],
					responses: {
						"200": {
							description: "Key revoked",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											id: { type: "string" },
											revoked: { type: "boolean" },
										},
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
			},

			// ─── Synonyms ──────────────────────────────────────────────
			"/indexes/{indexId}/synonyms": {
				get: {
					summary: "List index synonyms",
					description: "Returns all synonym groups for the index.",
					tags: ["Synonyms"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
					],
					responses: {
						"200": {
							description: "Synonym list",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											synonyms: {
												type: "array",
												items: { $ref: "#/components/schemas/Synonym" },
											},
										},
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
				post: {
					summary: "Create a single synonym",
					description: "Creates a new synonym group in the index.",
					tags: ["Synonyms"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["root", "synonyms"],
									properties: {
										root: { type: "string", maxLength: 256 },
										synonyms: {
											type: "array",
											minItems: 1,
											items: { type: "string", maxLength: 256 },
											description: "Synonym variants for this root",
										},
									},
								},
							},
						},
					},
					responses: {
						"201": { description: "Synonym created" },
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
						"502": { description: "Failed to create synonym" },
					},
				},
				put: {
					summary: "Upsert synonyms (bulk replace)",
					description:
						"Replaces all synonym groups for the index in one operation. Missing groups are deleted.",
					tags: ["Synonyms"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["synonyms"],
									properties: {
										synonyms: {
											type: "array",
											items: { $ref: "#/components/schemas/SynonymInput" },
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Synonyms synced",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											synced: { type: "integer" },
										},
									},
								},
							},
						},
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
			},

			"/indexes/{indexId}/synonyms/{synonymId}": {
				delete: {
					summary: "Delete a synonym",
					description: "Deletes a single synonym group by its Typesense ID.",
					tags: ["Synonyms"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
						{
							name: "synonymId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Synonym ID (e.g. syn_my_root)",
						},
					],
					responses: {
						"200": {
							description: "Synonym deleted",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											id: { type: "string" },
											deleted: { type: "boolean", enum: [true] },
										},
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
						"502": { description: "Failed to delete synonym" },
					},
				},
			},

			// ─── Curations ─────────────────────────────────────────────
			"/indexes/{indexId}/curations": {
				get: {
					summary: "List index curations (overrides)",
					description:
						"Returns all curation/override rules for the index (pinned/hidden documents per query).",
					tags: ["Curations"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
					],
					responses: {
						"200": {
							description: "Curation list",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											overrides: {
												type: "array",
												items: { $ref: "#/components/schemas/Curation" },
											},
										},
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
				post: {
					summary: "Create a single curation",
					description: "Creates a new curation/override rule for a specific query.",
					tags: ["Curations"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/CurationInput" },
							},
						},
					},
					responses: {
						"201": { description: "Curation created" },
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
						"502": { description: "Failed to create curation" },
					},
				},
				put: {
					summary: "Upsert curations (bulk replace)",
					description:
						"Replaces all curation rules for the index. Missing rules are deleted.",
					tags: ["Curations"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["curations"],
									properties: {
										curations: {
											type: "array",
											items: { $ref: "#/components/schemas/CurationInput" },
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Curations synced",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											synced: { type: "integer" },
										},
									},
								},
							},
						},
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
			},

			"/indexes/{indexId}/curations/{curationId}": {
				delete: {
					summary: "Delete a curation",
					description: "Deletes a single curation/override rule by its Typesense ID.",
					tags: ["Curations"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
						{
							name: "curationId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Curation ID (e.g. cur_my_query)",
						},
					],
					responses: {
						"200": {
							description: "Curation deleted",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											id: { type: "string" },
											deleted: { type: "boolean", enum: [true] },
										},
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
						"502": { description: "Failed to delete curation" },
					},
				},
			},

			// ─── Sorting ────────────────────────────────────────────────
			"/indexes/{indexId}/sorting": {
				get: {
					summary: "List sorting fields",
					description: "Returns all fields in the index that have sorting enabled.",
					tags: ["Sorting"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
					],
					responses: {
						"200": {
							description: "Sorting fields",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											fields: {
												type: "array",
												items: {
													type: "object",
													properties: {
														name: { type: "string" },
														type: { type: "string" },
													},
												},
											},
										},
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
				post: {
					summary: "Add a sorting field",
					description: "Enables sorting on an existing field in the index schema.",
					tags: ["Sorting"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["name"],
									properties: {
										name: { type: "string", maxLength: 64 },
									},
								},
							},
						},
					},
					responses: {
						"201": { description: "Sorting field added" },
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
						"502": { description: "Failed to add sorting field" },
					},
				},
				put: {
					summary: "Replace all sorting fields",
					description:
						"Replaces all sorting fields with the specified list. Any existing sorting fields not in the list will have sorting disabled.",
					tags: ["Sorting"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["fields"],
									properties: {
										fields: {
											type: "array",
											minItems: 1,
											items: {
												type: "object",
												properties: {
													name: { type: "string", maxLength: 64 },
												},
												required: ["name"],
											},
										},
									},
								},
							},
						},
					},
					responses: {
						"200": { description: "Sorting fields replaced" },
						"400": { $ref: "#/components/responses/BadRequest" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
						"502": { description: "Failed to replace sorting fields" },
					},
				},
			},
			"/indexes/{indexId}/sorting/{fieldName}": {
				delete: {
					summary: "Remove a sorting field",
					description: "Disables sorting on the specified field.",
					tags: ["Sorting"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
						{
							name: "fieldName",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Field name to remove sorting from",
						},
					],
					responses: {
						"200": {
							description: "Sorting removed",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											name: { type: "string" },
											sort: { type: "boolean", enum: [false] },
											removed: { type: "boolean", enum: [true] },
										},
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
						"502": { description: "Failed to remove sorting field" },
					},
				},
			},

			// ─── Facets ─────────────────────────────────────────────────
			"/indexes/{indexId}/facets": {
				get: {
					summary: "List facet fields",
					description:
						"Returns all fields in the index that have faceting enabled, with their type and sorting status.",
					tags: ["Facets"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "indexId",
							in: "path",
							required: true,
							schema: { type: "string" },
							description: "Search index ID",
						},
					],
					responses: {
						"200": {
							description: "Facet fields",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											fields: {
												type: "array",
												items: {
													type: "object",
													properties: {
														name: { type: "string" },
														type: { type: "string" },
														sort: { type: "boolean" },
													},
												},
											},
										},
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
						"404": { $ref: "#/components/responses/NotFound" },
					},
				},
			},

			// ─── Analytics ──────────────────────────────────────────────
			"/projects/{projectId}/analytics": {
				get: {
					summary: "Get aggregated analytics",
					tags: ["Analytics"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "projectId",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
						{
							name: "period",
							in: "query",
							required: false,
							schema: { type: "string", enum: ["last7", "last30"], default: "last7" },
						},
					],
					responses: {
						"200": {
							description: "Analytics data",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											totalSearches: { type: "integer" },
											totalSessions: { type: "integer" },
											topQueries: {
												type: "array",
												items: {
													type: "object",
													properties: {
														query: { type: "string" },
														count: { type: "integer" },
													},
												},
											},
											zeroResultQueries: {
												type: "array",
												items: {
													type: "object",
													properties: {
														query: { type: "string" },
														count: { type: "integer" },
													},
												},
											},
											topClickedProducts: {
												type: "array",
												items: {
													type: "object",
													properties: {
														productId: { type: "string" },
														title: { type: "string" },
														clicks: { type: "integer" },
													},
												},
											},
											ctr: { type: "number" },
											searchesOverTime: {
												type: "array",
												items: {
													type: "object",
													properties: {
														date: { type: "string" },
														count: { type: "integer" },
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
			"/projects/{projectId}/usage": {
				get: {
					summary: "Get raw usage data",
					tags: ["Analytics"],
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: "projectId",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
						{
							name: "windowDays",
							in: "query",
							required: false,
							schema: { type: "integer", minimum: 1, maximum: 365, default: 30 },
						},
					],
					responses: {
						"200": {
							description: "Usage data",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											since: { type: "string", format: "date-time" },
											rows: {
												type: "array",
												items: {
													type: "object",
													properties: {
														indexId: { type: "string" },
														type: { type: "string" },
														total: { type: "integer" },
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},

		// ─── Components ──────────────────────────────────────────────
		components: {
			securitySchemes: {
				BearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "API key",
					description:
						"API key generated via the dashboard or the v1 API. " +
						"Supported prefixes: aa_admin_*, aa_write_*, aa_search_*, aa_scoped_*.",
				},
			},
			schemas: {
				SearchIndex: {
					type: "object",
					properties: {
						id: { type: "string" },
						slug: { type: "string" },
						displayName: { type: "string" },
						version: { type: "integer" },
						enabled: { type: "boolean" },
						apiKeysCount: { type: "integer" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				SearchIndexFull: {
					type: "object",
					properties: {
						id: { type: "string" },
						organizationId: { type: "string" },
						slug: { type: "string" },
						displayName: { type: "string" },
						version: { type: "integer" },
						enabled: { type: "boolean" },
						schema: { type: "object" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				SearchField: {
					type: "object",
					required: ["name", "type"],
					properties: {
						name: { type: "string", maxLength: 64 },
						type: {
							type: "string",
							enum: [
								"string",
								"int32",
								"int64",
								"float",
								"bool",
								"string[]",
								"int32[]",
								"int64[]",
								"float[]",
								"bool[]",
								"object",
								"object[]",
								"auto",
							],
						},
						facet: { type: "boolean" },
						optional: { type: "boolean" },
						index: { type: "boolean" },
						sort: { type: "boolean" },
					},
				},
				ApiKey: {
					type: "object",
					properties: {
						id: { type: "string" },
						name: { type: "string" },
						prefix: { type: "string" },
						scopes: {
							type: "array",
							items: { type: "string" },
						},
						allowedOrigins: {
							type: "array",
							items: { type: "string" },
						},
						rateLimitPerMinute: { type: "integer" },
						expiresAt: { type: "string", format: "date-time", nullable: true },
						revokedAt: { type: "string", format: "date-time", nullable: true },
						lastUsedAt: { type: "string", format: "date-time", nullable: true },
						createdAt: { type: "string", format: "date-time" },
						indexSlug: { type: "string" },
						indexDisplayName: { type: "string" },
					},
				},
				SearchIndexStats: {
					type: "object",
					properties: {
						id: { type: "string" },
						slug: { type: "string" },
						displayName: { type: "string" },
						version: { type: "integer" },
						documentCount: {
							type: "integer",
							description: "Live document count from Typesense (0 if unavailable)",
						},
						usage: {
							type: "object",
							properties: {
								since: { type: "string", format: "date-time" },
								totalSearches: { type: "integer" },
								totalIndexed: { type: "integer" },
								zeroResultCount: { type: "integer" },
								clickCount: { type: "integer" },
							},
						},
						ingestQueue: {
							type: "object",
							properties: {
								pending: { type: "integer" },
								failed: { type: "integer" },
							},
						},
						apiKeysCount: { type: "integer" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				Synonym: {
					type: "object",
					properties: {
						id: { type: "string" },
						root: { type: "string" },
						synonyms: {
							type: "array",
							items: { type: "string" },
						},
					},
				},
				SynonymInput: {
					type: "object",
					required: ["root", "synonym"],
					properties: {
						root: { type: "string" },
						synonym: { type: "string" },
					},
				},
				Curation: {
					type: "object",
					properties: {
						id: { type: "string" },
						query: { type: "string" },
						pinnedIds: {
							type: "array",
							items: { type: "string" },
						},
						hiddenIds: {
							type: "array",
							items: { type: "string" },
						},
					},
				},
				CurationInput: {
					type: "object",
					required: ["query"],
					properties: {
						query: { type: "string" },
						pinnedIds: {
							type: "array",
							items: { type: "string" },
						},
						hiddenIds: {
							type: "array",
							items: { type: "string" },
						},
					},
				},
				ApiError: {
					type: "object",
					properties: {
						error: { type: "string" },
						message: { type: "string" },
						details: {},
					},
				},
			},
			responses: {
				BadRequest: {
					description: "Invalid input",
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ApiError" },
						},
					},
				},
				Unauthorized: {
					description: "Missing or invalid authentication",
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ApiError" },
						},
					},
				},
				Forbidden: {
					description: "Insufficient permissions",
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ApiError" },
						},
					},
				},
				NotFound: {
					description: "Resource not found",
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ApiError" },
						},
					},
				},
			},
		},
	};
}
