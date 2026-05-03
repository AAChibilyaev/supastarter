/**
 * V1 Search endpoints.
 *
 *   POST /v1/indexes/:indexId/search     — search a single index
 *   POST /v1/multi-search                — multi-search (federated across searches)
 */

import { recordSearchUsage } from "@repo/database";
import { logger } from "@repo/logs";
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
	highlightStartTag: z.string().optional(),
	highlightEndTag: z.string().optional(),
	curationTags: z.string().optional(),
	hybridConfidence: z.number().min(0).max(1).optional(),
	// ── Faceted Search extensions ──
	facetQuery: z.string().optional(),
	maxFacetValues: z.number().int().min(1).optional(),
});

const multiSearchInputSchema = z.object({
	searches: z.array(searchInputSchema).min(1).max(20),
});

export const searchApp = new Hono()
	// ── Search single index ────────────────────────────────────────
	.post("/indexes/:indexId/search", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const indexId = c.req.param("indexId");
		if (indexId !== verified.indexId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			body = {};
		}

		const parsed = searchInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: parsed.error.issues }, 400);
		}

		try {
			const result = await searchDocuments({
				alias: aliasName(verified.organizationId, verified.indexSlug),
				tenantId: verified.organizationId,
				...parsed.data,
			});

			void recordSearchUsage({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				type: "search_query",
			}).catch((error) => logger.error("Could not record search usage", { error }));

			return c.json({
				hits: result.hits,
				found: result.found,
				page: result.page,
				perPage: result.perPage,
				facetCounts: result.facetCounts,
				searchTimeMs: result.searchTimeMs,
			});
		} catch (error) {
			logger.error("V1 search failed", { error, indexId });
			return c.json({ error: "search_failed", message: "Search query failed" }, 502);
		}
	})

	// ── Multi-search ───────────────────────────────────────────────
	.post("/multi-search", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			body = {};
		}

		const parsed = multiSearchInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: parsed.error.issues }, 400);
		}

		try {
			const alias = aliasName(verified.organizationId, verified.indexSlug);
			const results = await multiSearchDocuments(
				parsed.data.searches.map((s) => ({
					alias,
					tenantId: verified.organizationId,
					...s,
				})),
			);

			void recordSearchUsage({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				type: "search_query",
				count: parsed.data.searches.length,
			}).catch((error) => logger.error("Could not record multi-search usage", { error }));

			return c.json({
				results: results.map((r) => ({
					hits: r.hits,
					found: r.found,
					page: r.page,
					perPage: r.perPage,
					facetCounts: r.facetCounts,
					searchTimeMs: r.searchTimeMs,
				})),
			});
		} catch (error) {
			logger.error("V1 multi-search failed", { error, indexId: verified.indexId });
			return c.json({ error: "search_failed", message: "Multi-search query failed" }, 502);
		}
	});
