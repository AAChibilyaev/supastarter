/**
 * @aacsearch/react — useAACFacet
 *
 * Client-side facet state management.
 * Derives facet values from a search result and provides `toggle`/`clear`
 * controls for building filter UIs.
 *
 * @example
 * ```typescript
 * const { facetValues, activeValues, toggle, clear } = useAACFacet(
 *   facetCounts,
 *   activeFilters,
 *   (nextFilters) => setActiveFilters(nextFilters),
 * );
 *
 * // In your UI:
 * facetValues?.map((facet) => (
 *   <div key={facet.fieldName}>
 *     <h4>{facet.fieldName}</h4>
 *     {facet.counts.map((c) => (
 *       <button
 *         key={c.value}
 *         onClick={() => toggle(c.value, facet.fieldName)}
 *       >
 *         {c.value} ({c.count})
 *       </button>
 *     ))}
 *   </div>
 * ));
 * ```
 *
 * @module @aacsearch/react
 */

import { useCallback } from "react";

import type { AACsearchFacetCount } from "./use-aac-search";

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Internal: parse the facet filter string (`"[[\"brand: Nike\"]]"` or
 * `"brand: [Nike, Adidas]"`) into a map of field → set of values.
 *
 * Typesense facet filters can be expressed as:
 * - `field: [value1, value2]` — multi-value
 * - `field: value` — single value (NOT using [] syntax)
 * - JSON array syntax `[[\"field: value\"]]`
 */
function parseActiveFilters(filterBy?: string): Map<string, Set<string>> {
	if (!filterBy) return new Map();

	const active = new Map<string, Set<string>>();

	// Try JSON array format first: `[["field: value"]]`
	try {
		const parsed: string[][] = JSON.parse(filterBy);
		for (const group of parsed) {
			for (const entry of group) {
				const colonIdx = entry.indexOf(": ");
				if (colonIdx > 0) {
					const field = entry.slice(0, colonIdx).trim();
					const value = entry.slice(colonIdx + 2).trim();
					if (!active.has(field)) active.set(field, new Set());
					active.get(field)!.add(value);
				}
			}
		}
		return active;
	} catch {
		// Not JSON — parse as Typesense-native syntax
	}

	// Parse Typesense-native syntax: `field: [value1, value2] || field2: value`
	const segments = filterBy.split("&&").map((s) => s.trim());
	for (const segment of segments) {
		const colonIdx = segment.indexOf(": ");
		if (colonIdx < 0) continue;

		const field = segment.slice(0, colonIdx).trim();
		const rawValues = segment.slice(colonIdx + 2).trim();

		// Check for array syntax: `field: [value1, value2]`
		if (rawValues.startsWith("[") && rawValues.endsWith("]")) {
			const inner = rawValues.slice(1, -1);
			const values = inner.split(",").map((v) => v.trim().replace(/^"(.*)"$/, "$1"));
			if (!active.has(field)) active.set(field, new Set());
			for (const v of values) {
				active.get(field)!.add(v);
			}
		} else {
			// Single value: `field: value`
			if (!active.has(field)) active.set(field, new Set());
			active.get(field)!.add(rawValues);
		}
	}

	return active;
}

/**
 * Internal: serialize a map of active filters back to a Typesense
 * filter_by string (using JSON array format for complex filters).
 */
function serializeFilters(active: Map<string, Set<string>>): string | undefined {
	if (active.size === 0) return undefined;

	const groups: string[] = [];
	for (const [field, values] of active) {
		if (values.size === 1) {
			groups.push(`${field}: ${[...values][0]}`);
		} else {
			groups.push(`${field}: [${[...values].map((v) => `"${v}"`).join(", ")}]`);
		}
	}
	return groups.join(" && ");
}

// ─── Hook ────────────────────────────────────────────────────────────────

/**
 * Options for the facet state hook.
 */
export interface UseAACFacetOptions {
	/**
	 * Facet counts from the latest search result (`facetCounts`).
	 * When `undefined`, the hook returns empty values.
	 */
	readonly facetCounts?: AACsearchFacetCount[];
	/**
	 * Current filter expression (`filterBy` value to manage).
	 */
	readonly filterBy?: string;
	/**
	 * Callback invoked when the filter expression changes after a
	 * `toggle` or `clear` call.
	 */
	readonly onFilterChange: (nextFilterBy: string | undefined) => void;
}

/**
 * Return type of `useAACFacet`.
 */
export interface UseAACFacetReturn {
	/**
	 * All available facet values from the search result.
	 * Same shape as `facetCounts` passed in.
	 */
	facetValues: AACsearchFacetCount[] | undefined;
	/**
	 * Map of currently active filters: field name → set of active values.
	 */
	activeValues: Map<string, Set<string>>;
	/**
	 * Toggle a facet value on/off.
	 */
	toggle: (value: string, fieldName: string) => void;
	/**
	 * Clear all active facet filters.
	 */
	clear: () => void;
}

/**
 * Manage facet selection state.
 *
 * Accepts facet counts from a search result and a filter expression,
 * returns toggle/clear controls to build an interactive facet UI.
 *
 * This hook is pure — it reads from `facetCounts` and `filterBy` and
 * calls `onFilterChange` when the user toggles a value. It does not
 * trigger the search itself; wire it to a parent that re-runs
 * `useAACsearch` with the updated filter.
 *
 * @param opts - Facet state configuration.
 * @returns Facet values, active filters, and toggle/clear controls.
 */
export function useAACFacet(opts: UseAACFacetOptions): UseAACFacetReturn {
	const { facetCounts, filterBy, onFilterChange } = opts;

	const activeFilters = parseActiveFilters(filterBy);

	const toggle = useCallback(
		(value: string, fieldName: string) => {
			const next = new Map(activeFilters);
			const currentValues = next.get(fieldName);

			if (currentValues?.has(value)) {
				currentValues.delete(value);
				if (currentValues.size === 0) {
					next.delete(fieldName);
				}
			} else {
				if (!next.has(fieldName)) {
					next.set(fieldName, new Set());
				}
				next.get(fieldName)!.add(value);
			}

			onFilterChange(serializeFilters(next));
		},
		[activeFilters, onFilterChange],
	);

	const clear = useCallback(() => {
		onFilterChange(undefined);
	}, [onFilterChange]);

	return {
		facetValues: facetCounts,
		activeValues: activeFilters,
		toggle,
		clear,
	};
}
