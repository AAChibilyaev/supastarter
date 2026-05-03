/**
 * @aacsearch/react — useAACSuggest
 *
 * Debounced autocomplete/suggestions hook for AACsearch.
 * Fires a search request 150ms after the user stops typing.
 *
 * @example
 * ```typescript
 * const { suggestions, isLoading } = useAACSuggest({
 *   baseUrl: 'https://app.aacsearch.com',
 *   apiKey: 'ss_search_****',
 *   indexId: 'products',
 *   q: 'red sh',
 *   queryBy: 'name,description',
 *   limit: 5,
 * });
 * ```
 *
 * @module @aacsearch/react
 */

import { V2SearchClient } from "@aacsearch/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { AACsearchHit } from "./use-aac-search";

// ─── Options ─────────────────────────────────────────────────────────────

/** Options for the autocomplete suggestions hook. */
export interface UseAACSuggestOptions {
	/** AACsearch deployment origin (e.g. `https://app.aacsearch.com`). */
	readonly baseUrl: string;
	/** Search-scoped API key (`ss_search_*` or `ss_scoped_*`). */
	readonly apiKey: string;
	/** Public index slug or ID to search against. */
	readonly indexId: string;

	/** Current search query text (typically the user's typed input). */
	readonly q: string;
	/** Comma-separated fields to search in. */
	readonly queryBy: string;
	/** Maximum number of suggestions to return (default 5). */
	readonly limit?: number;
	/** Filter expression (Typesense filter_by syntax). */
	readonly filters?: string;

	/**
	 * Debounce delay in milliseconds before firing the search request.
	 * @default 150
	 */
	readonly debounceMs?: number;
	/**
	 * Minimum query length before firing a request.
	 * @default 1
	 */
	readonly minLength?: number;
	/**
	 * Whether fetching is enabled.
	 * @default true
	 */
	readonly enabled?: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────

/**
 * Debounced autocomplete hook for AACsearch.
 *
 * Waits 150ms (configurable) after the user stops typing before sending
 * a search request. Uses TanStack Query for caching and deduplication.
 *
 * @param opts - Suggestion configuration.
 * @returns Suggestions with loading state.
 */
export function useAACSuggest(opts: UseAACSuggestOptions): {
	suggestions: AACsearchHit[];
	isLoading: boolean;
	isFetching: boolean;
	error: Error | null;
} {
	const {
		baseUrl,
		apiKey,
		indexId,
		q,
		queryBy,
		limit = 5,
		filters,
		debounceMs = 150,
		minLength = 1,
		enabled = true,
	} = opts;

	// ── Debounced query ───────────────────────────────────────────────
	const [debouncedQ, setDebouncedQ] = useState(q);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}
		timerRef.current = setTimeout(() => {
			setDebouncedQ(q);
		}, debounceMs);

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, [q, debounceMs]);

	const shouldSearch = debouncedQ.length >= minLength && enabled;

	const queryKey = [
		"aacsearch-suggest",
		indexId,
		debouncedQ,
		queryBy,
		limit,
		filters ?? "",
	] as const;

	const result = useQuery<AACsearchHit[], Error>({
		queryKey,
		queryFn: async () => {
			const client = new V2SearchClient({ baseUrl, apiKey, indexId });

			const response = (await client.search({
				q: debouncedQ,
				queryBy,
				perPage: limit,
				filterBy: filters,
			})) as { hits: AACsearchHit[] };

			return response.hits ?? [];
		},
		enabled: shouldSearch,
		staleTime: 60_000,
	});

	return {
		suggestions: result.data ?? [],
		isLoading: shouldSearch && result.isLoading,
		isFetching: shouldSearch && result.isFetching,
		error: result.error,
	};
}
