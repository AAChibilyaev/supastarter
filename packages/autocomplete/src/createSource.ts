/**
 * AACSearch autocomplete source adapter for @algolia/autocomplete-js.
 *
 * Wraps {@link @aacsearch/client!SearchClient | SearchClient} into an
 * autocomplete source so you can use AACsearch as a backend for
 * @algolia/autocomplete-js.
 *
 * @example
 * ```typescript
 * import autocomplete from '@algolia/autocomplete-js';
 * import { SearchClient } from '@aacsearch/client';
 * import { createAACsearchSource } from '@aacsearch/autocomplete';
 * const { html } = await import('lit-html');
 *
 * const client = new SearchClient({
 *   baseUrl: 'https://app.aacsearch.com',
 *   apiKey: 'ss_search_****',
 *   indexSlug: 'products',
 * });
 *
 * autocomplete({
 *   container: '#search',
 *   getSources({ query }) {
 *     return [
 *       createAACsearchSource({
 *         client,
 *         indexSlug: 'products',
 *         queryBy: 'name,description',
 *         item: ({ item }) => html\`<div>\${item.document.name}</div>\`,
 *       }),
 *     ];
 *   },
 * });
 * ```
 *
 * @module @aacsearch/autocomplete
 */

import type { SearchClient, SearchHit, SearchParams } from "@aacsearch/client";

// ─── Inline types (matching @algolia/autocomplete-shared) ────────────────

/** Minimal shape of an autocomplete source for @algolia/autocomplete-js. */
export interface AACsearchAutocompleteSource<TItem> {
	sourceId: string;
	getItems(params: { query: string }): TItem[] | Promise<TItem[]>;
	getItemUrl?(params: { item: TItem }): string | undefined;
	templates: {
		item: (params: {
			item: TItem;
			html: (strings: TemplateStringsArray, ...values: unknown[]) => string | Node;
		}) => string | Node;
		header?: (params: {
			items: TItem[];
			html: (strings: TemplateStringsArray, ...values: unknown[]) => string | Node;
		}) => string | Node;
	};
}

// ─── Options ─────────────────────────────────────────────────────────────

/** Options for creating an AACSearch autocomplete source. */
export interface CreateAACsearchSourceOptions<TItem = SearchHit> {
	/** Client instance for making search requests. */
	readonly client: SearchClient;

	/** The public index slug to search against. */
	readonly indexSlug: string;

	/** Comma-separated list of fields to search (query_by). */
	readonly queryBy: string;

	/** Optional filter expression (e.g. "price: [10..100]"). */
	readonly filterBy?: string;

	/** Number of results per page (default: 5). */
	readonly perPage?: number;

	/**
	 * Template for rendering each suggestion item.
	 * Receives the raw AACSearch hit so you can access `item.document.*`.
	 */
	readonly item: (params: {
		item: TItem;
		html: (strings: TemplateStringsArray, ...values: unknown[]) => string | Node;
	}) => string | Node;

	/**
	 * Optional header template rendered above the items list.
	 */
	readonly header?: (params: {
		html: (strings: TemplateStringsArray, ...values: unknown[]) => string | Node;
		items: TItem[];
	}) => string | Node;
}

// ─── Source Factory ──────────────────────────────────────────────────────

/**
 * Creates an autocomplete source that fetches suggestions from AACsearch,
 * compatible with `@algolia/autocomplete-js`.
 *
 * @param opts - Configuration for the source.
 * @returns An object matching the `AutocompleteSource` contract.
 */
export function createAACsearchSource<TItem = SearchHit>(
	opts: CreateAACsearchSourceOptions<TItem>,
): AACsearchAutocompleteSource<TItem> {
	const { client, indexSlug, queryBy, filterBy, perPage = 5, item: itemTemplate, header } = opts;

	const searchParams: SearchParams = {
		queryBy,
		...(filterBy ? { filterBy } : {}),
		perPage,
	};

	return {
		sourceId: indexSlug,

		getItems({ query }) {
			return client
				.search({ ...searchParams, q: query ?? "" })
				.then((result) => result.hits as unknown as TItem[]);
		},

		getItemUrl({ item }) {
			const hit = item as unknown as SearchHit;
			if (hit.document && typeof hit.document === "object") {
				const url = (hit.document as Record<string, unknown>).url;
				if (typeof url === "string") return url;
			}
			return undefined;
		},

		templates: {
			item({ item, html }) {
				return itemTemplate({ item, html });
			},
			...(header
				? {
						header({
							items,
							html,
						}: {
							items: TItem[];
							html: (
								strings: TemplateStringsArray,
								...values: unknown[]
							) => string | Node;
						}) {
							return header({ html, items });
						},
					}
				: {}),
		},
	};
}
