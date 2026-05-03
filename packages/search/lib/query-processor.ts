/**
 * Search query preprocessing — handles phrase search, negation, and wildcard syntax.
 *
 * Typesense natively supports:
 *   - Phrase search: `"exact phrase"` → exact match on the phrase
 *   - Negation: `-excluded` → excludes results containing that term
 *   - Wildcard: `wild*` / `???` → glob pattern matching
 *
 * This processor detects these patterns and auto-sets search parameters
 * so the UI doesn't need to expose raw Typesense syntax to the user.
 */

export interface ProcessedQuery {
	/** The cleaned query string to send to Typesense */
	q: string;
	/** Whether the entire query is an exact-match phrase */
	isExactPhrase: boolean;
}

/**
 * Preprocess a search query to detect phrase search patterns.
 *
 * If the ENTIRE non-empty query is wrapped in double quotes (e.g. `"blue shoes"`),
 * this strips the quotes and marks the search as `exact: true` so Typesense
 * applies exact-phrase matching without typo tolerance.
 *
 * Partially quoted queries (e.g. `"blue" shoes`) are left as-is for Typesense's
 * native phrase handling.
 */
export function processQuery(rawQuery: string): ProcessedQuery {
	const trimmed = rawQuery.trim();

	// Empty or wildcard-only queries: no preprocessing needed
	if (!trimmed || trimmed === "*") {
		return { q: trimmed, isExactPhrase: false };
	}

	// Check if the ENTIRE query is wrapped in double quotes
	const fullPhraseMatch = trimmed.match(/^"([\s\S]+)"$/);

	if (fullPhraseMatch) {
		return {
			q: fullPhraseMatch[1].trim(),
			isExactPhrase: true,
		};
	}

	// Partially quoted or unquoted: pass through as-is
	return { q: trimmed, isExactPhrase: false };
}

/**
 * Check if a query contains negation operators (`-` or `!` prefix on terms).
 * Returns the query with negation markers preserved (Typesense handles natively).
 */
export function hasNegation(query: string): boolean {
	// Check for word boundary before - or ! to avoid matching hyphenated words
	return /(\s|^)-(\S)|(\s|^)!(\S)/.test(query);
}

/**
 * Check if a query contains wildcard characters (`*` or `?`).
 */
export function hasWildcard(query: string): boolean {
	return query.includes("*") || query.includes("?");
}
