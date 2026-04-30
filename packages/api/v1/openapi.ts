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
			},

			// ─── Documents ──────────────────────────────────────────────
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
