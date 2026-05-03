export interface EntryPointContext {
	entryPoint: "home" | "catalog" | "search_results" | "product_card";
	productId?: string;
	productTitle?: string;
	categorySlug?: string;
	searchQuery?: string;
}

function extractFromDataAttribute(attr: string): string | undefined {
	const el = document.querySelector(`[data-${attr}]`);
	return el?.getAttribute(`data-${attr}`) ?? undefined;
}

function extractFromMeta(name: string): string | undefined {
	const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
	return el?.getAttribute("content") ?? undefined;
}

function extractFromUrl(param: string): string | undefined {
	try {
		return new URL(window.location.href).searchParams.get(param) ?? undefined;
	} catch {
		return undefined;
	}
}

export function detectEntryPoint(overrides?: Partial<EntryPointContext>): EntryPointContext {
	if (overrides?.entryPoint) {
		return {
			entryPoint: overrides.entryPoint,
			productId: overrides.productId,
			productTitle: overrides.productTitle,
			categorySlug: overrides.categorySlug,
			searchQuery: overrides.searchQuery,
		};
	}

	// Detect from page context
	const productId =
		extractFromDataAttribute("product-id") ??
		extractFromMeta("product:id") ??
		extractFromUrl("product_id");

	const categorySlug =
		extractFromDataAttribute("category-slug") ??
		extractFromMeta("category:slug") ??
		extractFromUrl("category");

	const searchQuery =
		extractFromDataAttribute("search-query") ??
		extractFromUrl("q") ??
		extractFromUrl("query") ??
		extractFromUrl("search");

	if (productId) {
		return {
			entryPoint: "product_card",
			productId,
			productTitle: extractFromMeta("og:title") ?? document.title,
			categorySlug,
		};
	}

	if (searchQuery) {
		return { entryPoint: "search_results", searchQuery, categorySlug };
	}

	if (categorySlug) {
		return { entryPoint: "catalog", categorySlug };
	}

	return { entryPoint: "home" };
}
