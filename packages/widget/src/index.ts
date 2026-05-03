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
	recommendationsMode?: "sidebar" | "modal" | "inline";
	recommendationsLimit?: number;
}

const DEFAULT_OPTIONS: Partial<WidgetOptions> = {
	locale: "en",
	theme: "auto",
	mode: "inline",
	showPrices: true,
	showImages: true,
	recommendationsMode: "sidebar",
	recommendationsLimit: 5,
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
  margin-bottom: 4px;
  border-bottom: 1px solid var(--aac-border);
}

.aac-facet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  cursor: pointer;
  user-select: none;
}

.aac-facet-header:hover {
  opacity: 0.8;
}

.aac-facet-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--aac-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.aac-facet-toggle {
  font-size: 12px;
  color: var(--aac-text-secondary);
  transition: transform 0.2s;
  line-height: 1;
}

.aac-facet-toggle.collapsed {
  transform: rotate(-90deg);
}

.aac-facet-body {
  overflow: hidden;
  transition: max-height 0.25s ease;
  padding-bottom: 12px;
}

.aac-facet-body.collapsed {
  max-height: 0 !important;
  padding-bottom: 0;
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

.aac-color-swatch {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--aac-border);
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
}

.aac-color-swatch-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Mobile filter drawer */
.aac-filter-toggle-btn {
  display: none;
  width: 100%;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: var(--aac-primary);
  color: white;
  border: none;
  border-radius: var(--aac-radius);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.aac-filter-overlay {
  display: none;
}

@media (max-width: 768px) {
  .aac-filter-toggle-btn {
    display: block;
  }

  .aac-facets {
    display: none;
  }

  .aac-facets.mobile-open {
    display: block;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 80vh;
    overflow-y: auto;
    border-radius: 16px 16px 0 0;
    z-index: 1000;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
  }

  .aac-filter-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 999;
  }

  .aac-filter-overlay.visible {
    display: block;
  }
}

.aac-facet-count {
  color: var(--aac-text-secondary);
  font-size: 12px;
  margin-left: auto;
}

/* Price range slider */
.aac-price-range-container {
  padding: 4px 0;
}

.aac-price-range-values {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--aac-text);
  margin-bottom: 12px;
}

.aac-price-min,
.aac-price-max {
  background: var(--aac-bg);
  padding: 2px 8px;
  border: 1px solid var(--aac-border);
  border-radius: 4px;
  font-size: 13px;
}

.aac-price-separator {
  color: var(--aac-text-secondary);
  font-size: 14px;
}

.aac-price-slider-track {
  position: relative;
  height: 36px;
  margin-bottom: 8px;
}

.aac-price-range-input {
  position: absolute;
  left: 0;
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  pointer-events: none;
  top: 50%;
  transform: translateY(-50%);
  margin: 0;
  z-index: 2;
}

.aac-price-range-input::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
  background: var(--aac-border);
}

.aac-price-range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--aac-primary);
  border: 3px solid var(--aac-bg);
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  cursor: pointer;
  pointer-events: all;
  margin-top: -7px;
}

.aac-price-range-input::-moz-range-track {
  height: 6px;
  border-radius: 3px;
  background: var(--aac-border);
}

.aac-price-range-input::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--aac-primary);
  border: 3px solid var(--aac-bg);
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  cursor: pointer;
  pointer-events: all;
}

.aac-price-range-clear {
  font-size: 12px;
  color: var(--aac-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  text-decoration: underline;
}

.aac-price-range-clear:hover {
  opacity: 0.8;
}

/* Show more/less toggle for facet values */
.aac-show-more {
  font-size: 12px;
  color: var(--aac-primary);
  cursor: pointer;
  padding: 6px 0 2px;
  user-select: none;
}

.aac-show-more:hover {
  opacity: 0.8;
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

/* Recommendations: Similar Products button */
.aac-similar-btn {
	display: inline-block;
	margin-top: 8px;
	padding: 6px 12px;
	font-size: 12px;
	font-weight: 600;
	color: var(--aac-primary);
	background: transparent;
	border: 1px solid var(--aac-primary);
	border-radius: var(--aac-radius);
	cursor: pointer;
	transition: all 0.2s;
}
.aac-similar-btn:hover {
	background: var(--aac-primary);
	color: white;
}
.aac-similar-btn.active {
	background: var(--aac-primary);
	color: white;
}

/* Recommendations: Sidebar panel */
.aac-recs-sidebar {
	position: fixed;
	top: 0;
	right: 0;
	width: 380px;
	max-width: 100vw;
	height: 100vh;
	background: var(--aac-bg);
	border-left: 1px solid var(--aac-border);
	box-shadow: -4px 0 20px rgba(0,0,0,0.1);
	z-index: 10000;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	animation: aac-slide-in 0.25s ease;
}
@keyframes aac-slide-in {
	from { transform: translateX(100%); }
	to { transform: translateX(0); }
}
.aac-recs-sidebar-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px;
	border-bottom: 1px solid var(--aac-border);
	font-weight: 700;
	font-size: 16px;
	color: var(--aac-text);
}
.aac-recs-sidebar-close {
	background: none;
	border: none;
	font-size: 20px;
	color: var(--aac-text-secondary);
	cursor: pointer;
	padding: 4px 8px;
	border-radius: 4px;
	line-height: 1;
}
.aac-recs-sidebar-close:hover {
	background: var(--aac-bg-secondary);
	color: var(--aac-text);
}
.aac-recs-sidebar-body {
	flex: 1;
	overflow-y: auto;
	padding: 12px 16px;
}
.aac-recs-sidebar-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0,0,0,0.3);
	z-index: 9999;
}

/* Recommendations: Modal panel */
.aac-recs-modal-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0,0,0,0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10000;
}
.aac-recs-modal {
	background: var(--aac-bg);
	border-radius: 12px;
	width: 600px;
	max-width: 90vw;
	max-height: 80vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	box-shadow: 0 8px 32px rgba(0,0,0,0.2);
	animation: aac-modal-in 0.2s ease;
}
@keyframes aac-modal-in {
	from { opacity: 0; transform: scale(0.95); }
	to { opacity: 1; transform: scale(1); }
}
.aac-recs-modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid var(--aac-border);
	font-weight: 700;
	font-size: 16px;
	color: var(--aac-text);
}
.aac-recs-modal-close {
	background: none;
	border: none;
	font-size: 20px;
	color: var(--aac-text-secondary);
	cursor: pointer;
	padding: 4px 8px;
	border-radius: 4px;
	line-height: 1;
}
.aac-recs-modal-close:hover {
	background: var(--aac-bg-secondary);
	color: var(--aac-text);
}
.aac-recs-modal-body {
	flex: 1;
	overflow-y: auto;
	padding: 16px 20px;
}

/* Recommendations: Inline panel */
.aac-recs-inline {
	margin-top: 16px;
	padding: 16px;
	border: 1px solid var(--aac-border);
	border-radius: var(--aac-radius);
	background: var(--aac-bg-secondary);
}
.aac-recs-inline-title {
	font-weight: 700;
	font-size: 15px;
	color: var(--aac-text);
	margin-bottom: 12px;
}

/* Recommendations: Shared item card */
.aac-recs-item {
	display: flex;
	gap: 12px;
	padding: 10px 0;
	border-bottom: 1px solid var(--aac-border);
}
.aac-recs-item:last-child {
	border-bottom: none;
}
.aac-recs-item-image {
	width: 50px;
	height: 50px;
	object-fit: contain;
	border-radius: 4px;
	flex-shrink: 0;
	background: var(--aac-bg);
}
.aac-recs-item-info {
	flex: 1;
	min-width: 0;
}
.aac-recs-item-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--aac-text);
	margin-bottom: 2px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.aac-recs-item-title a {
	color: inherit;
	text-decoration: none;
}
.aac-recs-item-title a:hover {
	color: var(--aac-primary);
}
.aac-recs-item-price {
	font-size: 14px;
	font-weight: 700;
	color: var(--aac-primary);
}
.aac-recs-item-category {
	font-size: 11px;
	color: var(--aac-text-secondary);
}
.aac-recs-loading,
.aac-recs-empty,
.aac-recs-error {
	padding: 24px;
	text-align: center;
	font-size: 14px;
	color: var(--aac-text-secondary);
}

/* Active filter chips */
.aac-filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}

.aac-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  background: var(--aac-primary);
  color: #ffffff;
  border: none;
  border-radius: 16px;
  cursor: default;
  user-select: none;
  white-space: nowrap;
  line-height: 1.4;
}

.aac-filter-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 14px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;
}

.aac-filter-chip-remove:hover {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.aac-filter-chips-clear {
  font-size: 12px;
  color: var(--aac-text-secondary);
  background: none;
  border: none;
  border-bottom: 1px solid transparent;
  cursor: pointer;
  padding: 2px 0;
  white-space: nowrap;
}

.aac-filter-chips-clear:hover {
  color: var(--aac-primary);
  border-bottom-color: var(--aac-primary);
}
`;

interface SearchState {
	query: string;
	results: Array<{ document: unknown; highlights?: unknown[] }>;
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
	priceRange: { min: number; max: number } | null;
	sortBy: string;
	recommendations: Array<Record<string, unknown>>;
	recommendationsLoading: boolean;
	recommendationsError: string | null;
	recommendationsProductId: string | null;
	recommendationsOpen: boolean;
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

type BatchedEvent = {
	type:
		| "search_query"
		| "zero_results"
		| "result_click"
		| "widget_open"
		| "filter_used"
		| "recommendations_click";
	query?: string;
	productId?: string;
	position?: number;
	filters?: Record<string, unknown>;
	sort?: string;
	sessionId: string;
	locale: string;
	referrer?: string;
};

export class AacSearchWidget {
	private options: WidgetOptions;
	private root: ShadowRoot;
	private state: SearchState;
	private containerEl: HTMLElement;
	private locale: string;
	private sessionId: string;
	private batchQueue: BatchedEvent[] = [];
	private batchTimer: ReturnType<typeof setTimeout> | null = null;
	private static readonly BATCH_DELAY_MS = 500;
	/** Track which facet groups are expanded beyond the default 10-item limit */
	private expandedFacets: Set<string> = new Set();

	private t(key: import("./translations").TranslationKey): string {
		return translate(this.locale, key);
	}

	/**
	 * Enqueue an analytics event. Events are batched for BATCH_DELAY_MS (500ms)
	 * then flushed as a single POST — reducing requests 5-10x vs. one-per-event.
	 * On page unload, flushBeacon() drains the queue via sendBeacon.
	 */
	private trackEvent(payload: {
		type:
			| "search_query"
			| "zero_results"
			| "result_click"
			| "widget_open"
			| "filter_used"
			| "recommendations_click";
		query?: string;
		productId?: string;
		position?: number;
		filters?: Record<string, unknown>;
		sort?: string;
	}): void {
		try {
			this.batchQueue.push({
				...payload,
				sessionId: this.sessionId,
				locale: this.locale,
				referrer: typeof document !== "undefined" ? document.referrer : undefined,
			});
			if (this.batchTimer === null) {
				this.batchTimer = setTimeout(() => {
					this.batchTimer = null;
					this.flushBatch();
				}, AacSearchWidget.BATCH_DELAY_MS);
			}
		} catch {
			// swallow — analytics must never break the widget
		}
	}

	/** Send all queued events in one POST via fetch (normal path). */
	private flushBatch(): void {
		if (this.batchQueue.length === 0) return;
		const events = this.batchQueue.splice(0);
		const url = `${this.options.baseUrl.replace(/\/$/, "")}/api/events/track`;
		try {
			void fetch(url, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${this.options.apiKey}`,
				},
				body: JSON.stringify({ events }),
				keepalive: true,
			}).catch(() => undefined);
		} catch {
			// swallow
		}
	}

	/**
	 * Drain the queue on page unload using sendBeacon (no Authorization header support).
	 * The API key is embedded in the JSON body; events-public.ts accepts it as fallback auth.
	 * Falls back to fetch+keepalive when sendBeacon is unavailable.
	 */
	private flushBeacon(): void {
		if (this.batchTimer !== null) {
			clearTimeout(this.batchTimer);
			this.batchTimer = null;
		}
		if (this.batchQueue.length === 0) return;
		const events = this.batchQueue.splice(0);
		const url = `${this.options.baseUrl.replace(/\/$/, "")}/api/events/track`;
		try {
			if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
				const blob = new Blob([JSON.stringify({ events, apiKey: this.options.apiKey })], {
					type: "application/json",
				});
				if (navigator.sendBeacon(url, blob)) return;
			}
			// fallback: fetch with keepalive (handles unload in modern browsers)
			void fetch(url, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${this.options.apiKey}`,
				},
				body: JSON.stringify({ events }),
				keepalive: true,
			}).catch(() => undefined);
		} catch {
			// swallow
		}
	}

	constructor(options: WidgetOptions) {
		this.options = { ...DEFAULT_OPTIONS, ...options } as WidgetOptions;
		this.locale = resolveLocale(this.options.locale);
		this.sessionId =
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

		// Resolve container
		this.containerEl =
			typeof this.options.container === "string"
				? (document.querySelector(this.options.container) as HTMLElement)
				: this.options.container;

		if (!this.containerEl) {
			const containerLabel =
				typeof this.options.container === "string"
					? this.options.container
					: this.options.container.id
						? `#${this.options.container.id}`
						: "<HTMLElement>";
			throw new Error(`AACsearch Widget: container "${containerLabel}" not found`);
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
			priceRange: null,
			sortBy: "",
			recommendations: [],
			recommendationsLoading: false,
			recommendationsError: null,
			recommendationsProductId: null,
			recommendationsOpen: false,
		};

		// Render and attach events
		this.render();
		this.attachEvents();
		this.trackEvent({ type: "widget_open" });

		// Flush pending batch on page unload
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", () => {
				if (document.visibilityState === "hidden") this.flushBeacon();
			});
			window.addEventListener("pagehide", () => this.flushBeacon());
		}
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

			// Add price range filter if set
			if (this.state.priceRange !== null) {
				const priceField = this.detectPriceField();
				if (priceField) {
					filterParts.push(`${priceField}:>=${this.state.priceRange.min}`);
					filterParts.push(`${priceField}:<=${this.state.priceRange.max}`);
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

			// Analytics: search_query (and zero_results when applicable).
			// Server also records server-side; widget event carries sessionId
			// + filters + sort that the server-side event doesn't see.
			if (this.state.query) {
				this.trackEvent({
					type: result.nbHits === 0 ? "zero_results" : "search_query",
					query: this.state.query,
					filters: this.state.filters,
					sort: this.state.sortBy || undefined,
				});
			}
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

	/**
	 * Detect the price field name from facet counts or known field patterns.
	 * Returns the field name (e.g. "price", "sale_price") or null if none detected.
	 */
	private detectPriceField(): string | null {
		const pricePatterns = ["price", "sale_price", "cost", "amount", "price_range"];
		// First, check facetCounts for a known price field
		for (const facet of this.state.facetCounts) {
			if (pricePatterns.includes(facet.field_name)) {
				return facet.field_name;
			}
			// Also match field names ending with _price
			if (facet.field_name.endsWith("_price") || facet.field_name.endsWith("_cost")) {
				return facet.field_name;
			}
		}
		// Fallback: if no facet data, assume "price"
		if (
			pricePatterns.some((p) =>
				this.state.results.some((r) => {
					const doc = r.document as Record<string, unknown>;
					return doc[p] !== undefined;
				}),
			)
		) {
			return "price";
		}
		return null;
	}

	/**
	 * Determine sensible price bounds from the current results.
	 * Returns { min, max } or falls back to defaults if no data.
	 */
	private detectPriceBounds(): { min: number; max: number } {
		const priceField = this.detectPriceField();
		if (!priceField) return { min: 0, max: 10000 };

		let min = Infinity;
		let max = -Infinity;
		for (const hit of this.state.results) {
			const doc = hit.document as Record<string, unknown>;
			const val = doc[priceField] as number | undefined;
			if (typeof val === "number" && !Number.isNaN(val)) {
				if (val < min) min = val;
				if (val > max) max = val;
			}
		}

		// Also check sale_price if it's not the primary field
		if (priceField !== "sale_price") {
			for (const hit of this.state.results) {
				const doc = hit.document as Record<string, unknown>;
				const saleVal = doc.sale_price as number | undefined;
				if (typeof saleVal === "number" && !Number.isNaN(saleVal)) {
					if (saleVal < min) min = saleVal;
					if (saleVal > max) max = saleVal;
				}
			}
		}

		if (!Number.isFinite(min) || !Number.isFinite(max)) {
			return { min: 0, max: 10000 };
		}

		// Round to nice numbers: floor min down, ceil max up
		const magnitude = Math.pow(10, Math.floor(Math.log10(max - min || 1)));
		return {
			min: Math.floor(min / magnitude) * magnitude,
			max: Math.ceil(max / magnitude) * magnitude,
		};
	}

	/**
	 * Fetch recommendations (similar products) from the recommendations API.
	 */
	private async fetchRecommendations(productId: string): Promise<void> {
		if (!productId) return;

		this.state = {
			...this.state,
			recommendations: [],
			recommendationsLoading: true,
			recommendationsError: null,
			recommendationsProductId: productId,
			recommendationsOpen: true,
		};
		this.render();

		try {
			const baseUrl = this.options.baseUrl.replace(/\/+$/, "");
			const limit = this.options.recommendationsLimit ?? 5;
			const url = `${baseUrl}/api/v1/recommendations/${encodeURIComponent(this.options.indexSlug)}?product_id=${encodeURIComponent(productId)}&limit=${limit}`;

			const response = await fetch(url, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${this.options.apiKey}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Recommendations API returned ${response.status}`);
			}

			const data = await response.json();
			const products = (data.recommendations ?? data.products ?? data.results ?? []) as Array<
				Record<string, unknown>
			>;

			this.state = {
				...this.state,
				recommendations: products,
				recommendationsLoading: false,
				recommendationsError: null,
			};
		} catch (err) {
			this.state = {
				...this.state,
				recommendations: [],
				recommendationsLoading: false,
				recommendationsError:
					err instanceof Error ? err.message : this.t("recommendationsError"),
			};
		}

		this.render();
	}

	/**
	 * Close the recommendations panel and clear state.
	 */
	private closeRecommendations(): void {
		this.state = {
			...this.state,
			recommendations: [],
			recommendationsLoading: false,
			recommendationsError: null,
			recommendationsProductId: null,
			recommendationsOpen: false,
		};
		this.render();
	}

	/** Render a single recommendations item card. */
	private renderRecommendationsItem(product: Record<string, unknown>): string {
		const title = (product.title as string) ?? this.t("untitled");
		const price = product.price as number | undefined;
		const salePrice = product.sale_price as number | undefined;
		const imageUrl = product.image_url as string | undefined;
		const productUrl = product.product_url as string | undefined;
		const categories = product.categories as string[] | undefined;
		const _productId =
			(product.external_id as string | undefined) ?? (product.id as string | undefined);

		let html = '<div class="aac-recs-item">';

		if (imageUrl) {
			html += `<img class="aac-recs-item-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" />`;
		}

		html += '<div class="aac-recs-item-info">';

		if (productUrl) {
			html += `<div class="aac-recs-item-title"><a href="${escapeHtml(productUrl)}" target="_blank" rel="noopener">${escapeHtml(title)}</a></div>`;
		} else {
			html += `<div class="aac-recs-item-title">${escapeHtml(title)}</div>`;
		}

		if (categories && categories.length > 0) {
			html += `<div class="aac-recs-item-category">${escapeHtml(categories[0])}</div>`;
		}

		if (price !== undefined) {
			if (salePrice !== undefined && salePrice < price) {
				html += `<div class="aac-recs-item-price"><span style="color:#dc2626">${formatPrice(salePrice, undefined, this.locale)}</span> <span style="text-decoration:line-through;color:var(--aac-text-secondary);font-size:12px">${formatPrice(price, undefined, this.locale)}</span></div>`;
			} else {
				html += `<div class="aac-recs-item-price">${formatPrice(price, undefined, this.locale)}</div>`;
			}
		}

		html += "</div>"; // info
		html += "</div>"; // item

		return html;
	}

	/**
	 * Render the recommendations panel for the current mode.
	 * Returns empty string if panel should not be shown.
	 */
	private renderRecommendationsPanel(): string {
		if (!this.state.recommendationsOpen && !this.state.recommendationsLoading) return "";

		const mode = this.options.recommendationsMode ?? "sidebar";

		// Build the body content
		let bodyHtml = "";

		if (this.state.recommendationsLoading) {
			bodyHtml = `<div class="aac-recs-loading">${this.t("recommendationsLoading")}</div>`;
		} else if (this.state.recommendationsError) {
			bodyHtml = `<div class="aac-recs-error">${escapeHtml(this.state.recommendationsError)}</div>`;
		} else if (this.state.recommendations.length === 0) {
			bodyHtml = `<div class="aac-recs-empty">${this.t("noRecommendations")}</div>`;
		} else {
			bodyHtml = '<div class="aac-recs-items">';
			for (const product of this.state.recommendations) {
				bodyHtml += this.renderRecommendationsItem(product as Record<string, unknown>);
			}
			bodyHtml += "</div>";
		}

		const title = this.t("similarProducts");

		if (mode === "sidebar") {
			return `
				<div class="aac-recs-sidebar-overlay" data-action="close-recs"></div>
				<div class="aac-recs-sidebar">
					<div class="aac-recs-sidebar-header">
						<span>${escapeHtml(title)}</span>
						<button class="aac-recs-sidebar-close" data-action="close-recs">&times;</button>
					</div>
					<div class="aac-recs-sidebar-body">${bodyHtml}</div>
				</div>`;
		}

		if (mode === "modal") {
			return `
				<div class="aac-recs-modal-overlay" data-action="close-recs">
					<div class="aac-recs-modal">
						<div class="aac-recs-modal-header">
							<span>${escapeHtml(title)}</span>
							<button class="aac-recs-modal-close" data-action="close-recs">&times;</button>
						</div>
						<div class="aac-recs-modal-body">${bodyHtml}</div>
					</div>
				</div>`;
		}

		// Inline mode
		return `
			<div class="aac-recs-inline">
				<div class="aac-recs-inline-title">${escapeHtml(title)}</div>
				${bodyHtml}
			</div>`;
	}

	private toggleFilter(field: string, value: string): void {
		const current = this.state.filters[field] ?? [];
		const idx = current.indexOf(value);
		const next = idx >= 0 ? current.filter((v) => v !== value) : [...current, value];

		this.state = {
			...this.state,
			filters: { ...this.state.filters, [field]: next },
		};
		this.trackEvent({
			type: "filter_used",
			filters: { [field]: next },
			query: this.state.query || undefined,
		});
		void this.doSearch(1);
	}

	private setSortBy(sortBy: string): void {
		this.state = { ...this.state, sortBy };
		void this.doSearch(1);
	}

	/**
	 * Set the price range filter and re-search.
	 * Pass null to clear the price filter.
	 */
	private setPriceRange(range: { min: number; max: number } | null): void {
		this.state = { ...this.state, priceRange: range };
		this.trackEvent({
			type: "filter_used",
			filters: { price_range: range ? [`${range.min}-${range.max}`] : [] },
			query: this.state.query || undefined,
		});
		void this.doSearch(1);
	}

	private renderPriceRangeSlider(): string {
		const priceField = this.detectPriceField();
		if (!priceField) return "";

		const bounds = this.detectPriceBounds();
		const currentMin = this.state.priceRange?.min ?? bounds.min;
		const currentMax = this.state.priceRange?.max ?? bounds.max;

		return `
			<div class="aac-facet-group">
				<div class="aac-facet-header" data-facet-field="__price_range__">
					<span class="aac-facet-title">Price</span>
					<span class="aac-facet-toggle">−</span>
				</div>
				<div class="aac-facet-body" data-facet-field="__price_range__">
					<div class="aac-price-range-container">
						<div class="aac-price-range-values">
							<span class="aac-price-min">${this.formatPriceValue(currentMin)}</span>
							<span class="aac-price-separator">—</span>
							<span class="aac-price-max">${this.formatPriceValue(currentMax)}</span>
						</div>
						<div class="aac-price-slider-track">
							<input
								type="range"
								class="aac-price-range-input aac-price-range-min"
								min="${bounds.min}"
								max="${bounds.max}"
								step="${Math.max(1, Math.round((bounds.max - bounds.min) / 100))}"
								value="${currentMin}"
								aria-label="Minimum price"
							/>
							<input
								type="range"
								class="aac-price-range-input aac-price-range-max"
								min="${bounds.min}"
								max="${bounds.max}"
								step="${Math.max(1, Math.round((bounds.max - bounds.min) / 100))}"
								value="${currentMax}"
								aria-label="Maximum price"
							/>
						</div>
						<button class="aac-price-range-clear" data-action="clear-price">Clear</button>
					</div>
				</div>
			</div>`;
	}

	private formatPriceValue(val: number): string {
		if (val >= 1000000) {
			return `$${(val / 1000000).toFixed(1)}M`;
		}
		if (val >= 1000) {
			return `$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
		}
		if (Number.isInteger(val)) {
			return `$${val}`;
		}
		return `$${val.toFixed(2)}`;
	}

	/**
	 * Check if a field name is a price-related field that should use the range slider.
	 */
	private isPriceField(fieldName: string): boolean {
		const pricePatterns = ["price", "sale_price", "cost", "amount", "price_range"];
		return (
			pricePatterns.includes(fieldName) ||
			fieldName.endsWith("_price") ||
			fieldName.endsWith("_cost")
		);
	}

	/**
	 * Render active filter chips — pills showing currently selected filters with remove button.
	 * Only shown when at least one filter or price range is active.
	 */
	private renderFilterChips(): string {
		const activeFilters: Array<{ field: string; label: string; value: string }> = [];

		// Collect active text/checkbox filters
		for (const [field, values] of Object.entries(this.state.filters)) {
			if (values.length > 0) {
				const groupLabel = field
					.replace(/_/g, " ")
					.replace(/\b\w/g, (c) => c.toUpperCase());
				for (const val of values) {
					activeFilters.push({ field, label: groupLabel, value: val });
				}
			}
		}

		// Add price range chip if active
		const hasPriceChip = this.state.priceRange !== null;

		if (activeFilters.length === 0 && !hasPriceChip) return "";

		let html = '<div class="aac-filter-chips">';

		for (const chip of activeFilters) {
			html += `<span class="aac-filter-chip" data-chip-field="${escapeHtml(chip.field)}" data-chip-value="${escapeHtml(chip.value)}">`;
			html += `${escapeHtml(chip.label)}: ${escapeHtml(chip.value)}`;
			html += `<button class="aac-filter-chip-remove" data-chip-remove="${escapeHtml(chip.field)}" data-chip-remove-value="${escapeHtml(chip.value)}" aria-label="Remove ${escapeHtml(chip.label)}: ${escapeHtml(chip.value)}">&times;</button>`;
			html += `</span>`;
		}

		// Price range chip
		if (hasPriceChip && this.state.priceRange) {
			html += `<span class="aac-filter-chip" data-chip-field="__price__" data-chip-value="${this.state.priceRange.min}-${this.state.priceRange.max}">`;
			html += `Price: ${this.formatPriceValue(this.state.priceRange.min)} - ${this.formatPriceValue(this.state.priceRange.max)}`;
			html += `<button class="aac-filter-chip-remove" data-chip-remove="__price__" aria-label="Remove price filter">&times;</button>`;
			html += `</span>`;
		}

		// Clear all button
		html += `<button class="aac-filter-chips-clear" data-action="clear-all-filters">Clear all</button>`;

		html += "</div>";
		return html;
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
					void this.doSearch(1);
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
				void this.doSearch(page);
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

		// Result clicks (delegated) — fires `result_click` analytics event
		// before the browser navigates via the <a target="_blank">.
		const resultsRoot = this.root.querySelector(".aac-results");
		if (resultsRoot) {
			resultsRoot.addEventListener("click", (e) => {
				const card = (e.target as HTMLElement).closest(
					".aac-result-card",
				) as HTMLElement | null;
				if (!card) return;
				const productId = card.getAttribute("data-product-id") ?? undefined;
				const position = Number(card.getAttribute("data-position") ?? "0");
				this.trackEvent({
					type: "result_click",
					productId: productId || undefined,
					position: position > 0 ? position : undefined,
					query: this.state.query || undefined,
				});
			});
		}

		// Recommendations: "Similar Products" button clicks
		this.root.addEventListener("click", (e) => {
			const btn = (e.target as HTMLElement).closest(
				"[data-action='show-recs']",
			) as HTMLElement | null;
			if (!btn) return;
			const productId = btn.getAttribute("data-product-id");
			if (productId) {
				// If clicking the already-active product, toggle off
				if (
					this.state.recommendationsProductId === productId &&
					this.state.recommendationsOpen
				) {
					this.closeRecommendations();
				} else {
					this.trackEvent({
						type: "recommendations_click",
						productId: productId,
						query: this.state.query || undefined,
					});
					void this.fetchRecommendations(productId);
				}
			}
		});

		// Recommendations: close buttons (sidebar overlay, modal overlay, close buttons)
		this.root.addEventListener("click", (e) => {
			const closeEl = (e.target as HTMLElement).closest(
				"[data-action='close-recs']",
			) as HTMLElement | null;
			if (closeEl) {
				this.closeRecommendations();
			}
		});

		// Facet header toggle (collapse/expand)
		const facetsContainer = this.root.querySelector(".aac-facets");
		if (facetsContainer) {
			facetsContainer.addEventListener("click", (e) => {
				const header = (e.target as HTMLElement).closest(
					".aac-facet-header",
				) as HTMLElement | null;
				if (!header) return;
				const field = header.getAttribute("data-facet-field");
				if (!field) return;
				const body = this.root.querySelector(
					`.aac-facet-body[data-facet-field="${field}"]`,
				) as HTMLElement | null;
				const toggle = header.querySelector(".aac-facet-toggle") as HTMLElement | null;
				if (body && toggle) {
					body.classList.toggle("collapsed");
					toggle.classList.toggle("collapsed");
					toggle.textContent = toggle.classList.contains("collapsed") ? "+" : "−";
				}
			});
		}

		// Show more/less toggle for facets with 10+ values
		if (facetsContainer) {
			facetsContainer.addEventListener("click", (e) => {
				const showMore = (e.target as HTMLElement).closest(
					".aac-show-more",
				) as HTMLElement | null;
				if (!showMore) return;
				const field = showMore.getAttribute("data-show-more");
				if (!field) return;

				if (this.expandedFacets.has(field)) {
					this.expandedFacets.delete(field);
				} else {
					this.expandedFacets.add(field);
				}
				this.render();
			});
		}

		// Mobile filter toggle
		const filterToggle = this.root.querySelector("#aac-filter-toggle") as HTMLElement | null;
		const filterOverlay = this.root.querySelector("#aac-filter-overlay") as HTMLElement | null;
		if (filterToggle && filterOverlay) {
			filterToggle.addEventListener("click", () => {
				facetsContainer?.classList.toggle("mobile-open");
				filterOverlay.classList.toggle("visible");
			});
			filterOverlay.addEventListener("click", () => {
				facetsContainer?.classList.remove("mobile-open");
				filterOverlay.classList.remove("visible");
			});
		}

		// Price range slider (delegated to facets container)
		if (facetsContainer) {
			let priceTimer: ReturnType<typeof setTimeout> | null = null;

			facetsContainer.addEventListener("input", (e) => {
				const target = e.target as HTMLInputElement | null;
				if (!target || target.type !== "range") return;

				const isMin = target.classList.contains("aac-price-range-min");
				const isMax = target.classList.contains("aac-price-range-max");
				if (!isMin && !isMax) return;

				// Update displayed values immediately
				const container = target.closest(
					".aac-price-range-container",
				) as HTMLElement | null;
				if (container) {
					const minValEl = container.querySelector(
						".aac-price-min",
					) as HTMLElement | null;
					const maxValEl = container.querySelector(
						".aac-price-max",
					) as HTMLElement | null;

					// Get current values from both sliders
					const minInput = container.querySelector(
						".aac-price-range-min",
					) as HTMLInputElement | null;
					const maxInput = container.querySelector(
						".aac-price-range-max",
					) as HTMLInputElement | null;

					if (minInput && maxInput) {
						const minVal = Math.min(
							parseInt(minInput.value, 10),
							parseInt(maxInput.value, 10),
						);
						const maxVal = Math.max(
							parseInt(minInput.value, 10),
							parseInt(maxInput.value, 10),
						);

						// Prevent handles from crossing
						if (isMin && parseInt(target.value, 10) > parseInt(maxInput.value, 10)) {
							target.value = String(parseInt(maxInput.value, 10));
						} else if (
							isMax &&
							parseInt(target.value, 10) < parseInt(minInput.value, 10)
						) {
							target.value = String(parseInt(minInput.value, 10));
						}

						if (minValEl) minValEl.textContent = this.formatPriceValue(minVal);
						if (maxValEl) maxValEl.textContent = this.formatPriceValue(maxVal);
					}
				}

				// Debounced search
				if (priceTimer !== null) clearTimeout(priceTimer);
				priceTimer = setTimeout(() => {
					priceTimer = null;
					const minInput = this.root.querySelector(
						".aac-price-range-min",
					) as HTMLInputElement | null;
					const maxInput = this.root.querySelector(
						".aac-price-range-max",
					) as HTMLInputElement | null;
					if (minInput && maxInput) {
						const minVal = parseInt(minInput.value, 10);
						const maxVal = parseInt(maxInput.value, 10);
						this.setPriceRange({
							min: Math.min(minVal, maxVal),
							max: Math.max(minVal, maxVal),
						});
					}
				}, 400);
			});

			// Clear price range
			facetsContainer.addEventListener("click", (e) => {
				const btn = (e.target as HTMLElement).closest(
					".aac-price-range-clear",
				) as HTMLElement | null;
				if (!btn) return;
				this.setPriceRange(null);
			});
		}

		// Filter chip remove — delegate on widget root
		this.root.addEventListener("click", (e) => {
			const removeBtn = (e.target as HTMLElement).closest(
				"[data-chip-remove]",
			) as HTMLElement | null;
			if (!removeBtn) return;
			const field = removeBtn.getAttribute("data-chip-remove");
			if (!field) return;

			if (field === "__price__") {
				this.setPriceRange(null);
				return;
			}

			const value = removeBtn.getAttribute("data-chip-remove-value");
			if (value === null) return;

			// Uncheck the corresponding checkbox in the facet panel so UI stays in sync
			const checkbox = this.root.querySelector(
				`input[type="checkbox"][data-field="${escapeHtml(field)}"][data-value="${escapeHtml(value)}"]`,
			) as HTMLInputElement | null;
			if (checkbox) checkbox.checked = false;

			this.toggleFilter(field, value);
		});

		// Clear all filters
		this.root.addEventListener("click", (e) => {
			const clearBtn = (e.target as HTMLElement).closest(
				"[data-action='clear-all-filters']",
			) as HTMLElement | null;
			if (!clearBtn) return;

			// Clear text filters
			const hasFilters = Object.values(this.state.filters).some((v) => v.length > 0);
			if (hasFilters) {
				this.state = { ...this.state, filters: {} };
			}

			// Clear price range
			if (this.state.priceRange !== null) {
				this.state = { ...this.state, priceRange: null };
			}

			// Uncheck all facet checkboxes
			this.root.querySelectorAll('input[type="checkbox"][data-field]').forEach((el) => {
				(el as HTMLInputElement).checked = false;
			});

			this.trackEvent({ type: "filter_used", filters: {} });
			void this.doSearch(1);
		});
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

		// Price range slider first if applicable
		if (this.detectPriceField()) {
			html += this.renderPriceRangeSlider();
		}

		for (const facet of this.state.facetCounts) {
			if (facet.counts.length === 0) continue;

			const fieldName = facet.field_name;

			// Skip price fields — they're rendered as a range slider above
			if (this.isPriceField(fieldName)) continue;
			const label = fieldName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

			// Detect color facet by field name suffix or common color field names
			const isColorFacet =
				fieldName.endsWith("_color") ||
				fieldName.endsWith("_colour") ||
				fieldName === "color" ||
				fieldName === "colour";

			const selected = this.state.filters[fieldName] ?? [];
			const isOpen = selected.length > 0;

			html += `<div class="aac-facet-group">`;
			html += `<div class="aac-facet-header" data-facet-field="${fieldName}">`;
			html += `<span class="aac-facet-title">${escapeHtml(label)}</span>`;
			html += `<span class="aac-facet-toggle ${isOpen ? "" : "collapsed"}">${isOpen ? "−" : "+"}</span>`;
			html += `</div>`;
			html += `<div class="aac-facet-body ${isOpen ? "" : "collapsed"}" data-facet-field="${fieldName}">`;

			// Determine how many values to show (10 by default, all if expanded)
			const isExpanded = this.expandedFacets.has(fieldName);
			const visibleCount = isExpanded ? facet.counts.length : 10;
			const _remaining = facet.counts.length - 10;

			for (const count of facet.counts.slice(0, visibleCount)) {
				const checked = selected.includes(count.value) ? "checked" : "";

				if (isColorFacet) {
					// Color swatch rendering
					const colorHex = count.value.toLowerCase();
					const isHex = /^#?[0-9a-f]{3,8}$/.test(colorHex.replace("#", ""));
					const bgColor = isHex
						? `background-color: ${colorHex.startsWith("#") ? colorHex : `#${colorHex}`}`
						: `background-image: linear-gradient(135deg, #f0f0f0, #d0d0d0)`;
					html += `<label class="aac-facet-item">`;
					html += `<input type="checkbox" ${checked} data-field="${escapeHtml(fieldName)}" data-value="${escapeHtml(count.value)}" />`;
					html += `<span class="aac-color-swatch-wrapper">`;
					html += `<span class="aac-color-swatch" style="${bgColor}"></span>`;
					html += `<span>${escapeHtml(count.value)}</span>`;
					html += `</span>`;
					html += `<span class="aac-facet-count">${count.count}</span>`;
					html += `</label>`;
				} else {
					// Standard text checkbox
					html += `<label class="aac-facet-item">`;
					html += `<input type="checkbox" ${checked} data-field="${escapeHtml(fieldName)}" data-value="${escapeHtml(count.value)}" />`;
					html += `<span>${escapeHtml(count.value)}</span>`;
					html += `<span class="aac-facet-count">${count.count}</span>`;
					html += `</label>`;
				}
			}

			// Show "Show more/less" link if there are more than 10 values
			if (facet.counts.length > 10) {
				const showMoreText = isExpanded
					? `Show less`
					: `Show all ${facet.counts.length}...`;
				html += `<div class="aac-show-more" data-show-more="${fieldName}">${showMoreText}</div>`;
			}

			html += `</div>`; // facet-body
			html += `</div>`; // facet-group
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
		let position = (this.state.page - 1) * this.state.perPage + 1;
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
			const productId =
				(doc.external_id as string | undefined) ?? (doc.id as string | undefined);

			html += `<div class="aac-result-card" data-product-id="${escapeHtml(productId ?? "")}" data-position="${position}">`;
			position++;

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

			// Similar Products button
			if (productId && this.options.recommendationsMode) {
				const isActive =
					this.state.recommendationsProductId === productId &&
					this.state.recommendationsOpen;
				html += `<button class="aac-similar-btn ${isActive ? "active" : ""}" data-action="show-recs" data-product-id="${escapeHtml(productId)}">${this.t("similarProducts")}</button>`;
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

		const mode = this.options.recommendationsMode ?? "sidebar";
		const isOverlay = mode === "sidebar" || mode === "modal";
		const showRecs = this.state.recommendationsOpen || this.state.recommendationsLoading;

		// For sidebar/modal: recommendations panel renders at root level (above widget-container)
		// For inline: recommendations panel renders inside the results area
		const recsHtml = showRecs && isOverlay ? this.renderRecommendationsPanel() : "";

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
				${this.renderFilterChips()}
				${
					this.state.query || this.state.results.length > 0
						? `<button class="aac-filter-toggle-btn" id="aac-filter-toggle">Filters</button>
							<div class="aac-filter-overlay" id="aac-filter-overlay"></div>
							<div class="aac-layout">
								${this.renderFacets()}
								<div>
									${this.renderResults()}
									${showRecs && !isOverlay ? this.renderRecommendationsPanel() : ""}
								</div>
							</div>`
						: `<div class="aac-no-results">${this.t("startTyping")}</div>`
				}
			</div>
			${recsHtml}
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
				recommendationsMode:
					(dataset.recommendationsMode as "sidebar" | "modal" | "inline") ?? "sidebar",
				recommendationsLimit: dataset.recommendationsLimit
					? parseInt(dataset.recommendationsLimit, 10)
					: 5,
			});
		};

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", init);
		} else {
			init();
		}
	}
})();
