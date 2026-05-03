/**
 * Decay function helpers for Typesense sort_by.
 *
 * Decay functions allow you to sort by a score that decays (decreases)
 * as a value moves away from an optimal `origin` point. Useful for:
 * - Products closest to a user's budget
 * - Events nearest to a target date
 * - Items with optimal weight, age, or rating
 *
 * ## Syntax
 * ```
 * sort_by: gauss(origin:50, scale:20, decay:0.5):desc
 * sort_by: _text_match(gauss(origin:50, scale:20)):desc, price:asc
 * ```
 *
 * ## Parameters
 * - `origin`: The optimal value (center point where score = 1.0)
 * - `scale`: Distance from origin where score drops to `decay` (default: 0.5)
 * - `offset` (optional): Distance from origin before decay starts (score stays 1.0)
 * - `decay` (optional): Score value at `origin + scale` (default: 0.5, range: 0-1)
 *
 * @example
 * ```ts
 * import { decaySort } from "@repo/search";
 *
 * // Products closest to budget of $50
 * const sortBy = `${decaySort("price", "gauss", {
 *   origin: 50, scale: 20, decay: 0.5
 * })}:desc`;
 * // → "gauss(origin:50,scale:20,decay:0.5):desc"
 *
 * // Combined with text match relevance
 * const sortBy = `_text_match(${decaySort("price", "linear", {
 *   origin: 100, scale: 50, offset: 10
 * })}):desc, popularity:desc`;
 * ```
 */

/** Supported Typesense decay function types */
export type DecayFunctionType = "gauss" | "linear" | "exp";

/** Parameters for constructing a decay sort expression */
export interface DecaySortParams {
	/** The optimal value (center point where score = 1.0) */
	origin: number;
	/** Distance from origin where score drops to `decay` value */
	scale: number;
	/** Distance from origin before decay starts (optional, default: 0) */
	offset?: number;
	/** Score at origin + scale (optional, default: 0.5, range: 0-1) */
	decay?: number;
}

/**
 * Build a decay function sort expression for use in `sort_by`.
 *
 * @param field - The field name to apply decay to (ignored for `_text_match` combinations)
 * @param type - Decay function type: `"gauss"`, `"linear"`, or `"exp"`
 * @param params - Decay parameters: `origin`, `scale`, optional `offset` and `decay`
 *
 * @returns A string like `gauss(origin:50,scale:20,decay:0.5)`
 *
 * @example
 * ```ts
 * decaySort("price", "gauss", { origin: 50, scale: 20, decay: 0.5 })
 * // → "gauss(origin:50,scale:20,decay:0.5)"
 *
 * decaySort("rating", "linear", { origin: 5, scale: 2, offset: 1 })
 * // → "linear(origin:5,scale:2,offset:1)"
 * ```
 */
export function decaySort(field: string, type: DecayFunctionType, params: DecaySortParams): string {
	const parts: string[] = [];

	parts.push(`origin:${params.origin}`);
	parts.push(`scale:${params.scale}`);

	if (params.offset !== undefined) {
		parts.push(`offset:${params.offset}`);
	}

	if (params.decay !== undefined) {
		parts.push(`decay:${params.decay}`);
	}

	return `${type}(${parts.join(",")})`;
}

/**
 * Type guard to check if a sort string contains a decay function expression.
 *
 * @param sortValue - The sort_by string to check
 * @returns `true` if the string contains `gauss(`, `linear(`, or `exp(`
 */
export function hasDecaySort(sortValue: string): boolean {
	return /(?:gauss|linear|exp)\(/i.test(sortValue);
}

/**
 * Wrap a decay sort expression in `_text_match()` for relevance-based decay.
 *
 * @param decayExpression - A decay sort expression (from `decaySort()`)
 * @param direction - Sort direction: `"desc"` (default) or `"asc"`
 *
 * @returns A string like `_text_match(gauss(origin:50,scale:20)):desc`
 *
 * @example
 * ```ts
 * textMatchDecay(decaySort("price", "gauss", { origin: 50, scale: 20 }), "desc")
 * // → "_text_match(gauss(origin:50,scale:20)):desc"
 * ```
 */
export function textMatchDecay(
	decayExpression: string,
	direction: "asc" | "desc" = "desc",
): string {
	return `_text_match(${decayExpression}):${direction}`;
}

// ─── Conditional sorting (_eval) ──────────────────────────────────────────

/**
 * Build a conditional sort expression using `_eval()`.
 *
 * Evaluates a field equality condition — documents matching the condition
 * get boosted, others stay at their natural position.
 *
 * Useful for query-time boosting without curation rules:
 * - Boost specific brand products: `_eval(brand:Apple):desc`
 * - Prioritize in-stock items: `_eval(stock:>0):desc`
 *
 * @param expression - The eval expression, e.g. `"brand:Apple"` or `"stock:>0"`
 * @param direction - Sort direction: `"desc"` (default) or `"asc"`
 *
 * @returns A string like `_eval(brand:Apple):desc`
 *
 * @example
 * ```ts
 * evalSort("brand:Apple", "desc")
 * // → "_eval(brand:Apple):desc"
 *
 * // Combined with other sort fields
 * const sortBy = `${evalSort("stock:>0", "desc")},price:asc`;
 * ```
 */
export function evalSort(expression: string, direction: "asc" | "desc" = "desc"): string {
	return `_eval(${expression}):${direction}`;
}

// ─── Random sorting (_rand) ───────────────────────────────────────────────

/**
 * Build a random sort expression using `_rand()`.
 *
 * Returns results in random order on each query. Useful for:
 * - A/B testing
 * - "Surprise me" features
 * - Rotating featured content
 *
 * Note: randomness is deterministic per query — each request gets a
 * consistent random seed. Add `_rand():desc` as a secondary sort to
 * shuffle results with the same primary sort score.
 *
 * @param direction - Sort direction: `"desc"` (default) or `"asc"`
 *
 * @returns A string like `_rand():desc`
 *
 * @example
 * ```ts
 * randomSort()
 * // → "_rand():desc"
 *
 * // Shuffle within same text match score
 * const sortBy = `_text_match:desc,${randomSort()}`;
 * ```
 */
export function randomSort(direction: "asc" | "desc" = "desc"): string {
	return `_rand():${direction}`;
}

// ─── Bucket sorting ───────────────────────────────────────────────────────

/**
 * Add bucket count to a sort expression.
 *
 * Buckets divide the sort results into N equal groups of relevance.
 * Useful for ensuring diversity in results:
 * - `_text_match:desc(buckets:10)` — spread results across 10 relevance buckets
 * - `price:asc(buckets:5)` — group prices into 5 buckets
 *
 * @param sortExpression - The base sort expression (e.g. `"_text_match:desc"`)
 * @param buckets - Number of buckets (positive integer)
 *
 * @returns A string like `_text_match:desc(buckets:10)`
 *
 * @example
 * ```ts
 * bucketSort("_text_match:desc", 10)
 * // → "_text_match:desc(buckets:10)"
 *
 * bucketSort("popularity:desc", 5)
 * // → "popularity:desc(buckets:5)"
 * ```
 */
export function bucketSort(sortExpression: string, buckets: number): string {
	return `${sortExpression}(buckets:${buckets})`;
}

// ─── Missing values in sorting ────────────────────────────────────────────

/**
 * Add missing_values control to a sort expression.
 *
 * Controls where null/missing field values should appear in sort results:
 * - `"last"` (default if not specified): nulls appear at the end
 * - `"first"`: nulls appear at the beginning
 *
 * Important for e-commerce: products without prices should appear last.
 *
 * @param sortExpression - The base sort expression (e.g. `"price:asc"`)
 * @param position - Where to place null values: `"first"` or `"last"`
 *
 * @returns A string like `price:asc(missing_values:last)`
 *
 * @example
 * ```ts
 * missingValues("price:asc", "last")
 * // → "price:asc(missing_values:last)"
 *
 * // Products without prices go to the end
 * const sortBy = missingValues("price:asc", "last");
 * ```
 */
export function missingValues(sortExpression: string, position: "first" | "last"): string {
	return `${sortExpression}(missing_values:${position})`;
}
