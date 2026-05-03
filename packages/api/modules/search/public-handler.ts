import { aggregateSearchUsage, recordActivationEvent, recordSearchUsage } from "@repo/database";
import { logger } from "@repo/logs";
import { SymSpell, detectLanguage } from "@repo/nlp";
import { getMetrics, trackSearchLatency } from "@repo/observability";
import {
	aliasName,
	computeDisjunctiveFacetCounts,
	multiSearchDocuments,
	processQuery,
	searchDocuments,
} from "@repo/search";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { sanitizeReferrer } from "../../lib/referrer-sanitizer";
import { quotaCheck } from "../entitlements/middleware/quota-check";
import { combineFilters, gatePublicSearchRequest } from "./lib/public-auth";
import { chargeWalletOverage } from "./lib/quota";

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

const geoMultiLocationSchema = z.object({
	field: z.string().optional(),
	locations: z
		.array(
			z.object({
				lat: z.number().min(-90).max(90),
				lng: z.number().min(-180).max(180),
				radiusKm: z.number().min(0.1).max(40_075),
			}),
		)
		.min(2)
		.max(50),
});

const publicSearchInput = z.object({
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
	multiLocation: geoMultiLocationSchema.optional(),
	lat: z.number().min(-90).max(90).optional(),
	lng: z.number().min(-180).max(180).optional(),
	radiusKm: z.number().min(0.1).max(40_075).optional(),
	geoField: z.string().optional(),
	// ── Search Params Extensions ──
	excludeFields: z.string().optional(),
	includeFields: z.string().optional(),
	highlightStartTag: z.string().optional(),
	highlightEndTag: z.string().optional(),
	curationTags: z.string().optional(),
	hybridConfidence: z.number().min(0).max(1).optional(),
	// ── Faceted Search extensions ──
	facetQuery: z.string().optional(),
	maxFacetValues: z.number().int().min(1).optional(),
	facetSampleSlope: z.number().min(0).max(1).optional(),
	facetSampleThreshold: z.number().int().min(0).optional(),
	/** Percentage of documents to sample for facet counts (0–100). */
	facetSamplePercent: z.number().min(0).max(100).optional(),
	/** Facet value search (typeahead within facet values). */
	facetSearch: z.string().optional(),
	/** Facet strategy: "exact" for exact matches, "intersection" for intersection-based counting. */
	facetStrategy: z.enum(["exact", "intersection"]).optional(),
	/** Per-field facet value sort order (comma-separated). Format: "field_name:count|alpha". */
	facetSortBy: z.string().optional(),
	/** Comma-separated list of facet fields using disjunctive (OR) counting. */
	disjunctiveFacets: z.string().optional(),
	// ── Negation (explicit) ──
	negate: z.string().optional(),
	// ── Wildcard toggle ──
	wildcard: z.boolean().optional(),
	// ── Distinct Dedup ──
	distinct: z.union([z.string(), z.number()]).optional(),
	// ── Curation & Override ──
	/** Document IDs to pin at the top of results. */
	pinnedHits: z.string().optional(),
	/** Document IDs to hide/exclude from results. */
	hiddenHits: z.string().optional(),
	// ── MMR Diversification (Typesense v0.30+) ──
	diversifyBasedOn: z.string().optional(),
	// ── Token Join (Typesense v0.30+) ──
	splitJoinTokens: z.enum(["always", "fallback", "off"]).optional(),
	// ── Highlight Extensions (Typesense v0.30+) ──
	highlightFullFields: z.string().optional(),
	prioritizeTokenPosition: z.boolean().optional(),
	// ── Range Facets ──
	/** Numeric or date range facets: [{field, min, max}] */
	rangeFacets: z
		.array(
			z.object({
				field: z.string(),
				min: z.union([z.number(), z.string()]),
				max: z.union([z.number(), z.string()]),
			}),
		)
		.max(20)
		.optional(),
	// ── Negative / Exclusion Facets ──
	/**
	 * Array of facet value exclusions. Each entry specifies a field and value
	 * that should be excluded from results using NOT logic (field:!=value).
	 * These are merged into the filter_by expression automatically.
	 */
	excludeFilters: z
		.array(
			z.object({
				field: z.string(),
				value: z.string(),
			}),
		)
		.max(50)
		.optional(),
});

const multiSearchInput = z.object({
	searches: z.array(publicSearchInput).min(1).max(20),
});

export const publicSearchApp = new Hono()
	.use(
		"*",
		cors({
			origin: "*",
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["POST", "OPTIONS"],
			maxAge: 600,
		}),
	)
	.post("/search/public/:slug", async (c) => {
		const slug = c.req.param("slug");
		const gated = await gatePublicSearchRequest(c, new Set([slug]));
		if (gated instanceof Response) return gated;
		const { verified, scopedFilter } = gated;

		// Plan quota check
		const quota = await quotaCheck(c, verified.organizationId, "search");
		if (!quota.allowed) {
			return c.json(quota.errorPayload ?? { error: quota.error ?? "quota_exceeded" }, 429);
		}

		// Fire-and-forget: charge wallet for overage searches
		if (quota.isOverage) {
			void chargeWalletOverage({
				orgId: verified.organizationId,
				searchCount: 1,
			}).catch((err) => logger.error("Could not charge wallet overage", { error: err }));
		}

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			body = {};
		}

		const parsed = publicSearchInput.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: z.treeifyError(parsed.error) }, 400);
		}

		// ── Query preprocessing ──
		const processed = processQuery(parsed.data.q);
		const searchParams = {
			...parsed.data,
			q: processed.q,
			exact: processed.isExactPhrase ? true : parsed.data.exact,
		};
		delete (searchParams as Record<string, unknown>).negate;
		delete (searchParams as Record<string, unknown>).wildcard;
		delete (searchParams as Record<string, unknown>).lat;
		delete (searchParams as Record<string, unknown>).lng;
		delete (searchParams as Record<string, unknown>).radiusKm;
		delete (searchParams as Record<string, unknown>).geoField;
		delete (searchParams as Record<string, unknown>).polygonFilter;
		delete (searchParams as Record<string, unknown>).boundingBoxFilter;
		delete (searchParams as Record<string, unknown>).multiLocation;
		delete (searchParams as Record<string, unknown>).disjunctiveFacets;
		delete (searchParams as Record<string, unknown>).rangeFacets;
		delete (searchParams as Record<string, unknown>).excludeFilters;

		// Build filter expression: scoped + user filter + geo filter + negate + excludeFilters
		let combinedFilter = combineFilters(scopedFilter, searchParams.filterBy);

		// Geo filter: simple radius (lat/lng)
		if (parsed.data.lat !== undefined && parsed.data.lng !== undefined) {
			const field = parsed.data.geoField ?? "_geoloc";
			const radius = parsed.data.radiusKm ?? 50;
			const geoExpr = `${field}:(${parsed.data.lat}, ${parsed.data.lng}, ${radius} km)`;
			combinedFilter = combinedFilter ? `${combinedFilter} && ${geoExpr}` : geoExpr;
		}

		// Geo filter: polygon
		if (parsed.data.polygonFilter) {
			const field = parsed.data.polygonFilter.field ?? "_geoloc";
			const vertices = parsed.data.polygonFilter.polygon
				.map(([lat, lng]) => `(${lat}, ${lng})`)
				.join(", ");
			const geoExpr = `${field}:[${vertices}]`;
			combinedFilter = combinedFilter ? `${combinedFilter} && ${geoExpr}` : geoExpr;
		}

		// Geo filter: bounding box
		if (parsed.data.boundingBoxFilter) {
			const field = parsed.data.boundingBoxFilter.field ?? "_geoloc";
			const { bounding_box } = parsed.data.boundingBoxFilter;
			const geoExpr = `${field}:(${bounding_box[0].lat}, ${bounding_box[0].lng}, ${bounding_box[1].lat}, ${bounding_box[1].lng})`;
			combinedFilter = combinedFilter ? `${combinedFilter} && ${geoExpr}` : geoExpr;
		}

		if (parsed.data.negate) {
			const negated = parsed.data.negate
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean)
				.map((term) => `(${term})`)
				.join(" || ");
			if (negated) {
				combinedFilter = combinedFilter
					? `${combinedFilter} && !(${negated})`
					: `!(${negated})`;
			}
		}

		// Exclude filters: build NOT expressions for excluded facet values
		if (parsed.data.excludeFilters?.length) {
			const excludeExprs = parsed.data.excludeFilters.map(
				(ef) => `${ef.field}:!=${ef.value}`,
			);
			const excludeClause = excludeExprs.join(" && ");
			if (excludeClause) {
				combinedFilter = combinedFilter
					? `${combinedFilter} && ${excludeClause}`
					: excludeClause;
			}
		}

		try {
			const endTracking = trackSearchLatency(getMetrics(), verified.indexSlug);
			const result = await searchDocuments({
				alias: aliasName(verified.organizationId, verified.indexSlug),
				tenantId: verified.organizationId,
				...searchParams,
				filterBy: combinedFilter,
				...(parsed.data.multiLocation && { multiLocation: parsed.data.multiLocation }),
				...(parsed.data.rangeFacets && { rangeFacets: parsed.data.rangeFacets }),
			});

			// Record search latency in Prometheus
			endTracking();

			// Store query_id in usage metadata for event association
			const usageMeta: Record<string, unknown> = {
				q: searchParams.q,
				queryBy: searchParams.queryBy,
				filterBy: searchParams.filterBy,
				sortBy: searchParams.sortBy,
				perPage: searchParams.perPage,
				page: searchParams.page,
				resultCount: result.found,
				latencyMs: result.searchTimeMs,
				ua: c.req.header("user-agent") ?? null,
				referrer: sanitizeReferrer(c.req.header("referer")),
				queryId: result.queryId ?? null,
			};

			void recordSearchUsage({
				indexId: verified.indexId,
				organizationId: verified.organizationId,
				type: "search_query",
				metadata: usageMeta as import("@repo/database").Prisma.InputJsonValue,
			}).catch((error) => logger.error("Could not record search usage", { error }));

			// Fire-and-forget: record FIRST_SEARCH activation milestone (idempotent)
			void recordActivationEvent(verified.organizationId, "FIRST_SEARCH").catch(
				(err: unknown) =>
					logger.error("Failed to record FIRST_SEARCH activation event", {
						error: String(err),
						organizationId: verified.organizationId,
					}),
			);

			if (result.found === 0) {
				void recordSearchUsage({
					indexId: verified.indexId,
					organizationId: verified.organizationId,
					type: "zero_results",
					metadata: { q: parsed.data.q, filterBy: parsed.data.filterBy },
				}).catch((error) => logger.error("Could not record zero_results", { error }));
			}

			// Compute did-you-mean when results are empty
			let didYouMean: string | undefined;
			if (
				result.found === 0 &&
				processed.q &&
				processed.q !== "*" &&
				processed.q.length > 2
			) {
				try {
					const lang = detectLanguage(processed.q) ?? "en";
					const isRussian = lang === "ru";

					const commonWords = isRussian
						? [
								"и",
								"в",
								"не",
								"на",
								"я",
								"он",
								"с",
								"что",
								"по",
								"это",
								"как",
								"но",
								"для",
								"еще",
								"когда",
								"где",
								"товар",
								"цена",
								"название",
								"поиск",
								"результат",
								"запрос",
							]
						: [
								"the",
								"and",
								"for",
								"are",
								"but",
								"not",
								"you",
								"all",
								"can",
								"was",
								"one",
								"has",
								"have",
								"been",
								"what",
								"when",
								"which",
								"with",
								"search",
								"find",
								"query",
								"result",
								"product",
								"price",
								"name",
								"title",
								"index",
							];

					const freqs = new Map<string, number>();
					for (const w of commonWords) freqs.set(w, 100);

					const symspell = new SymSpell({
						maxEditDistance: 2,
						verbosity: 2,
						maxResults: 5,
					});
					symspell.createDictionary(commonWords, freqs);

					const words = processed.q.split(/\s+/).filter(Boolean);
					const correctedWords: string[] = [];
					let hasCorrection = false;

					for (const word of words) {
						const results = symspell.lookup(word);
						const exactMatch = results.find((r) => r.distance === 0);
						if (results[0] && !exactMatch) {
							correctedWords.push(results[0].term);
							hasCorrection = true;
						} else {
							correctedWords.push(word);
						}
					}

					if (hasCorrection) {
						didYouMean = correctedWords.join(" ");
					}
				} catch {
					// Silent fail on did-you-mean
				}
			}

			// ── Disjunctive facet counts ──
			// If disjunctiveFacets is specified, fire sub-queries without each
			// disjunctive facet's filter to get correct "OR" facet counts.
			let finalFacetCounts = result.facetCounts;
			if (parsed.data.disjunctiveFacets) {
				const disjunctiveFields = parsed.data.disjunctiveFacets
					.split(",")
					.map((f) => f.trim())
					.filter(Boolean);
				if (disjunctiveFields.length > 0) {
					try {
						finalFacetCounts = await computeDisjunctiveFacetCounts({
							alias: aliasName(verified.organizationId, verified.indexSlug),
							tenantId: verified.organizationId,
							q: searchParams.q as string,
							queryBy: searchParams.queryBy as string | undefined,
							filterBy: combinedFilter,
							facetBy: searchParams.facetBy as string | undefined,
							disjunctiveFacets: disjunctiveFields,
							existingFacetCounts: result.facetCounts,
						});
					} catch (error) {
						logger.error(
							"Disjunctive facet computation failed, falling back to intersection counts",
							{
								error,
								slug,
							},
						);
					}
				}
			}

			return c.json({
				hits: result.hits,
				found: result.found,
				page: result.page,
				perPage: result.perPage,
				facetCounts: finalFacetCounts,
				searchTimeMs: result.searchTimeMs,
				queryId: result.queryId,
				didYouMean,
			});
		} catch (error) {
			logger.error("Public search failed", { error, slug, indexId: verified.indexId });
			return c.json({ error: "search_failed" }, 502);
		}
	})
	.post("/search/public/multi", async (c) => {
		// Federated search across the SAME index (current key model is per-index).
		const gated = await gatePublicSearchRequest(c);
		if (gated instanceof Response) return gated;
		const { verified, scopedFilter } = gated;

		// Plan quota check
		const quotaMulti = await quotaCheck(c, verified.organizationId, "search");
		if (!quotaMulti.allowed) {
			return c.json(
				quotaMulti.errorPayload ?? { error: quotaMulti.error ?? "quota_exceeded" },
				429,
			);
		}

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			body = {};
		}

		const parsed = multiSearchInput.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: z.treeifyError(parsed.error) }, 400);
		}

		// Fire-and-forget: charge wallet for overage searches
		if (quotaMulti.isOverage) {
			void chargeWalletOverage({
				orgId: verified.organizationId,
				searchCount: parsed.data.searches.length,
			}).catch((err) => logger.error("Could not charge wallet overage", { error: err }));
		}

		try {
			const alias = aliasName(verified.organizationId, verified.indexSlug);
			const results = await multiSearchDocuments(
				parsed.data.searches.map((s) => ({
					alias,
					tenantId: verified.organizationId,
					...s,
					filterBy: combineFilters(scopedFilter, s.filterBy),
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
					queryId: r.queryId ?? null,
				})),
			});
		} catch (error) {
			logger.error("Public multi-search failed", { error, indexId: verified.indexId });
			return c.json({ error: "search_failed" }, 502);
		}
	});

export { aggregateSearchUsage };
