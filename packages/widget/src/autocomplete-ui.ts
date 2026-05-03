/**
 * AACsearch Widget — Autocomplete / Suggestions dropdown
 *
 * Displays a dropdown below the search input with:
 * - Popular query suggestions (max 5)
 * - Category shortcuts (max 3)
 * - Keyboard navigation (up/down/enter/escape)
 *
 * Injects into the Shadow DOM of the parent widget.
 * Config: data-suggestions="true" or WidgetOptions.suggestions = true
 */

export interface SuggestionItem {
	text: string;
	score: number;
	source: string;
	type: string;
	highlights?: Array<{ start: number; end: number }>;
}

export interface SuggestionGroup {
	name: string;
	label: string;
	suggestions: SuggestionItem[];
}

export interface SuggestionsResult {
	suggestions: SuggestionItem[];
	groups: SuggestionGroup[];
	total: number;
}

export type SuggestionFetcher = (q: string) => Promise<SuggestionsResult>;

export interface AutocompleteOptions {
	/** The input element to attach autocomplete to */
	inputEl: HTMLInputElement;
	/** Shadow root for rendering the dropdown */
	shadowRoot: ShadowRoot;
	/** Function to fetch suggestions */
	fetchSuggestions: SuggestionFetcher;
	/** Callback when a suggestion is selected */
	onSelect: (text: string) => void;
	/** Locale for i18n */
	locale: string;
	/** Minimum characters before fetching (default: 2) */
	minChars?: number;
	/** Debounce delay in ms (default: 200) */
	debounceMs?: number;
	/** Max popular suggestions to show (default: 5) */
	maxPopular?: number;
	/** Max category suggestions to show (default: 3) */
	maxCategories?: number;
}

const AUTOCOMPLETE_STYLES = `
.aac-suggestions-wrapper {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  margin-top: 2px;
}

.aac-suggestions-dropdown {
  background: var(--aac-bg, #ffffff);
  border: 1px solid var(--aac-border, #e2e8f0);
  border-radius: var(--aac-radius, 8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  max-height: 400px;
  overflow-y: auto;
}

.aac-suggestions-group-label {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--aac-text-secondary, #64748b);
}

.aac-suggestions-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--aac-text, #1e293b);
  transition: background 0.1s;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.aac-suggestions-item:hover,
.aac-suggestions-item.aac-suggestion-highlighted {
  background: var(--aac-bg-secondary, #f8fafc);
}

.aac-suggestions-item-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: var(--aac-text-secondary, #64748b);
  display: flex;
  align-items: center;
  justify-content: center;
}

.aac-suggestions-item-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aac-suggestions-item-score {
  font-size: 11px;
  color: var(--aac-text-secondary, #64748b);
  flex-shrink: 0;
}

.aac-suggestions-empty {
  padding: 12px;
  font-size: 13px;
  color: var(--aac-text-secondary, #64748b);
  text-align: center;
}

.aac-suggestions-loading {
  padding: 12px;
  font-size: 13px;
  color: var(--aac-text-secondary, #64748b);
  text-align: center;
}
`;

// ─── SVG icons (inline) ────────────────────────────────────────────────

const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const FOLDER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;

export class AutocompleteUI {
	private options: AutocompleteOptions;
	private dropdownEl: HTMLElement | null = null;
	private wrapperEl: HTMLElement | null = null;
	private highlightedIndex = -1;
	private currentItems: Array<{ text: string; type: string }> = [];
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private isOpen = false;
	private abortController: AbortController | null = null;

	constructor(options: AutocompleteOptions) {
		this.options = {
			minChars: 2,
			debounceMs: 200,
			maxPopular: 5,
			maxCategories: 3,
			...options,
		};

		this.attachInputListeners();
		this.injectStyles();
	}

	private get t(): (key: string) => string {
		// Minimal i18n — can be extended
		const translations: Record<string, Record<string, string>> = {
			en: {
				popularQueries: "Popular Searches",
				categories: "Categories",
				noSuggestions: "No suggestions found",
				loading: "Loading...",
			},
			ru: {
				popularQueries: "Популярные запросы",
				categories: "Категории",
				noSuggestions: "Ничего не найдено",
				loading: "Загрузка...",
			},
			de: {
				popularQueries: "Beliebte Suchanfragen",
				categories: "Kategorien",
				noSuggestions: "Keine Vorschläge gefunden",
				loading: "Laden...",
			},
			es: {
				popularQueries: "Búsquedas populares",
				categories: "Categorías",
				noSuggestions: "No se encontraron sugerencias",
				loading: "Cargando...",
			},
			fr: {
				popularQueries: "Recherches populaires",
				categories: "Catégories",
				noSuggestions: "Aucune suggestion trouvée",
				loading: "Chargement...",
			},
		};

		return (key: string): string => {
			return translations[this.options.locale]?.[key] ?? translations["en"]?.[key] ?? key;
		};
	}

	private injectStyles(): void {
		// Only inject once
		if (this.options.shadowRoot.querySelector(".aac-suggestions-wrapper")) return;
		const style = document.createElement("style");
		style.textContent = AUTOCOMPLETE_STYLES;
		this.options.shadowRoot.appendChild(style);
	}

	private attachInputListeners(): void {
		const { inputEl } = this.options;

		inputEl.addEventListener("input", () => {
			this.onInputChange();
		});

		inputEl.addEventListener("keydown", (e) => {
			this.onKeyDown(e);
		});

		inputEl.addEventListener("focus", () => {
			if (inputEl.value.length >= (this.options.minChars ?? 2)) {
				this.fetchAndRender(inputEl.value);
			}
		});

		// Close on blur (delayed to allow click on suggestion)
		inputEl.addEventListener("blur", () => {
			setTimeout(() => this.close(), 200);
		});
	}

	private onInputChange(): void {
		const value = this.options.inputEl.value;

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		if (value.length < (this.options.minChars ?? 2)) {
			this.close();
			return;
		}

		// Show loading state immediately
		if (!this.isOpen) {
			this.showLoading();
		}

		this.debounceTimer = setTimeout(() => {
			this.fetchAndRender(value);
		}, this.options.debounceMs ?? 200);
	}

	private async fetchAndRender(query: string): Promise<void> {
		// Cancel any in-flight request
		if (this.abortController) {
			this.abortController.abort();
		}
		this.abortController = new AbortController();

		try {
			const result = await this.options.fetchSuggestions(query);

			if (!result || result.total === 0) {
				this.showEmpty();
				return;
			}

			this.renderDropdown(result);
		} catch {
			if (!this.isOpen) return;
			this.showEmpty();
		}
	}

	private renderDropdown(result: SuggestionsResult): void {
		this.close();

		const maxPopular = this.options.maxPopular ?? 5;
		const maxCategories = this.options.maxCategories ?? 3;

		// Collect items: popular queries (type: "query") + categories (type: "category")
		const popularItems: Array<{ text: string; type: string }> = [];
		const categoryItems: Array<{ text: string; type: string }> = [];

		for (const group of result.groups) {
			const isCategory = group.name === "categories" || group.name === "category";
			const max = isCategory ? maxCategories : maxPopular;

			for (const suggestion of group.suggestions.slice(0, max)) {
				const item = { text: suggestion.text, type: suggestion.type };
				if (isCategory) {
					categoryItems.push(item);
				} else {
					popularItems.push(item);
				}
			}
		}

		// Also include top-level suggestions that aren't in groups
		const groupedTexts = new Set([
			...popularItems.map((i) => i.text),
			...categoryItems.map((i) => i.text),
		]);

		for (const suggestion of result.suggestions.slice(0, maxPopular)) {
			if (!groupedTexts.has(suggestion.text)) {
				popularItems.push({ text: suggestion.text, type: suggestion.type });
				groupedTexts.add(suggestion.text);
			}
		}

		if (popularItems.length === 0 && categoryItems.length === 0) {
			this.showEmpty();
			return;
		}

		// Build combined list for keyboard navigation
		this.currentItems = [...popularItems, ...categoryItems];
		this.highlightedIndex = -1;

		// Create wrapper
		this.wrapperEl = document.createElement("div");
		this.wrapperEl.className = "aac-suggestions-wrapper";

		const dropdown = document.createElement("div");
		dropdown.className = "aac-suggestions-dropdown";
		dropdown.setAttribute("role", "listbox");
		dropdown.setAttribute("aria-label", "Search suggestions");

		let html = "";

		if (popularItems.length > 0) {
			html += `<div class="aac-suggestions-group-label">${this.t("popularQueries")}</div>`;
			for (const item of popularItems) {
				html += `<button type="button" class="aac-suggestions-item" role="option" data-suggestion-text="${this.escapeAttr(item.text)}">
					<span class="aac-suggestions-item-icon">${SEARCH_ICON}</span>
					<span class="aac-suggestions-item-text">${this.escapeHtml(item.text)}</span>
				</button>`;
			}
		}

		if (categoryItems.length > 0) {
			html += `<div class="aac-suggestions-group-label">${this.t("categories")}</div>`;
			for (const item of categoryItems) {
				html += `<button type="button" class="aac-suggestions-item" role="option" data-suggestion-text="${this.escapeAttr(item.text)}">
					<span class="aac-suggestions-item-icon">${FOLDER_ICON}</span>
					<span class="aac-suggestions-item-text">${this.escapeHtml(item.text)}</span>
				</button>`;
			}
		}

		dropdown.innerHTML = html;
		this.wrapperEl.appendChild(dropdown);
		this.options.shadowRoot.appendChild(this.wrapperEl);
		this.isOpen = true;

		// Click handlers on dropdown items
		dropdown.addEventListener("mousedown", (e) => {
			const btn = (e.target as HTMLElement).closest(
				".aac-suggestions-item",
			) as HTMLElement | null;
			if (btn) {
				const text = btn.getAttribute("data-suggestion-text");
				if (text) {
					e.preventDefault();
					this.selectSuggestion(text);
				}
			}
		});
	}

	private showLoading(): void {
		this.close();
		this.wrapperEl = document.createElement("div");
		this.wrapperEl.className = "aac-suggestions-wrapper";
		const dropdown = document.createElement("div");
		dropdown.className = "aac-suggestions-dropdown";
		dropdown.innerHTML = `<div class="aac-suggestions-loading">${this.t("loading")}</div>`;
		this.wrapperEl.appendChild(dropdown);
		this.options.shadowRoot.appendChild(this.wrapperEl);
		this.isOpen = true;
	}

	private showEmpty(): void {
		this.close();
		this.wrapperEl = document.createElement("div");
		this.wrapperEl.className = "aac-suggestions-wrapper";
		const dropdown = document.createElement("div");
		dropdown.className = "aac-suggestions-dropdown";
		dropdown.innerHTML = `<div class="aac-suggestions-empty">${this.t("noSuggestions")}</div>`;
		this.wrapperEl.appendChild(dropdown);
		this.options.shadowRoot.appendChild(this.wrapperEl);
		this.isOpen = true;
	}

	private close(): void {
		if (this.wrapperEl) {
			this.wrapperEl.remove();
			this.wrapperEl = null;
		}
		this.dropdownEl = null;
		this.isOpen = false;
		this.highlightedIndex = -1;
	}

	private onKeyDown(e: KeyboardEvent): void {
		if (!this.isOpen) return;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				this.highlightNext();
				break;
			case "ArrowUp":
				e.preventDefault();
				this.highlightPrev();
				break;
			case "Enter":
				e.preventDefault();
				this.selectHighlighted();
				break;
			case "Escape":
				e.preventDefault();
				this.close();
				break;
		}
	}

	private highlightNext(): void {
		if (this.currentItems.length === 0) return;
		this.highlightedIndex = (this.highlightedIndex + 1) % this.currentItems.length;
		this.scrollToHighlighted();
	}

	private highlightPrev(): void {
		if (this.currentItems.length === 0) return;
		this.highlightedIndex =
			(this.highlightedIndex - 1 + this.currentItems.length) % this.currentItems.length;
		this.scrollToHighlighted();
	}

	private scrollToHighlighted(): void {
		const items = this.options.shadowRoot.querySelectorAll(".aac-suggestions-item");
		items.forEach((el, i) => {
			el.classList.toggle("aac-suggestion-highlighted", i === this.highlightedIndex);
			if (i === this.highlightedIndex) {
				el.scrollIntoView({ block: "nearest" });
			}
		});
	}

	private selectHighlighted(): void {
		if (this.highlightedIndex >= 0 && this.highlightedIndex < this.currentItems.length) {
			this.selectSuggestion(this.currentItems[this.highlightedIndex].text);
		}
	}

	private selectSuggestion(text: string): void {
		this.options.inputEl.value = text;
		this.close();
		this.options.onSelect(text);
	}

	private escapeHtml(str: string): string {
		const div = document.createElement("div");
		div.textContent = str;
		return div.innerHTML;
	}

	private escapeAttr(str: string): string {
		return str
			.replace(/&/g, "&amp;")
			.replace(/"/g, "&quot;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}

	/** Cleanup */
	destroy(): void {
		this.close();
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		if (this.abortController) {
			this.abortController.abort();
		}
	}
}
