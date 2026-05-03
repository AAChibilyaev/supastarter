/**
 * Popularity-based ranking helpers for Typesense v30 Analytics.
 *
 * Counter rules allow incrementing a numeric field (e.g. click_count, conversion_count)
 * when analytics events occur. This enables popularity-based ranking:
 *
 *   sort_by: click_count:desc, _text_match:desc
 *
 * Usage:
 *   1. Create a counter rule via analytics-rules.ts
 *   2. Add a numeric int32 field to your collection schema (e.g. "click_count")
 *   3. Use buildPopularitySortBy() when constructing search queries
 *   4. Widget/API events automatically increment the counter field via /events/track
 *
 * Typesense docs: https://typesence.org/docs/30.0/api/analytics-rule.html
 */

import "server-only";

/** Available popularity metrics for ranking */
export type PopularityMetric = "click_count" | "conversion_count" | "visit_count";

/** Sorting direction */
export type SortDirection = "asc" | "desc";

/**
 * Build a sort_by string that combines popularity ranking with text relevance.
 *
 * Example output: "click_count:desc, _text_match:desc"
 */
export function buildPopularitySortBy(
	metric: PopularityMetric = "click_count",
	direction: SortDirection = "desc",
	fallbackSortBy?: string,
): string {
	const popularitySort = `${metric}:${direction}`;
	if (fallbackSortBy) {
		return `${popularitySort}, ${fallbackSortBy}`;
	}
	return `${popularitySort}, _text_match:desc`;
}

/**
 * Build a sort_by string that boosts popularity over a threshold.
 *
 * Example: if click_count >= 10, boost to top; otherwise sort by text match.
 * Uses Typesense's eval() for conditional sorting.
 */
export function buildPopularityThresholdSortBy(
	threshold: number = 10,
	metric: PopularityMetric = "click_count",
	fallbackSortBy: string = "_text_match:desc",
): string {
	return `_eval(if(_gte(${metric}, ${threshold}), 1, 0)):desc, ${fallbackSortBy}`;
}

/**
 * Default counter rule configuration for click-based popularity.
 *
 * This can be used as the `params` field when creating a counter rule
 * via the analytics-rules createAnalyticsRule procedure.
 */
export const DEFAULT_CLICK_COUNTER_RULE = {
	source: {
		collections: [], // Fill in with your collection names
		events: [
			{
				type: "click",
				weight: 1,
				name: "result_click",
			},
		],
	},
	destination: {
		collection: "", // Fill in with your collection name
		counter_field: "click_count",
	},
} as const;

/**
 * Default counter rule configuration for conversion-based popularity.
 */
export const DEFAULT_CONVERSION_COUNTER_RULE = {
	source: {
		collections: [], // Fill in with your collection names
		events: [
			{
				type: "conversion",
				weight: 10, // Conversions weighted higher than clicks
				name: "conversion_event",
			},
		],
	},
	destination: {
		collection: "", // Fill in with your collection name
		counter_field: "conversion_count",
	},
} as const;

/**
 * Default counter rule combining clicks, conversions, and visits.
 */
export const DEFAULT_COMBINED_COUNTER_RULE = {
	source: {
		collections: [],
		events: [
			{
				type: "click",
				weight: 1,
				name: "result_click",
			},
			{
				type: "conversion",
				weight: 10,
				name: "conversion_event",
			},
			{
				type: "visit",
				weight: 0.5,
				name: "page_visit",
			},
		],
	},
	destination: {
		collection: "",
		counter_field: "popularity_score",
	},
} as const;
