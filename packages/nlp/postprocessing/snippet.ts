/**
 * Snippet generation — extracts relevant text segments
 * surrounding search query terms for result display.
 * Pure TypeScript — no external dependencies.
 */

export interface SnippetOptions {
	/** Maximum snippet length in characters */
	maxLength: number;
	/** Context window (chars) around each match */
	contextChars: number;
	/** Maximum number of snippet fragments */
	maxFragments: number;
	/** Separator between multiple fragments */
	fragmentSeparator: string;
}

const DEFAULT_OPTIONS: SnippetOptions = {
	maxLength: 200,
	contextChars: 60,
	maxFragments: 3,
	fragmentSeparator: " … ",
};

/**
 * Find all positions of query tokens in text (case-insensitive).
 */
function findMatches(
	text: string,
	queryTokens: string[],
): Array<{ start: number; end: number }> {
	const lower = text.toLowerCase();
	const matches: Array<{ start: number; end: number }> = [];

	for (const token of queryTokens) {
		if (!token) continue;
		let pos = 0;
		while (pos < lower.length) {
			const idx = lower.indexOf(token, pos);
			if (idx === -1) break;
			matches.push({ start: idx, end: idx + token.length });
			pos = idx + 1;
		}
	}

	// Sort by position
	matches.sort((a, b) => a.start - b.start);

	// Merge overlapping matches
	const merged: Array<{ start: number; end: number }> = [];
	for (const match of matches) {
		const last = merged[merged.length - 1];
		if (last && match.start <= last.end) {
			last.end = Math.max(last.end, match.end);
		} else {
			merged.push({ ...match });
		}
	}

	return merged;
}

/**
 * Extract a snippet from text focused on query matches.
 */
export function generateSnippet(
	text: string,
	query: string,
	options?: Partial<SnippetOptions>,
): string {
	if (!text) return "";

	const opts = { ...DEFAULT_OPTIONS, ...options };
	const queryTokens = query
		.toLowerCase()
		.split(/\s+/)
		.filter((t) => t.length > 1);

	if (queryTokens.length === 0) {
		// No query tokens — return beginning of text
		return text.length > opts.maxLength
			? text.slice(0, opts.maxLength) + "…"
			: text;
	}

	const matches = findMatches(text, queryTokens);

	if (matches.length === 0) {
		// No matches — return beginning of text
		return text.length > opts.maxLength
			? text.slice(0, opts.maxLength) + "…"
			: text;
	}

	// Extract context windows around matches
	const fragments: string[] = [];
	for (const match of matches) {
		if (fragments.length >= opts.maxFragments) break;

		const start = Math.max(0, match.start - opts.contextChars);
		const end = Math.min(text.length, match.end + opts.contextChars);

		let fragment = text.slice(start, end);

		// Add ellipsis if truncated
		if (start > 0) fragment = "…" + fragment;
		if (end < text.length) fragment = fragment + "…";

		fragments.push(fragment);
	}

	let snippet = fragments.join(opts.fragmentSeparator);

	// Truncate to max length
	if (snippet.length > opts.maxLength) {
		snippet = snippet.slice(0, opts.maxLength - 1) + "…";
	}

	return snippet;
}

/**
 * Highlight query terms in text by wrapping them with markers.
 */
export function highlightTerms(
	text: string,
	query: string,
	openTag: string = "<mark>",
	closeTag: string = "</mark>",
): string {
	if (!text || !query) return text;

	const queryTokens = query
		.toLowerCase()
		.split(/\s+/)
		.filter((t) => t.length > 1)
		.sort((a, b) => b.length - a.length); // Longest first to avoid nested highlights

	const lower = text.toLowerCase();
	const positions: Array<{ start: number; end: number }> = [];

	for (const token of queryTokens) {
		let pos = 0;
		while (pos < lower.length) {
			const idx = lower.indexOf(token, pos);
			if (idx === -1) break;
			positions.push({ start: idx, end: idx + token.length });
			pos = idx + 1;
		}
	}

	// Sort and merge overlapping
	positions.sort((a, b) => a.start - b.start);
	const merged: Array<{ start: number; end: number }> = [];
	for (const pos of positions) {
		const last = merged[merged.length - 1];
		if (last && pos.start <= last.end) {
			last.end = Math.max(last.end, pos.end);
		} else {
			merged.push({ ...pos });
		}
	}

	// Apply highlights from right to left to preserve positions
	let result = text;
	for (let i = merged.length - 1; i >= 0; i--) {
		const { start, end } = merged[i]!;
		result =
			result.slice(0, end) +
			closeTag +
			result.slice(end);
		result =
			result.slice(0, start) +
			openTag +
			result.slice(start);
	}

	return result;
}
