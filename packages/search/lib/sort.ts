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
