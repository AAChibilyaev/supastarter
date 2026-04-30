/**
 * AACsearch Widget — embeddable storefront search UI.
 *
 * Usage:
 *   <script src="https://cdn.aacsearch.com/widget.js"
 *     data-base-url="https://app.aacsearch.com"
 *     data-api-key="ss_search_xxx"
 *     data-index-slug="my-index"
 *     data-container="#aac-search"
 *     data-locale="en"
 *     data-theme="light"
 *   ></script>
 *
 * The widget auto-initializes when the script loads.
 * It uses Shadow DOM for CSS isolation.
 */

import type { WidgetConfig } from "./search-client";
import { createAacSearchClient } from "./search-client";
import { t as translate, resolveLocale } from "./translations";

export interface WidgetOptions {
	baseUrl: string;
	apiKey: string;
	indexSlug: string;
	container: string | HTMLElement;
	locale?: "en" | "ru" | "de" | "es" | "fr";
	theme?: "light" | "dark" | "auto";
	mode?: "inline" | "modal";
	showPrices?: boolean;
	showImages?: boolean;
}

const DEFAULT_OPTIONS: Partial<WidgetOptions> = {
	locale: "en",
	theme: "auto",
	mode: "inline",
	showPrices: true,
	showImages: true,
};

const WIDGET_STYLES = `
:host {
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --aac-primary: #2563eb;
  --aac-primary-hover: #1d4ed8;
  --aac-bg: #ffffff;
  --aac-bg-secondary: #f8fafc;
  --aac-text: #1e293b;
  --aac-text-secondary: #64748b;
  --aac-border: #e2e8f0;
  --aac-radius: 8px;
}

:host([theme="dark"]) {
  --aac-primary: #60a5fa;
  --aac-primary-hover: #93c5fd;
  --aac-bg: #0f172a;
  --aac-bg-secondary: #1e293b;
  --aac-text: #f1f5f9;
  --aac-text-secondary: #94a3b8;
  --aac-border: #334155;
}

.aac-widget-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.aac-search-box {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.aac-search-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid var(--aac-border);
  border-radius: var(--aac-radius);
  font-size: 16px;
  background: var(--aac-bg);
  color: var(--aac-text);
  transition: border-color 0.2s;
}

.aac-search-input:focus {
  outline: none;
  border-color: var(--aac-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.aac-search-input::placeholder {
  color: var(--aac-text-secondary);
}

.aac-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .aac-layout {
    grid-template-columns: 1fr;
  }
}

.aac-facets {
  background: var(--aac-bg-secondary);
  border-radius: var(--aac-radius);
  padding: 16px;
  border: 1px solid var(--aac-border);
}

.aac-facet-group {
  margin-bottom: 20px;
}

.aac-facet-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--aac-text);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.aac-facet-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  cursor: pointer;
  font-size: 14px;
  color: var(--aac-text);
}

.aac-facet-item input[type="checkbox"] {
  accent-color: var(--aac-primary);
}

.aac-facet-count {
  color: var(--aac-text-secondary);
  font-size: 12px;
  margin-left: auto;
}

.aac-results {
  display: grid;
  gap: 16px;
}

.aac-result-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--aac-border);
  border-radius: var(--aac-radius);
  background: var(--aac-bg);
  transition: box-shadow 0.2s;
}

.aac-result-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.aac-result-image {
  width: 100px;
  height: 100px;
  object-fit: contain;
  border-radius: 4px;
  flex-shrink: 0;
}

.aac-result-info {
  flex: 1;
  min-width: 0;
}

.aac-result-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--aac-text);
  margin-bottom: 4px;
  line-height: 1.3;
}

.aac-result-title a {
  color: inherit;
  text-decoration: none;
}

.aac-result-title a:hover {
  color: var(--aac-primary);
}

.aac-result-sku {
  font-size: 12px;
  color: var(--aac-text-secondary);
  margin-bottom: 4px;
}

.aac-result-description {
  font-size: 14px;
  color: var(--aac-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.aac-result-price {
  font-size: 18px;
  font-weight: 700;
  color: var(--aac-primary);
  margin-top: 8px;
}

.aac-result-sale-price {
  font-size: 18px;
  font-weight: 700;
  color: #dc2626;
}

.aac-result-original-price {
  font-size: 14px;
  color: var(--aac-text-secondary);
  text-decoration: line-through;
  margin-left: 8px;
}

.aac-result-categories {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.aac-result-category {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--aac-bg-secondary);
  border-radius: 12px;
  color: var(--aac-text-secondary);
  border: 1px solid var(--aac-border);
}

.aac-no-results {
  text-align: center;
  padding: 48px 16px;
  color: var(--aac-text-secondary);
  font-size: 16px;
}

.aac-stats {
  font-size: 13px;
  color: var(--aac-text-secondary);
  margin-bottom: 16px;
}

.aac-loading {
  text-align: center;
  padding: 48px;
  color: var(--aac-text-secondary);
}

.aac-pagination {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.aac-page-btn {
  padding: 8px 12px;
  border: 1px solid var(--aac-border);
  border-radius: 4px;
  background: var(--aac-bg);
  color: var(--aac-text);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.aac-page-btn:hover {
  border-color: var(--aac-primary);
  color: var(--aac-primary);
}

.aac-page-btn.active {
  background: var(--aac-primary);
  color: white;
  border-color: var(--aac-primary);
}

.aac-page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.aac-sort-select {
  padding: 8px 12px;
  border: 1px solid var(--aac-border);
  border-radius: var(--aac-radius);
  background: var(--aac-bg);
  color: var(--aac-text);
  font-size: 14px;
  margin-bottom: 16px;
}

.aac-error {
  text-align: center;
  padding: 24px;
  color: #dc2626;
  background: #fef2f2;
  border-radius: var(--aac-radius);
  border: 1px solid #fecaca;
}
`;

interface SearchState {
	query: string;
	results: Array<{
		document: Record<string, unknown>;
		highlights?: unknown[];
	}>;
	found: number;
	page: number;
	perPage: number;
	facetCounts: Array<{
		field_name: string;
		counts: Array<{ value: string; count: number }>;
	}>;
	searchTimeMs: number;
	loading: boolean;
	error: string | null;
	filters: Record<string, string[]>;
	sortBy: string;
}

function formatPrice(price: number, currency = "USD", locale = "en"): string {
	try {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency,
		}).format(price);
	} catch {
		return `${currency} ${price.toFixed(2)}`;
	}
}

function escapeHtml(str: string | undefined | null): string {
	if (str === undefined || str === null) return "";
	const div = document.createElement("div");
	div.textContent = String(str);
	return div.innerHTML;
}

function highlightText(text: string, highlights?: unknown[]): string {
	if (!highlights || !Array.isArray(highlights)) return escapeHtml(text);

	let result = escapeHtml(text);
	for (const h of highlights) {
		const hl = h as { field?: string; snippets?: string[]; matched_tokens?: string[] };
		if (hl.snippets) {
			for (const snippet of hl.snippets) {
				// Replace <mark> tags from Typesense highlighting
				result = snippet;
			}
		}
	}
	return result;
}

export class AacSearchWidget {
	private options: WidgetOptions;
	private root: ShadowRoot;
	private state: SearchState;
	private containerEl: HTMLElement;
	private locale: string;

	private t(key: import("./translations").TranslationKey): string {
		return translate(this.locale, key);
	}

	constructor(options: WidgetOptions) {
		this.options = { ...DEFAULT_OPTIONS, ...options } as WidgetOptions;
		this.locale = resolveLocale(this.options.locale);

		// Resolve container
		this.containerEl =
			typeof this.options.container === "string"
				? (document.querySelector(this.options.container) as HTMLElement)
				: this.options.container;

		if (!this.containerEl) {
			throw new Error(`AACsearch Widget: container "${this.options.container}" not found`);
		}

		// Create Shadow DOM
		const host = document.createElement("div");
		host.setAttribute("theme", this.options.theme ?? "auto");
		this.containerEl.appendChild(host);
		this.root = host.attachShadow({ mode: "open" });

		// Initial state
		this.state = {
			query: "",
			results: [],
			found: 0,
			page: 1,
			perPage: 20,
			facetCounts: [],
			searchTimeMs: 0,
			loading: false,
			error: null,
			filters: {},
			sortBy: "",
		};

		// Render and attach events
		this.render();
		this.attachEvents();
	}

	private async doSearch(page = 1): Promise<void> {
		if (!this.state.query && page > 1) return;

		this.state = { ...this.state, loading: true, error: null, page };
		this.render();

		try {
			const client = createAacSearchClient({
				baseUrl: this.options.baseUrl,
				apiKey: this.options.apiKey,
				indexSlug: this.options.indexSlug,
			});

			// Build filter expression from selected facets
			const filterParts: string[] = [];
			for (const [field, values] of Object.entries(this.state.filters)) {
				if (values.length > 0) {
					filterParts.push(`${field}: [${values.map((v) => `\`${v}\``).join(", ")}]`);
				}
			}

			const response = await client.search([
				{
					indexName: this.options.indexSlug,
					params: {
						query: this.state.query || "*",
						hitsPerPage: this.state.perPage,
						page: page - 1,
						filterBy: filterParts.length > 0 ? filterParts.join(" && ") : undefined,
						sortBy: this.state.sortBy || undefined,
						facets: ["brand", "categories", "availability"],
					},
				},
			]);

			const result = response.results[0];

			// Parse hits from our format — hits are full documents + highlights
			const mappedHits = (result.hits as unknown as Array<Record<string, unknown>>).map(
				(h) => {
					// In our format, hits come as objects with document nested
					const doc = (h as { document?: Record<string, unknown> }).document ?? h;
					const highlights = (h as { _highlightResult?: unknown[] })._highlightResult;
					return {
						document: doc,
						highlights: Array.isArray(highlights) ? highlights : undefined,
					};
				},
			);

			this.state = {
				...this.state,
				results: mappedHits,
				found: result.nbHits,
				perPage: result.hitsPerPage,
				loading: false,
				searchTimeMs: result.processingTimeMS,
				error: null,
				page,
				facetCounts: this.parseFacets(result.facets ?? {}),
			};
		} catch (err) {
			this.state = {
				...this.state,
				loading: false,
				error: err instanceof Error ? err.message : this.t("error"),
			};
		}

		this.render();
	}

	private parseFacets(
		facets: Record<string, Record<string, number>>,
	): SearchState["facetCounts"] {
		return Object.entries(facets).map(([field_name, counts]) => ({
			field_name,
			counts: Object.entries(counts).map(([value, count]) => ({ value, count })),
		}));
	}

	private toggleFilter(field: string, value: string): void {
		const current = this.state.filters[field] ?? [];
		const idx = current.indexOf(value);
		const next = idx >= 0 ? current.filter((v) => v !== value) : [...current, value];

		this.state = {
			...this.state,
			filters: { ...this.state.filters, [field]: next },
		};
		this.doSearch(1);
	}

	private setSortBy(sortBy: string): void {
		this.state = { ...this.state, sortBy };
		this.doSearch(1);
	}

	private attachEvents(): void {
		// Search input (debounced)
		const input = this.root.querySelector(".aac-search-input") as HTMLInputElement | null;
		if (input) {
			let timeout: ReturnType<typeof setTimeout> | null = null;
			input.addEventListener("input", () => {
				if (timeout) clearTimeout(timeout);
				timeout = setTimeout(() => {
					this.state = { ...this.state, query: input.value };
					this.doSearch(1);
				}, 300);
			});
		}

		// Sort select
		const sortSelect = this.root.querySelector(".aac-sort-select") as HTMLSelectElement | null;
		if (sortSelect) {
			sortSelect.addEventListener("change", () => {
				this.setSortBy(sortSelect.value);
			});
		}

		// Pagination (delegated)
		const pagination = this.root.querySelector(".aac-pagination");
		if (pagination) {
			pagination.addEventListener("click", (e) => {
				const btn = (e.target as HTMLElement).closest(
					".aac-page-btn",
				) as HTMLElement | null;
				if (!btn || btn.hasAttribute("disabled")) return;
				const page = parseInt(btn.getAttribute("data-page") ?? "1", 10);
				this.doSearch(page);
			});
		}

		// Facet checkboxes (delegated)
		const facets = this.root.querySelector(".aac-facets");
		if (facets) {
			facets.addEventListener("change", (e) => {
				const checkbox = e.target as HTMLInputElement | null;
				if (!checkbox || checkbox.type !== "checkbox") return;
				const field = checkbox.getAttribute("data-field");
				const value = checkbox.getAttribute("data-value");
				if (field && value) {
					this.toggleFilter(field, value);
				}
			});
		}
	}

	private totalPages(): number {
		return Math.max(1, Math.ceil(this.state.found / this.state.perPage));
	}

	private renderPagination(): string {
		const total = this.totalPages();
		const current = this.state.page;
		if (total <= 1) return "";

		const pages: number[] = [];
		const range = 2;
		for (let i = Math.max(1, current - range); i <= Math.min(total, current + range); i++) {
			pages.push(i);
		}

		let html = '<div class="aac-pagination">';

		if (current > 1) {
			html += `<button class="aac-page-btn" data-page="${current - 1}">&laquo; ${this.t("prev")}</button>`;
		}

		if (pages[0] > 1) {
			html += `<button class="aac-page-btn" data-page="1">1</button>`;
			if (pages[0] > 2) html += `<span class="aac-page-btn" disabled>...</span>`;
		}

		for (const p of pages) {
			html += `<button class="aac-page-btn ${p === current ? "active" : ""}" data-page="${p}">${p}</button>`;
		}

		if (pages[pages.length - 1] < total) {
			if (pages[pages.length - 1] < total - 1)
				html += `<span class="aac-page-btn" disabled>...</span>`;
			html += `<button class="aac-page-btn" data-page="${total}">${total}</button>`;
		}

		if (current < total) {
			html += `<button class="aac-page-btn" data-page="${current + 1}">${this.t("next")} &raquo;</button>`;
		}

		html += "</div>";
		return html;
	}

	private renderFacets(): string {
		if (this.state.facetCounts.length === 0) return "";

		let html = '<div class="aac-facets">';

		for (const facet of this.state.facetCounts) {
			if (facet.counts.length === 0) continue;

			const label = facet.field_name
				.replace(/_/g, " ")
				.replace(/\b\w/g, (c) => c.toUpperCase());

			html += `<div class="aac-facet-group">`;
			html += `<div class="aac-facet-title">${escapeHtml(label)}</div>`;

			const selected = this.state.filters[facet.field_name] ?? [];
			for (const count of facet.counts.slice(0, 10)) {
				const checked = selected.includes(count.value) ? "checked" : "";
				html += `<label class="aac-facet-item">`;
				html += `<input type="checkbox" ${checked} data-field="${escapeHtml(facet.field_name)}" data-value="${escapeHtml(count.value)}" />`;
				html += `<span>${escapeHtml(count.value)}</span>`;
				html += `<span class="aac-facet-count">${count.count}</span>`;
				html += `</label>`;
			}

			html += `</div>`;
		}

		html += "</div>";
		return html;
	}

	private renderResults(): string {
		if (this.state.loading) {
			return `<div class="aac-loading">${this.t("loading")}</div>`;
		}

		if (this.state.error) {
			return `<div class="aac-error">${escapeHtml(this.state.error)}</div>`;
		}

		if (this.state.query && this.state.results.length === 0) {
			return `<div class="aac-no-results">${this.t("noResults")}</div>`;
		}

		if (!this.state.query && this.state.results.length === 0) {
			return `<div class="aac-no-results">${this.t("startTyping")}</div>`;
		}

		const queryWord = this.state.query || "*";
		let html = "";

		// Stats
		html += `<div class="aac-stats">${this.state.found} ${this.t("results")} "${escapeHtml(queryWord)}" in ${this.state.searchTimeMs}ms</div>`;

		// Sort
		html += `<select class="aac-sort-select">`;
		html += `<option value="">${this.t("relevance")}</option>`;
		html += `<option value="price:asc" ${this.state.sortBy === "price:asc" ? "selected" : ""}>${this.t("priceLowHigh")}</option>`;
		html += `<option value="price:desc" ${this.state.sortBy === "price:desc" ? "selected" : ""}>${this.t("priceHighLow")}</option>`;
		html += `<option value="created_at:desc" ${this.state.sortBy === "created_at:desc" ? "selected" : ""}>${this.t("newest")}</option>`;
		html += "</select>";

		// Results
		html += '<div class="aac-results">';
		for (const hit of this.state.results) {
			const doc = hit.document as Record<string, unknown>;
			const title = (doc.title as string) ?? this.t("untitled");
			const sku = doc.sku as string | undefined;
			const description = doc.description as string | undefined;
			const price = doc.price as number | undefined;
			const salePrice = doc.sale_price as number | undefined;
			const imageUrl = doc.image_url as string | undefined;
			const productUrl = doc.product_url as string | undefined;
			const categories = doc.categories as string[] | undefined;
			const availability = doc.availability as string | undefined;

			html += '<div class="aac-result-card">';

			if (imageUrl && this.options.showImages) {
				html += `<img class="aac-result-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" />`;
			}

			html += '<div class="aac-result-info">';

			if (productUrl) {
				html += `<div class="aac-result-title"><a href="${escapeHtml(productUrl)}" target="_blank" rel="noopener">${highlightText(title)}</a></div>`;
			} else {
				html += `<div class="aac-result-title">${highlightText(title)}</div>`;
			}

			if (sku)
				html += `<div class="aac-result-sku">${this.t("sku")}: ${escapeHtml(sku)}</div>`;

			if (description) {
				const desc =
					description.length > 200 ? description.slice(0, 200) + "..." : description;
				html += `<div class="aac-result-description">${escapeHtml(desc)}</div>`;
			}

			if (categories && categories.length > 0) {
				html += '<div class="aac-result-categories">';
				for (const cat of categories.slice(0, 3)) {
					html += `<span class="aac-result-category">${escapeHtml(cat)}</span>`;
				}
				html += "</div>";
			}

			if (this.options.showPrices && price !== undefined) {
				if (salePrice !== undefined && salePrice < price) {
					html += `<div class="aac-result-price"><span class="aac-result-sale-price">${formatPrice(salePrice, undefined, this.locale)}</span><span class="aac-result-original-price">${formatPrice(price, undefined, this.locale)}</span></div>`;
				} else {
					html += `<div class="aac-result-price">${formatPrice(price, undefined, this.locale)}</div>`;
				}
			}

			if (availability) {
				const status =
					availability === "in_stock"
						? this.t("inStock")
						: availability === "out_of_stock"
							? this.t("outOfStock")
							: this.t("preorder");
				const color =
					availability === "in_stock"
						? "#16a34a"
						: availability === "out_of_stock"
							? "#dc2626"
							: "#ca8a04";
				html += `<div style="font-size:12px;color:${color};margin-top:4px">${status}</div>`;
			}

			html += "</div>"; // info
			html += "</div>"; // card
		}
		html += "</div>"; // results

		html += this.renderPagination();

		return html;
	}

	private render(): void {
		const theme: string =
			this.options.theme === "auto"
				? window.matchMedia("(prefers-color-scheme: dark)").matches
					? "dark"
					: "light"
				: (this.options.theme as string);

		const hostEl = this.root.host as HTMLElement;
		hostEl.setAttribute("theme", theme);

		this.root.innerHTML = `
			<style>${WIDGET_STYLES}</style>
			<div class="aac-widget-container">
				<div class="aac-search-box">
				<input
					type="text"
					class="aac-search-input"
					placeholder="${this.t("searchPlaceholder")}"
					value="${escapeHtml(this.state.query)}"
					aria-label="${this.t("searchLabel")}"
				/>
				</div>
				${
					this.state.query || this.state.results.length > 0
						? `<div class="aac-layout">
							${this.renderFacets()}
							<div>
								${this.renderResults()}
							</div>
						</div>`
						: `<div class="aac-no-results">${this.t("startTyping")}</div>`
				}
			</div>
		`;
	}
}

// Auto-initialize on script load
(function autoInit(): void {
	const scripts = document.getElementsByTagName("script");
	const currentScript = scripts[scripts.length - 1];
	const dataset = currentScript?.dataset;

	if (dataset?.baseUrl && dataset?.apiKey && dataset?.indexSlug) {
		const container = dataset.container ?? "#aac-search";

		// Wait for DOM ready
		const init = () => {
			new AacSearchWidget({
				baseUrl: dataset.baseUrl!,
				apiKey: dataset.apiKey!,
				indexSlug: dataset.indexSlug!,
				container,
				mode: (dataset.mode as "inline" | "modal") ?? "inline",
				theme: (dataset.theme as "light" | "dark" | "auto") ?? "auto",
				locale: (dataset.locale as "en" | "ru" | "de" | "es" | "fr") ?? "en",
				showPrices: dataset.showPrices !== "false",
				showImages: dataset.showImages !== "false",
			});
		};

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", init);
		} else {
			init();
		}
	}
})();
