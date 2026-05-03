/**
 * @aacsearch/react — Headless React hooks for AACsearch
 *
 * Three composable hooks for building search UIs:
 *
 * - {@link useAACsearch} — primary search with TanStack Query caching
 * - {@link useAACSuggest} — debounced autocomplete suggestions
 * - {@link useAACFacet} — facet selection state management
 *
 * @example
 * ```typescript
 * import { useAACsearch, useAACSuggest, useAACFacet } from '@aacsearch/react';
 * ```
 *
 * @module @aacsearch/react
 */

export { useAACsearch } from "./use-aac-search";
export type {
	AACsearchHit,
	AACsearchFacetCount,
	AACsearchSearchResult,
	UseAACsearchOptions,
} from "./use-aac-search";

export { useAACSuggest } from "./use-aac-suggest";
export type { UseAACSuggestOptions } from "./use-aac-suggest";

export { useAACFacet } from "./use-aac-facet";
export type { UseAACFacetOptions, UseAACFacetReturn } from "./use-aac-facet";
