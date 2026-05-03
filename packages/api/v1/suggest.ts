/**
 * V1 Suggest/Autocomplete endpoint.
 *
 *   POST /v1/indexes/:indexId/suggest — query suggestions and autocomplete
 *
 * Uses AACSearch's suggestion engine: WeightedTrie prefix matching,
 * fuzzy autocomplete, phrase suggestions, and popular queries.
 * Requires a search-scoped API key.
 */
import { logger } from "@repo/logs";
import { CompletionSuggester, WeightedTrie } from "@repo/nlp";
import { getTypesenseClient } from "@repo/search";
import { Hono } from "hono";
import { z } from "zod";

import { requireScope } from "./auth";

// ── Zod Schemas ───────────────────────────────────────────────────

const suggestInputSchema = z.object({
	/** The search query prefix to get suggestions for */
	q: z.string().min(1).max(200),
	/** Maximum number of suggestions to return (default: 10) */
	limit: z.number().int().min(1).max(50).default(10),
	/** Enable fuzzy matching with typo tolerance (default: true) */
	fuzzy: z.boolean().default(true),
	/** Maximum edit distance for fuzzy matching (default: 2) */
	fuzzyDistance: z.number().int().min(1).max(4).default(2),
	/** Minimum prefix length to trigger suggestions (default: 2) */
	minPrefix: z.number().int().min(1).max(10).default(2),
	/** Include popular query suggestions from analytics (default: true) */
	popular: z.boolean().default(true),
	/** Include trending suggestions (default: true) */
	trending: z.boolean().default(true),
});

// ── Helpers ───────────────────────────────────────────────────────

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

async function fetchIndexFieldValues(
	indexSlug: string,
	prefix: string,
	limit: number,
): Promise<string[]> {
	const client = getTypesenseClient();
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const schema = (await (client as any).collections(indexSlug).retrieve()) as any;
		if (!schema?.fields) return [];

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const stringFields = (schema.fields as any[])
			.filter((f: any) => f.type === "string" && !f.name.startsWith("_"))
			.map((f: any) => f.name) as string[];

		// Try prefix search on each string field
		const values = new Set<string>();
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
					if (
						typeof val === "string" &&
						val.toLowerCase().startsWith(prefix.toLowerCase())
					) {
						values.add(val);
					}
				}
			}
		}

		return Array.from(values).slice(0, limit);
	} catch {
		return [];
	}
}

// ── Router ────────────────────────────────────────────────────────

export const suggestApp = new Hono()

	// ── POST /v1/indexes/:indexId/suggest ─────────────────────────
	.post("/indexes/:indexId/suggest", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;

		const indexId = c.req.param("indexId");
		if (!indexId) {
			return c.json({ error: "missing_index_id" }, 400);
		}

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json(
				{ error: "invalid_json", message: "Request body must be valid JSON" },
				400,
			);
		}

		const parsed = suggestInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: "invalid_input",
					message: "Validation failed",
					details: parsed.error.issues,
				},
				400,
			);
		}

		const { q, limit, fuzzy, fuzzyDistance, minPrefix, popular, trending } = parsed.data;

		try {
			// If input is shorter than minPrefix, return popular/trending only
			if (q.trim().length < minPrefix) {
				const results: Array<{
					text: string;
					score: number;
					source: string;
					type: string;
				}> = [];

				if (popular) {
					const popularQueries = await fetchPopularQueries(indexId, limit);
					for (const pq of popularQueries) {
						results.push({
							text: pq.query,
							score: Math.min(1, pq.count / 100),
							source: "popular",
							type: "query",
						});
					}
				}

				return c.json({
					suggestions: results.slice(0, limit),
					groups: [
						{
							name: "popular",
							label: "Popular searches",
							suggestions: results.slice(0, limit),
						},
					],
				});
			}

			// Build suggestions from multiple sources
			const suggestions: Array<{
				text: string;
				score: number;
				source: string;
				type: string;
				highlights?: Array<{ start: number; end: number }>;
			}> = [];

			// Source 1: Prefix matching on field values (exact + fuzzy)
			const prefixValues = await fetchIndexFieldValues(indexId, q, limit);
			for (const val of prefixValues) {
				const lowerVal = val.toLowerCase();
				const lowerQ = q.toLowerCase();
				const start = lowerVal.indexOf(lowerQ);
				suggestions.push({
					text: val,
					score: 0.9,
					source: "prefix",
					type: "field_value",
					highlights: start >= 0 ? [{ start, end: start + q.length }] : undefined,
				});
			}

			// Source 2: Use CompletionSuggester with fuzzy support
			if (prefixValues.length < limit) {
				const suggester = new CompletionSuggester({
					maxResults: limit,
					minPrefix,
					fuzzy,
					fuzzyDistance,
				});

				const indexSuggestions = suggester.suggest(q, {
					maxResults: limit - suggestions.length,
					minPrefix,
					fuzzy,
					fuzzyDistance,
				});

				for (const is of indexSuggestions) {
					if (!suggestions.some((s) => s.text === is.text)) {
						suggestions.push({
							text: is.text,
							score: is.score * 0.8,
							source: "completion",
							type: is.type === "phrase" ? "phrase" : "query",
						});
					}
				}
			}

			// Source 3: Popular queries from analytics
			if (popular && suggestions.length < limit) {
				const popularQueries = await fetchPopularQueries(
					indexId,
					limit - suggestions.length + 3,
				);
				for (const pq of popularQueries) {
					if (
						pq.query.toLowerCase().startsWith(q.toLowerCase()) &&
						!suggestions.some((s) => s.text === pq.query)
					) {
						suggestions.push({
							text: pq.query,
							score: Math.min(1, pq.count / 100),
							source: "popular",
							type: "query",
						});
					}
				}
			}

			// Sort by score descending
			suggestions.sort((a, b) => b.score - a.score);

			const topSuggestions = suggestions.slice(0, limit);

			// Group by source
			const groups: Array<{
				name: string;
				label: string;
				suggestions: typeof topSuggestions;
			}> = [];

			const prefixGroup = topSuggestions.filter((s) => s.source === "prefix");
			if (prefixGroup.length > 0) {
				groups.push({
					name: "products",
					label: "Products",
					suggestions: prefixGroup,
				});
			}

			const completionGroup = topSuggestions.filter((s) => s.source === "completion");
			if (completionGroup.length > 0) {
				groups.push({
					name: "phrases",
					label: "Suggested queries",
					suggestions: completionGroup,
				});
			}

			const popularGroup = topSuggestions.filter((s) => s.source === "popular");
			if (popularGroup.length > 0) {
				groups.push({
					name: "popular",
					label: "Popular searches",
					suggestions: popularGroup,
				});
			}

			return c.json({
				prefix: q,
				suggestions: topSuggestions,
				groups,
				total: topSuggestions.length,
			});
		} catch (error) {
			logger.error({ error }, "Suggest API error");
			return c.json({ error: "suggest_failed" }, 502);
		}
	});
