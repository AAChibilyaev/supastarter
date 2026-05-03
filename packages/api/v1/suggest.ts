/**
 * V1 Suggest/Autocomplete endpoint.
 *
 *   POST /v1/indexes/:indexId/suggest — query suggestions and autocomplete
 *
 * Multi-source suggestion engine:
 *   - prefix: field value prefix matching via Typesense
 *   - completion: WeightedTrie-based completion (fuzzy aware, seeded from query logs)
 *   - trending: last-24h trending queries from SearchUsageEvent
 *   - popular: frequent query suggestions from Typesense analytics
 *   - recent: per-user recent query history (if anonymousUserId provided)
 *
 * Ranking: CTR-weighted score = frequency * CTR + recency boost
 *
 * Edge-cached (TTL 60s) for popular/trending suggestions when prefix < minPrefix.
 * Requires a search-scoped API key.
 */
import { logger } from "@repo/logs";
import { CompletionSuggester } from "@repo/nlp";
import { getTypesenseClient } from "@repo/search";
import { Hono } from "hono";

import { requireScope } from "./auth";

// ── Cache ────────────────────────────────────────────────────────

interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}

const SUGGEST_CACHE = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 60_000; // 60 seconds

function cacheGet<T>(key: string): T | undefined {
	const entry = SUGGEST_CACHE.get(key) as CacheEntry<T> | undefined;
	if (!entry) return undefined;
	if (Date.now() > entry.expiresAt) {
		SUGGEST_CACHE.delete(key);
		return undefined;
	}
	return entry.data;
}

function cacheSet<T>(key: string, data: T): void {
	SUGGEST_CACHE.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
	// Limit cache size to 500 entries
	if (SUGGEST_CACHE.size > 500) {
		const firstKey = SUGGEST_CACHE.keys().next().value;
		if (firstKey) SUGGEST_CACHE.delete(firstKey);
	}
}

// ── Input Schema ─────────────────────────────────────────────────

interface SuggestInput {
	q: string;
	limit: number;
	fuzzy: boolean;
	fuzzyDistance: number;
	minPrefix: number;
	popular: boolean;
	trending: boolean;
	recent: boolean;
	anonymousUserId?: string;
	sessionId?: string;
}

// ── Suggestion type ──────────────────────────────────────────────

interface Suggestion {
	text: string;
	score: number;
	source: "prefix" | "completion" | "trending" | "popular" | "recent";
	type: "query" | "phrase" | "field_value";
	highlights?: Array<{ start: number; end: number }>;
}

interface SuggestionGroup {
	name: string;
	label: string;
	suggestions: Suggestion[];
}

interface SuggestResponse {
	prefix: string;
	suggestions: Suggestion[];
	groups: SuggestionGroup[];
	total: number;
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Fetch popular queries from Typesense analytics rules.
 */
async function fetchPopularQueries(
	indexSlug: string,
	limit: number,
): Promise<Array<{ query: string; count: number }>> {
	const client = getTypesenseClient();
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const analytics = (await (client as any).analytics.rules().retrieve()) as any;
		const rules: any[] = analytics?.rules ?? [];

		return rules
			.filter((r: any) => r.type === "popular_queries")
			.slice(0, limit)
			.map((r: any) => ({
				query: (r.query as string) ?? "",
				count: (r.count as number) ?? 0,
			}))
			.filter((r) => r.query.length > 0);
	} catch {
		return [];
	}
}

/**
 * Structure for DB-sourced query events.
 */
interface UsageEvent {
	query: string;
	count: number;
	clickCount?: number;
	createdAt: Date;
}

/**
 * Fetch trending queries from SearchUsageEvent analytics in the last 24h.
 */
async function fetchTrendingQueries(
	indexId: string, // DB index ID (cuid)
	organizationId: string,
	limit: number,
): Promise<UsageEvent[]> {
	try {
		const { db } = await import("@repo/database");

		const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

		const events = await db.searchUsageEvent.findMany({
			where: {
				indexId,
				organizationId,
				type: "search_query",
				createdAt: { gte: since },
			},
			orderBy: { createdAt: "desc" },
			take: 500,
		});

		// Aggregate by query
		const queryMap = new Map<string, { count: number; createdAt: Date }>();
		for (const ev of events) {
			const meta = (ev.metadata ?? {}) as Record<string, unknown>;
			const query = (typeof meta.query === "string" ? meta.query : "") || "";
			if (!query) continue;
			const existing = queryMap.get(query);
			if (existing) {
				existing.count += ev.count;
				if (ev.createdAt > existing.createdAt) {
					existing.createdAt = ev.createdAt;
				}
			} else {
				queryMap.set(query, { count: ev.count, createdAt: ev.createdAt });
			}
		}

		// Fetch click events to compute CTR
		const clickEvents = await db.searchUsageEvent.findMany({
			where: {
				indexId,
				organizationId,
				type: "click",
				createdAt: { gte: since },
			},
			select: { metadata: true, count: true },
			take: 500,
		});

		const clickCounts = new Map<string, number>();
		for (const ev of clickEvents) {
			const meta = (ev.metadata ?? {}) as Record<string, unknown>;
			const query = (typeof meta.query === "string" ? meta.query : "") || "";
			if (!query) continue;
			clickCounts.set(query, (clickCounts.get(query) ?? 0) + ev.count);
		}

		// Build results with CTR-weighting
		const results: UsageEvent[] = [];
		for (const [query, data] of queryMap) {
			const clicks = clickCounts.get(query) ?? 0;
			results.push({
				query,
				count: data.count,
				clickCount: clicks,
				createdAt: data.createdAt,
			});
		}

		// Sort by CTR-weighted score
		const now = Date.now();
		results.sort((a, b) => {
			const freshBonusA = 1 + (now - a.createdAt.getTime()) / (24 * 3_600_000);
			const freshBonusB = 1 + (now - b.createdAt.getTime()) / (24 * 3_600_000);
			const aCtr = a.count > 0 ? (a.clickCount ?? 0) / a.count : 0;
			const bCtr = b.count > 0 ? (b.clickCount ?? 0) / b.count : 0;
			return b.count * (1 + bCtr * 2) * freshBonusB - a.count * (1 + aCtr * 2) * freshBonusA;
		});

		return results.slice(0, limit);
	} catch (error) {
		logger.warn({ error }, "Failed to fetch trending queries");
		return [];
	}
}

/**
 * Fetch per-user recent search queries.
 */
async function fetchRecentQueries(
	organizationId: string,
	indexId: string,
	anonymousUserId?: string,
	sessionId?: string,
	limit = 5,
): Promise<UsageEvent[]> {
	if (!anonymousUserId && !sessionId) return [];

	try {
		const { db } = await import("@repo/database");

		const events = await db.searchUsageEvent.findMany({
			where: {
				indexId,
				organizationId,
				type: "search_query",
				createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
			},
			orderBy: { createdAt: "desc" },
			take: 500,
		});

		const filtered = events.filter((ev) => {
			const meta = (ev.metadata ?? {}) as Record<string, unknown>;
			if (anonymousUserId && meta.anonymousUserId === anonymousUserId) return true;
			if (sessionId && meta.sessionId === sessionId) return true;
			return false;
		});

		// Deduplicate and aggregate
		const queryMap = new Map<string, { count: number; createdAt: Date }>();
		for (const ev of filtered) {
			const meta = (ev.metadata ?? {}) as Record<string, unknown>;
			const query = (typeof meta.query === "string" ? meta.query : "") || "";
			if (!query) continue;
			const existing = queryMap.get(query);
			if (existing) {
				existing.count += ev.count;
				if (ev.createdAt > existing.createdAt) {
					existing.createdAt = ev.createdAt;
				}
			} else {
				queryMap.set(query, { count: ev.count, createdAt: ev.createdAt });
			}
		}

		return Array.from(queryMap.entries())
			.map(([query, data]) => ({ query, count: data.count, createdAt: data.createdAt }))
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
			.slice(0, limit);
	} catch (error) {
		logger.warn({ error }, "Failed to fetch recent queries");
		return [];
	}
}

/**
 * Fetch index field values matching prefix via Typesense.
 */
async function fetchIndexFieldValues(
	indexSlug: string,
	prefix: string,
	limit: number,
): Promise<Array<{ text: string; highlights?: Array<{ start: number; end: number }> }>> {
	const client = getTypesenseClient();
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const schema = (await (client as any).collections(indexSlug).retrieve()) as any;
		if (!schema?.fields) return [];

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const stringFields = (schema.fields as any[])
			.filter((f: any) => f.type === "string" && !f.name.startsWith("_"))
			.map((f: any) => f.name) as string[];

		const values: Array<{ text: string; highlights?: Array<{ start: number; end: number }> }> = [];
		for (const field of stringFields.slice(0, 3)) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = (await (client as any)
				.collections(indexSlug)
				.documents()
				.search({
					q: prefix,
					query_by: field,
					prefix: true,
					limit: Math.ceil(limit / stringFields.length),
				})) as any;

			if (result?.hits) {
				for (const hit of result.hits) {
					const val = hit?.document?.[field];
					if (typeof val === "string") {
						const lowerVal = val.toLowerCase();
						const lowerQ = prefix.toLowerCase();
						const startIndex = lowerVal.indexOf(lowerQ);
						if (startIndex >= 0 && !values.some((v) => v.text === val)) {
							values.push({
								text: val,
								highlights: [{ start: startIndex, end: startIndex + prefix.length }],
							});
						}
					}
				}
			}
		}

		return values.slice(0, limit);
	} catch {
		return [];
	}
}

/**
 * Build and seed a CompletionSuggester from trending + popular queries.
 */
const suggesterCache = new Map<string, { suggester: CompletionSuggester; builtAt: number }>();

async function getCompletionSuggester(
	indexId: string,
	indexSlug: string,
	organizationId: string,
	fuzzyEnabled: boolean,
	fuzzyDistance: number,
	minPrefix: number,
): Promise<CompletionSuggester> {
	const cacheKey = `${indexId}:${fuzzyEnabled}:${fuzzyDistance}:${minPrefix}`;
	const cached = suggesterCache.get(cacheKey);

	// Rebuild cache every 5 minutes
	if (cached && Date.now() - cached.builtAt < 5 * 60 * 1000) {
		return cached.suggester;
	}

	const suggester = new CompletionSuggester({
		maxResults: 50,
		minPrefix,
		fuzzy: fuzzyEnabled,
		fuzzyDistance,
	});

	try {
		// Seed from trending queries
		const trending = await fetchTrendingQueries(indexId, organizationId, 100);
		for (const t of trending) {
			suggester.learnPhrase(t.query, t.count);
		}

		// Seed from Typesense analytics popular queries
		const popular = await fetchPopularQueries(indexSlug, 100);
		for (const p of popular) {
			suggester.learnPhrase(p.query, Math.max(1, p.count));
		}
	} catch {
		// Non-fatal — suggester works empty
	}

	suggesterCache.set(cacheKey, { suggester, builtAt: Date.now() });
	return suggester;
}

/**
 * Compute relevance score using CTR weighting + recency.
 */
function computeScore(
	count: number,
	clickCount?: number,
	createdAt?: Date,
	baseScore = 0.5,
): number {
	const ctr = clickCount !== undefined && count > 0 ? (clickCount ?? 0) / count : 0;
	const recencyBonus = createdAt
		? 1 + (Date.now() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
		: 0.5;
	return baseScore * (1 + ctr * 2) * (1 + count * 0.01) * recencyBonus;
}

// ── Response builders ────────────────────────────────────────────

function buildGroups(suggestions: Suggestion[]): SuggestionGroup[] {
	const groups: SuggestionGroup[] = [];

	const prefixGroup = suggestions.filter((s) => s.source === "prefix");
	if (prefixGroup.length > 0) {
		groups.push({ name: "products", label: "Products", suggestions: prefixGroup });
	}

	const completionGroup = suggestions.filter((s) => s.source === "completion");
	if (completionGroup.length > 0) {
		groups.push({ name: "phrases", label: "Suggested queries", suggestions: completionGroup });
	}

	const trendingGroup = suggestions.filter((s) => s.source === "trending");
	if (trendingGroup.length > 0) {
		groups.push({ name: "trending", label: "Trending now", suggestions: trendingGroup });
	}

	const popularGroup = suggestions.filter((s) => s.source === "popular");
	if (popularGroup.length > 0) {
		groups.push({ name: "popular", label: "Popular searches", suggestions: popularGroup });
	}

	const recentGroup = suggestions.filter((s) => s.source === "recent");
	if (recentGroup.length > 0) {
		groups.push({ name: "recent", label: "Recent searches", suggestions: recentGroup });
	}

	return groups;
}

function buildShortPrefixResponse(suggestions: Suggestion[], prefix: string): SuggestResponse {
	suggestions.sort((a, b) => b.score - a.score);
	const top = suggestions.slice(0, 10);
	const groups = buildGroups(top);
	return { prefix, suggestions: top, groups, total: top.length };
}

function buildFullResponse(
	suggestions: Suggestion[],
	prefix: string,
	limit: number,
): SuggestResponse {
	suggestions.sort((a, b) => b.score - a.score);
	const top = suggestions.slice(0, limit);
	const groups = buildGroups(top);
	return { prefix, suggestions: top, groups, total: top.length };
}

// ── Router ───────────────────────────────────────────────────────

export const suggestApp = new Hono()

	// ── POST /v1/indexes/:indexId/suggest ───────────────────────────
	.post("/indexes/:indexId/suggest", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		const urlIndexId = c.req.param("indexId");
		if (urlIndexId !== verified.indexId) {
			return c.json({ error: "not_found", message: "Index not found" }, 404);
		}
		const indexId = verified.indexId;
		const indexSlug = verified.indexSlug;
		const organizationId = verified.organizationId;

		let body: SuggestInput;
		try {
			body = (await c.req.json()) as SuggestInput;
		} catch {
			return c.json({ error: "invalid_json", message: "Request body must be valid JSON" }, 400);
		}

		// Validate required fields
		if (!body.q || typeof body.q !== "string" || body.q.length > 200) {
			return c.json({ error: "invalid_input", message: "'q' is required (1-200 chars)" }, 400);
		}

		const {
			q,
			limit = 10,
			fuzzy = true,
			fuzzyDistance = 2,
			minPrefix = 2,
			popular = true,
			trending: enableTrending = true,
			recent = false,
			anonymousUserId,
			sessionId,
		} = body;

		// Build cache key for prefix-free / popular-only results
		const cacheKey = q.trim().length < minPrefix ? `popular:${indexId}:${limit}` : undefined;

		if (cacheKey) {
			const cached = cacheGet<SuggestResponse>(cacheKey);
			if (cached) {
				return c.json(cached);
			}
		}

		try {
			const suggestions: Suggestion[] = [];

			// ── Short prefix: return popular/trending only ──────────────
			if (q.trim().length < minPrefix) {
				if (popular) {
					const popularQueries = await fetchPopularQueries(indexSlug, limit);
					for (const pq of popularQueries) {
						suggestions.push({
							text: pq.query,
							score: computeScore(pq.count, undefined, undefined, 0.3),
							source: "popular",
							type: "query",
						});
					}
				}

				if (enableTrending) {
					const trendingQueries = await fetchTrendingQueries(indexId, organizationId, limit);
					for (const tq of trendingQueries) {
						if (!suggestions.some((s) => s.text === tq.query)) {
							suggestions.push({
								text: tq.query,
								score: computeScore(tq.count, tq.clickCount, tq.createdAt, 0.4),
								source: "trending",
								type: "query",
							});
						}
					}
				}

				const result = buildShortPrefixResponse(suggestions, q);
				if (cacheKey) cacheSet(cacheKey, result);
				return c.json(result);
			}

			// ── Full multi-source suggestions ───────────────────────────

			// Source 1: Prefix matching on field values via Typesense
			const prefixValues = await fetchIndexFieldValues(indexSlug, q, limit);
			for (const val of prefixValues) {
				suggestions.push({
					text: val.text,
					score: computeScore(5, undefined, undefined, 0.9),
					source: "prefix",
					type: "field_value",
					highlights: val.highlights,
				});
			}

			// Source 2: CompletionSuggester (WeightedTrie)
			if (suggestions.length < limit) {
				const suggester = await getCompletionSuggester(
					indexId,
					indexSlug,
					organizationId,
					fuzzy,
					fuzzyDistance,
					minPrefix,
				);

				const completions = suggester.suggest(q, {
					maxResults: limit - suggestions.length,
					minPrefix,
					fuzzy,
					fuzzyDistance,
				});

				for (const cResult of completions) {
					if (!suggestions.some((s) => s.text === cResult.text)) {
						suggestions.push({
							text: cResult.text,
							score: cResult.score * 0.8,
							source: "completion",
							type: cResult.type === "phrase" ? "phrase" : "query",
						});
					}
				}
			}

			// Source 3: Trending queries (last 24h from DB)
			if (enableTrending && suggestions.length < limit) {
				const trendingQueries = await fetchTrendingQueries(
					indexId,
					organizationId,
					limit - suggestions.length + 3,
				);
				for (const tq of trendingQueries) {
					if (
						tq.query.toLowerCase().startsWith(q.toLowerCase()) &&
						!suggestions.some((s) => s.text === tq.query)
					) {
						suggestions.push({
							text: tq.query,
							score: computeScore(tq.count, tq.clickCount, tq.createdAt, 0.4),
							source: "trending",
							type: "query",
						});
					}
				}
			}

			// Source 4: Popular queries from Typesense analytics
			if (popular && suggestions.length < limit) {
				const popularQueries = await fetchPopularQueries(indexSlug, limit - suggestions.length + 3);
				for (const pq of popularQueries) {
					if (
						pq.query.toLowerCase().startsWith(q.toLowerCase()) &&
						!suggestions.some((s) => s.text === pq.query)
					) {
						suggestions.push({
							text: pq.query,
							score: computeScore(pq.count, undefined, undefined, 0.3),
							source: "popular",
							type: "query",
						});
					}
				}
			}

			// Source 5: Per-user recent queries
			if (recent && suggestions.length < limit) {
				const recentQueries = await fetchRecentQueries(
					organizationId,
					indexId,
					anonymousUserId,
					sessionId,
					limit - suggestions.length + 2,
				);
				for (const rq of recentQueries) {
					if (
						rq.query.toLowerCase().startsWith(q.toLowerCase()) &&
						!suggestions.some((s) => s.text === rq.query)
					) {
						suggestions.push({
							text: rq.query,
							score: computeScore(rq.count, undefined, rq.createdAt, 0.5),
							source: "recent",
							type: "query",
						});
					}
				}
			}

			return c.json(buildFullResponse(suggestions, q, limit));
		} catch (error) {
			logger.error({ error }, "Suggest API error");
			return c.json({ error: "suggest_failed" }, 502);
		}
	});
