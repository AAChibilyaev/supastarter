/**
 * AACsearch Search Widget — Instant Search + Autocomplete
 *
 * Self-contained JavaScript widget for AACsearch-powered instant search.
 * Works with both [aacsearch_search] and [aacsearch_autocomplete] shortcodes,
 * and the WordPress search page override.
 *
 * @since 1.0.0
 */
(function () {
	"use strict";

	var AACSearchWidget = {
		/**
		 * Global config from wp_head inject.
		 */
		config: window.AACSEARCH_CONFIG || { apiUrl: "", searchKey: "", indexSlug: "" },

		/**
		 * Debounce timer reference.
		 */
		debounceTimer: null,

		/**
		 * Autocomplete state.
		 */
		autocomplete: {
			activeIndex: -1,
			items: [],
			isOpen: false,
		},

		/**
		 * Initialize all AACsearch widgets on the page.
		 */
		init: function () {
			if (!this.config.apiUrl || !this.config.searchKey || !this.config.indexSlug) {
				return;
			}

			this.initSearchContainers();
			this.initAutocompleteContainers();
		},

		/**
		 * Initialize all instant search containers.
		 */
		initSearchContainers: function () {
			var containers = document.querySelectorAll(".aacsearch-wrap");
			for (var i = 0; i < containers.length; i++) {
				this.initSearchContainer(containers[i]);
			}
		},

		/**
		 * Initialize a single search container.
		 */
		initSearchContainer: function (container) {
			var configAttr = container.getAttribute("data-aacsearch-config");
			var containerConfig = {};

			if (configAttr) {
				try {
					containerConfig = JSON.parse(configAttr);
				} catch (e) {
					// Use defaults
				}
			}

			var input = container.querySelector(".aacsearch-input");
			var hitsEl = container.querySelector(".aacsearch-hits");
			var statsEl = container.querySelector(".aacsearch-stats");
			var paginationEl = container.querySelector(".aacsearch-pagination");
			var sortSelect = container.querySelector(".aacsearch-sort-select");
			var categoryList = container.querySelector(".aacsearch-refinement-list");
			var tagList = container.querySelector(".aacsearch-tag-list");

			if (!input || !hitsEl) {
				return;
			}

			var state = {
				query: "",
				page: 1,
				perPage: containerConfig.perPage || 10,
				sortBy: "relevance",
				categories: [],
				tags: [],
				postTypes: containerConfig.postTypes || [],
				loading: false,
			};

			// ─── Event Listeners ─────────────────────────────

			// Search input
			input.addEventListener(
				"input",
				this.debounce(
					function (e) {
						state.query = e.target.value.trim();
						state.page = 1;
						this.performSearch(container, state, hitsEl, statsEl, paginationEl);
					}.bind(this),
					200,
				),
			);

			// Sort dropdown
			if (sortSelect) {
				sortSelect.addEventListener(
					"change",
					function (e) {
						state.sortBy = e.target.value;
						state.page = 1;
						this.performSearch(container, state, hitsEl, statsEl, paginationEl);
					}.bind(this),
				);
			}

			// Category filters
			if (categoryList) {
				categoryList.addEventListener(
					"change",
					function (e) {
						if (e.target.type === "checkbox") {
							var val = e.target.value;
							var idx = state.categories.indexOf(val);
							if (e.target.checked && idx === -1) {
								state.categories.push(val);
							} else if (!e.target.checked && idx !== -1) {
								state.categories.splice(idx, 1);
							}
							state.page = 1;
							this.performSearch(container, state, hitsEl, statsEl, paginationEl);
						}
					}.bind(this),
				);
			}

			// Tag filters
			if (tagList) {
				tagList.addEventListener(
					"change",
					function (e) {
						if (e.target.type === "checkbox") {
							var val = e.target.value;
							var idx = state.tags.indexOf(val);
							if (e.target.checked && idx === -1) {
								state.tags.push(val);
							} else if (!e.target.checked && idx !== -1) {
								state.tags.splice(idx, 1);
							}
							state.page = 1;
							this.performSearch(container, state, hitsEl, statsEl, paginationEl);
						}
					}.bind(this),
				);
			}

			// Pagination delegation
			paginationEl.addEventListener(
				"click",
				function (e) {
					var pageBtn = e.target.closest("[data-page]");
					if (pageBtn) {
						state.page = parseInt(pageBtn.getAttribute("data-page"), 10);
						this.performSearch(container, state, hitsEl, statsEl, paginationEl);
					}
				}.bind(this),
			);

			// ─── Initial Load ────────────────────────────────
			this.loadRefinements(container, categoryList, tagList);
			this.performSearch(container, state, hitsEl, statsEl, paginationEl);
		},

		/**
		 * Load category and tag refinement lists.
		 */
		loadRefinements: function (container, categoryList, tagList) {
			var self = this;
			var url =
				this.config.apiUrl.replace(/\/+$/, "") +
				"/api/projects/" +
				encodeURIComponent(this.config.indexSlug) +
				"/facets";

			fetch(url, {
				headers: {
					Authorization: "Bearer " + this.config.searchKey,
					Accept: "application/json",
				},
			})
				.then(function (res) {
					return res.json();
				})
				.then(function (data) {
					if (data && data.categories && categoryList) {
						self.renderRefinementList(categoryList, data.categories, "categories");
					}
					if (data && data.tags && tagList) {
						self.renderRefinementList(tagList, data.tags, "tags");
					}
				})
				.catch(function () {
					// Facets may not be available — silently continue
				});
		},

		/**
		 * Render a refinement list (checkboxes).
		 */
		renderRefinementList: function (container, items, name) {
			if (!items || items.length === 0) {
				container.innerHTML = '<p style="color:#999;font-size:13px;">None available</p>';
				return;
			}
			var html = "";
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				var label = typeof item === "string" ? item : item.value || item.label || item;
				var count = typeof item === "object" ? item.count || 0 : 0;
				html +=
					"<label>" +
					'<input type="checkbox" name="' +
					name +
					'" value="' +
					this.escapeHtml(label) +
					'" /> ' +
					this.escapeHtml(label) +
					(count > 0 ? ' <span class="aacsearch-facet-count">(' + count + ")</span>" : "") +
					"</label>";
			}
			container.innerHTML = html;
		},

		/**
		 * Perform a search request to the AACsearch API.
		 */
		performSearch: function (container, state, hitsEl, statsEl, paginationEl) {
			var self = this;

			// Loading state
			state.loading = true;
			hitsEl.classList.add("aacsearch-loading");

			var params = {
				q: state.query,
				page: state.page,
				per_page: state.perPage,
				sort_by: state.sortBy,
			};

			if (state.categories.length > 0) {
				params.categories = state.categories.join(",");
			}
			if (state.tags.length > 0) {
				params.tags = state.tags.join(",");
			}
			if (state.postTypes.length > 0) {
				params.post_types = state.postTypes.join(",");
			}

			var baseUrl = this.config.apiUrl.replace(/\/+$/, "");
			var url =
				baseUrl +
				"/api/projects/" +
				encodeURIComponent(this.config.indexSlug) +
				"/search?" +
				this.buildQueryString(params);

			fetch(url, {
				headers: {
					Authorization: "Bearer " + this.config.searchKey,
					Accept: "application/json",
				},
			})
				.then(function (res) {
					if (!res.ok) {
						throw new Error("Search request failed: " + res.status);
					}
					return res.json();
				})
				.then(function (data) {
					state.loading = false;
					hitsEl.classList.remove("aacsearch-loading");

					var hits = data.hits || [];
					var found = data.found || data.total || 0;
					var timeMs = data.took || data.took_ms || 0;
					var page = data.page || state.page;
					var totalPages = data.total_pages || Math.ceil(found / state.perPage) || 1;

					self.renderHits(hitsEl, hits, state.query);
					self.renderStats(statsEl, found, timeMs, state.query);
					self.renderPagination(paginationEl, page, totalPages);
				})
				.catch(function (err) {
					state.loading = false;
					hitsEl.classList.remove("aacsearch-loading");
					hitsEl.innerHTML =
						'<div class="aacsearch-error">' +
						self.escapeHtml("Search error: " + err.message) +
						"</div>";
				});
		},

		/**
		 * Render search result hits.
		 */
		renderHits: function (container, hits, query) {
			if (!hits || hits.length === 0) {
				container.innerHTML =
					'<div class="aacsearch-no-results">' +
					"<p>No results found" +
					(query ? ' for "' + this.escapeHtml(query) + '"' : "") +
					".</p></div>";
				return;
			}

			var html = "";
			for (var i = 0; i < hits.length; i++) {
				var hit = hits[i];
				html += this.renderHitCard(hit, query);
			}
			container.innerHTML = html;
		},

		/**
		 * Render a single hit card.
		 */
		renderHitCard: function (hit, query) {
			var title = hit.post_title || hit.title || "";
			var excerpt = hit.post_excerpt || hit.excerpt || "";
			var content = hit.post_content || "";
			var permalink = hit.permalink || hit.url || "#";
			var thumbnail = hit.thumbnail_url || "";
			var postType = hit.post_type || "";
			var postDate = hit.post_date || "";
			var categories = hit.categories || [];
			var tags = hit.tags || [];

			// Use excerpt, fallback to truncated content
			var displayExcerpt = excerpt || this.truncate(content, 200);

			// Format date
			var dateStr = "";
			if (postDate) {
				try {
					dateStr = new Date(postDate).toLocaleDateString(undefined, {
						year: "numeric",
						month: "short",
						day: "numeric",
					});
				} catch (e) {
					dateStr = postDate;
				}
			}

			// Breadcrumb: category first if available
			var breadcrumb = "";
			if (categories.length > 0) {
				breadcrumb =
					'<div class="aacsearch-hit-breadcrumb">' + this.escapeHtml(categories[0]) + "</div>";
			}

			// Highlight matches in title and excerpt
			if (query) {
				title = this.highlight(title, query);
				displayExcerpt = this.highlight(displayExcerpt, query);
			}

			var typeBadge = postType
				? '<span class="aacsearch-hit-type">' + this.escapeHtml(postType) + "</span>"
				: "";

			return (
				'<article class="aacsearch-hit">' +
				(thumbnail
					? '<a href="' +
						this.escapeHtml(permalink) +
						'" tabindex="-1">' +
						'<img class="aacsearch-hit-thumb" src="' +
						this.escapeHtml(thumbnail) +
						'" alt="" loading="lazy" /></a>'
					: "") +
				'<div class="aacsearch-hit-body">' +
				breadcrumb +
				'<h3 class="aacsearch-hit-title"><a href="' +
				this.escapeHtml(permalink) +
				'">' +
				title +
				"</a></h3>" +
				'<p class="aacsearch-hit-excerpt">' +
				displayExcerpt +
				"</p>" +
				'<div class="aacsearch-hit-meta">' +
				(dateStr ? "<span>" + dateStr + "</span>" : "") +
				typeBadge +
				"</div>" +
				"</div>" +
				"</article>"
			);
		},

		/**
		 * Render search stats.
		 */
		renderStats: function (container, found, timeMs, query) {
			if (!container) {
				return;
			}
			var text = "<strong>" + found + "</strong> result" + (found !== 1 ? "s" : "");
			if (timeMs > 0) {
				text += " found in <strong>" + timeMs + "</strong>ms";
			}
			if (query) {
				text += ' for "' + this.escapeHtml(query) + '"';
			}
			container.innerHTML = text;
		},

		/**
		 * Render pagination.
		 */
		renderPagination: function (container, currentPage, totalPages) {
			if (totalPages <= 1) {
				container.innerHTML = "";
				return;
			}

			var html = "";
			var maxVisible = 7;
			var half = Math.floor(maxVisible / 2);
			var start = Math.max(1, currentPage - half);
			var end = Math.min(totalPages, start + maxVisible - 1);
			if (end - start < maxVisible - 1) {
				start = Math.max(1, end - maxVisible + 1);
			}

			// Previous
			if (currentPage > 1) {
				html += '<a href="#" data-page="' + (currentPage - 1) + '">&laquo; Prev</a>';
			}

			// Pages
			for (var i = start; i <= end; i++) {
				if (i === currentPage) {
					html += '<span class="aacsearch-page-active">' + i + "</span>";
				} else {
					html += '<a href="#" data-page="' + i + '">' + i + "</a>";
				}
			}

			// Next
			if (currentPage < totalPages) {
				html += '<a href="#" data-page="' + (currentPage + 1) + '">Next &raquo;</a>';
			}

			container.innerHTML = html;
		},

		// ─── Autocomplete ────────────────────────────────────────

		/**
		 * Initialize all autocomplete containers.
		 */
		initAutocompleteContainers: function () {
			var containers = document.querySelectorAll(".aacsearch-autocomplete-wrap");
			for (var i = 0; i < containers.length; i++) {
				this.initAutocompleteContainer(containers[i]);
			}
		},

		/**
		 * Initialize a single autocomplete container.
		 */
		initAutocompleteContainer: function (container) {
			var self = this;
			var configAttr = container.getAttribute("data-aacsearch-config");
			var containerConfig = {};

			if (configAttr) {
				try {
					containerConfig = JSON.parse(configAttr);
				} catch (e) {}
			}

			var input = container.querySelector(".aacsearch-autocomplete-input");
			var dropdown = container.querySelector(".aacsearch-autocomplete-dropdown");

			if (!input || !dropdown) {
				return;
			}

			// Input handler with debounce
			input.addEventListener("input", function (e) {
				var query = e.target.value.trim();
				if (query.length < 2) {
					self.closeAutocomplete(dropdown);
					return;
				}

				clearTimeout(self.debounceTimer);
				self.debounceTimer = setTimeout(function () {
					self.fetchAutocomplete(query, containerConfig.queryBy || "post_title", dropdown, input);
				}, 150);
			});

			// Focus: reopen if there's a query
			input.addEventListener("focus", function () {
				if (input.value.trim().length >= 2) {
					dropdown.classList.add("aacsearch-open");
					self.autocomplete.isOpen = true;
				}
			});

			// Keyboard navigation
			input.addEventListener("keydown", function (e) {
				var items = dropdown.querySelectorAll(".aacsearch-autocomplete-item");

				switch (e.key) {
					case "ArrowDown":
						e.preventDefault();
						self.autocomplete.activeIndex = Math.min(
							self.autocomplete.activeIndex + 1,
							items.length - 1,
						);
						self.highlightAutocompleteItem(items, dropdown);
						break;

					case "ArrowUp":
						e.preventDefault();
						self.autocomplete.activeIndex = Math.max(self.autocomplete.activeIndex - 1, -1);
						self.highlightAutocompleteItem(items, dropdown);
						break;

					case "Enter":
						e.preventDefault();
						if (
							self.autocomplete.activeIndex >= 0 &&
							self.autocomplete.items[self.autocomplete.activeIndex]
						) {
							var selected = self.autocomplete.items[self.autocomplete.activeIndex];
							if (selected.permalink) {
								window.location.href = selected.permalink;
							}
						}
						break;

					case "Escape":
						self.closeAutocomplete(dropdown);
						input.blur();
						break;
				}
			});

			// Close on outside click
			document.addEventListener("click", function (e) {
				if (!container.contains(e.target)) {
					self.closeAutocomplete(dropdown);
				}
			});
		},

		/**
		 * Fetch autocomplete results from AACsearch API.
		 */
		fetchAutocomplete: function (query, queryBy, dropdown, input) {
			var self = this;
			var baseUrl = this.config.apiUrl.replace(/\/+$/, "");
			var url =
				baseUrl +
				"/api/projects/" +
				encodeURIComponent(this.config.indexSlug) +
				"/search?" +
				this.buildQueryString({
					q: query,
					per_page: 6,
					query_by: queryBy,
				});

			fetch(url, {
				headers: {
					Authorization: "Bearer " + this.config.searchKey,
					Accept: "application/json",
				},
			})
				.then(function (res) {
					return res.ok ? res.json() : Promise.reject();
				})
				.then(function (data) {
					var hits = data.hits || [];
					self.autocomplete.items = hits;
					self.renderAutocomplete(dropdown, hits, query);
					dropdown.classList.add("aacsearch-open");
					self.autocomplete.isOpen = true;
					self.autocomplete.activeIndex = -1;
				})
				.catch(function () {
					self.closeAutocomplete(dropdown);
				});
		},

		/**
		 * Render autocomplete dropdown items.
		 */
		renderAutocomplete: function (dropdown, items, query) {
			if (!items || items.length === 0) {
				dropdown.innerHTML = '<div class="aacsearch-autocomplete-empty">No suggestions</div>';
				return;
			}

			var html = "";
			for (var i = 0; i < items.length; i++) {
				var hit = items[i];
				var title = hit.post_title || hit.title || "";
				var thumbnail = hit.thumbnail_url || "";
				var category = (hit.categories && hit.categories[0]) || "";
				var postType = hit.post_type || "";
				var permalink = hit.permalink || "#";

				if (query) {
					title = this.highlight(title, query);
				}

				html +=
					'<a href="' +
					this.escapeHtml(permalink) +
					'" class="aacsearch-autocomplete-item" data-index="' +
					i +
					'">' +
					(thumbnail
						? '<img class="aacsearch-autocomplete-thumb" src="' +
							this.escapeHtml(thumbnail) +
							'" alt="" loading="lazy" />'
						: "") +
					'<div class="aacsearch-autocomplete-info">' +
					'<div class="aacsearch-autocomplete-title">' +
					title +
					"</div>" +
					(category
						? '<div class="aacsearch-autocomplete-category">' + this.escapeHtml(category) + "</div>"
						: "") +
					"</div>" +
					(postType
						? '<span class="aacsearch-autocomplete-badge">' + this.escapeHtml(postType) + "</span>"
						: "") +
					"</a>";
			}
			dropdown.innerHTML = html;
		},

		/**
		 * Highlight active autocomplete item and scroll into view.
		 */
		highlightAutocompleteItem: function (items, dropdown) {
			for (var i = 0; i < items.length; i++) {
				items[i].classList.toggle("aacsearch-active", i === this.autocomplete.activeIndex);
			}
			if (this.autocomplete.activeIndex >= 0 && items[this.autocomplete.activeIndex]) {
				items[this.autocomplete.activeIndex].scrollIntoView({ block: "nearest" });
			}
		},

		/**
		 * Close the autocomplete dropdown.
		 */
		closeAutocomplete: function (dropdown) {
			dropdown.classList.remove("aacsearch-open");
			this.autocomplete.isOpen = false;
			this.autocomplete.activeIndex = -1;
		},

		// ─── Utilities ───────────────────────────────────────────

		/**
		 * Highlight query terms in text with <mark> tags.
		 */
		highlight: function (text, query) {
			if (!query || !text) {
				return this.escapeHtml(text);
			}
			var escaped = this.escapeHtml(text);
			var terms = query
				.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
				.split(/\s+/)
				.filter(Boolean);
			if (terms.length === 0) {
				return escaped;
			}
			var pattern = "(" + terms.join("|") + ")";
			return escaped.replace(new RegExp(pattern, "gi"), function (match) {
				return '<mark class="aacsearch-highlight">' + match + "</mark>";
			});
		},

		/**
		 * Escape HTML special characters.
		 */
		escapeHtml: function (str) {
			if (typeof str !== "string") {
				return "";
			}
			var div = document.createElement("div");
			div.appendChild(document.createTextNode(str));
			return div.innerHTML;
		},

		/**
		 * Truncate text to a max length.
		 */
		truncate: function (text, maxLen) {
			if (!text) {
				return "";
			}
			var cleaned = text.replace(/\s+/g, " ").trim();
			if (cleaned.length <= maxLen) {
				return cleaned;
			}
			return cleaned.substring(0, maxLen) + "…";
		},

		/**
		 * Build a query string from params object.
		 */
		buildQueryString: function (params) {
			var parts = [];
			for (var key in params) {
				if (
					params.hasOwnProperty(key) &&
					params[key] !== undefined &&
					params[key] !== null &&
					params[key] !== ""
				) {
					parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
				}
			}
			return parts.join("&");
		},

		/**
		 * Debounce a function call.
		 */
		debounce: function (fn, delay) {
			var timer = null;
			return function () {
				var context = this;
				var args = arguments;
				clearTimeout(timer);
				timer = setTimeout(function () {
					fn.apply(context, args);
				}, delay);
			};
		},
	};

	// ─── Initialize on DOM ready ─────────────────────────────

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function () {
			AACSearchWidget.init();
		});
	} else {
		AACSearchWidget.init();
	}
})();
