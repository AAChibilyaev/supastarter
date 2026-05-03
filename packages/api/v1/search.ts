/**
 * V1 Search endpoints.
 *
 *   POST /v1/indexes/:indexId/search     — search a single index
 *   POST /v1/multi-search                — multi-search (federated across searches)
 */

import { recordSearchUsage } from "@repo/database";
import { logger } from "@repo/logs";
import { getMetrics, trackSearchLatency } from "@repo/observability";
import { aliasName, multiSearchDocuments, searchDocuments } from "@repo/search";
import { Hono } from "hono";
import { z } from "zod";

import { requireScope } from "./auth";

const geoPolygonSchema = z.object({
	field: z.string().optional(),
	polygon: z.array(z.tuple([z.number(), z.number()])).min(3),
});

const geoBoundingBoxSchema = z.object({
	field: z.string().optional(),
	bounding_box: z.tuple([
		z.object({ lat: z.number(), lng: z.number() }),
		z.object({ lat: z.number(), lng: z.number() }),
	]),
});

const searchInputSchema = z.object({
	q: z.string().default("*"),
	queryBy: z.string().optional(),
	filterBy: z.string().optional(),
	facetBy: z.string().optional(),
	sortBy: z.string().optional(),
	perPage: z.number().int().min(1).max(100).optional(),
	page: z.number().int().min(1).max(1000).optional(),
	highlightFields: z.string().optional(),
	// ── Typo Tolerance ──
	numTypos: z.number().int().min(0).max(3).optional(),
	typoTokensThreshold: z.number().int().min(0).optional(),
	dropTokensThreshold: z.number().int().min(0).optional(),
	exact: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional(),
	prioritizeExactMatch: z.boolean().optional(),
	// ── Prefix & Infix ──
	prefix: z
		.union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("auto")])
		.optional(),
	infix: z.enum(["off", "always", "fallback"]).optional(),
	queryByWeights: z.string().optional(),
	// ── Geo Search ──
	polygonFilter: geoPolygonSchema.optional(),
	boundingBoxFilter: geoBoundingBoxSchema.optional(),
	// ── Search Params Extensions ──
	excludeFields: z.string().optional(),
	includeFields: z.string().optional(),
	highlightStartTag: z.string().optional(),
	highlightEndTag: z.string().optional(),
	curationTags: z.string().optional(),
	hybridConfidence: z.number().min(0).max(1).optional(),
	// ── Faceted Search extensions ──
	maxFacetValues: z.number().int().min(1).optional(),
	facetQuery: z.string().optional(),
	facetSearch: z.string().optional(),
	/** Percentage of documents to sample for facet counts (0–100). */
	facetSamplePercent: z.number().min(0).max(100).optional(),
	/** Facet strategy: "exact" for exact matches, "intersection" for intersection-based counting. */
	facetStrategy: z.enum(["exact", "intersection"]).optional(),
});

type SearchInput = z.infer<typeof searchInputSchema>;

function coerceExact(value: unknown): boolean | undefined {
	if (typeof value === "boolean") return value;
	if (value === "true") return true;
	if (value === "false") return false;
	return undefined;
}

function parseSearchInput(body: unknown): SearchInput {
	const parsed = searchInputSchema.parse(body);

	// Manually coerce the `exact` field from strings
	if (parsed.exact !== undefined) {
		parsed.exact = coerceExact(parsed.exact);
	}

	return parsed;
}

export const searchApp = new Hono()
	// ── Single index search ─────────────────────────────────────────
	.post("/indexes/:indexId/search", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexSlug = c.req.param("indexId");

		const endLatency = trackSearchLatency(getMetrics(), indexSlug);

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json(
				{ error: "invalid_json", message: "Request body must be valid JSON" },
				400,
			);
		}

		let input: SearchInput;
		try {
			input = parseSearchInput(body);
		} catch (err) {
			return c.json(
				{
					error: "validation_error",
					message: z.ZodError.isZodError(err) ? err.issues : String(err),
				},
				400,
			);
		}

		const startTime = Date.now();

		const result = await searchDocuments({
			collection: aliasName(verified.organizationId, indexSlug),
			tenantId: verified.organizationId,
			q: input.q,
			queryBy: input.queryBy,
			filterBy: input.filterBy,
			facetBy: input.facetBy,
			sortBy: input.sortBy,
			perPage: input.perPage,
			page: input.page,
			highlightFields: input.highlightFields,
			numTypos: input.numTypos,
			typoTokensThreshold: input.typoTokensThreshold,
			dropTokensThreshold: input.dropTokensThreshold,
			exact: input.exact,
			prioritizeExactMatch: input.prioritizeExactMatch,
			prefix: input.prefix,
			infix: input.infix,
			queryByWeights: input.queryByWeights,
			excludeFields: input.excludeFields,
			includeFields: input.includeFields,
			highlightStartTag: input.highlightStartTag,
			highlightEndTag: input.highlightEndTag,
			curationTags: input.curationTags,
			hybridConfidence: input.hybridConfidence,
			maxFacetValues: input.maxFacetValues,
			facetQuery: input.facetQuery,
			facetSearch: input.facetSearch,
			facetSamplePercent: input.facetSamplePercent,
			facetStrategy: input.facetStrategy,
			polygonFilter: input.polygonFilter,
			boundingBoxFilter: input.boundingBoxFilter,
		});

		endLatency();

		void recordSearchUsage({
			organizationId: verified.organizationId,
			type: "search_query",
			count: 1,
		}).catch((e) => logger.error("Failed to record search usage", e));

		return c.json(result);
	})
	// ── Multi-search (federated) ────────────────────────────────────
	.post("/multi-search", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const searchesSchema = z.object({
			searches: z.array(
				z.object({
					indexSlug: z.string(),
					search: searchInputSchema,
				}),
			),
		});

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json(
				{ error: "invalid_json", message: "Request body must be valid JSON" },
				400,
			);
		}

		let parsed: z.infer<typeof searchesSchema>;
		try {
			parsed = searchesSchema.parse(body);
		} catch (err) {
			return c.json(
				{
					error: "validation_error",
					message: z.ZodError.isZodError(err) ? err.issues : String(err),
				},
				400,
			);
		}

		// Build multi-search entries with tenant prefix on collection names
		const entries = parsed.searches.map((s) => ({
			collection: aliasName(verified.organizationId, s.indexSlug),
			tenantId: verified.organizationId,
			...s.search,
			exact: coerceExact(s.search.exact),
		}));

		const endLatency = trackSearchLatency(getMetrics(), "multi-search");

		const result = await multiSearchDocuments(entries);

		endLatency();

		void recordSearchUsage({
			organizationId: verified.organizationId,
			type: "search_query",
			count: 1,
		}).catch((e) => logger.error("Failed to record search usage", e));

		return c.json(result);
	});
