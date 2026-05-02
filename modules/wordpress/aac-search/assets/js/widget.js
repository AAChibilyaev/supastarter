/**
 * AACsearch Live Search Widget — JavaScript
 *
 * Provides a click-triggered modal search overlay that queries
 * the AACsearch Typesense API directly with debounced input.
 *
 * @package AACsearch
 * @version 1.0.0
 */
(function () {
	"use strict";

	var config = window.AACSearch || {};
	if (!config.projectId || !config.apiUrl) {
		return;
	}

	var state = {
		open: false,
		query: "",
		results: [],
		loading: false,
		debounceTimer: null,
		abortController: null,
	};

	var overlay = null;
	var trigger = null;

	// ─── DOM Creation ──────────────────────────────────────────

	function createTrigger() {
		trigger = document.createElement("button");
		trigger.className = "aacsearch-widget-trigger";
		trigger.setAttribute("aria-label", "Search");
		trigger.innerHTML =
			'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
		trigger.addEventListener("click", openWidget);
		document.body.appendChild(trigger);
	}

	function createOverlay() {
		overlay = document.createElement("div");
		overlay.className = "aacsearch-widget-overlay";
		overlay.style.display = "none";
		overlay.innerHTML =
			'<div class="aacsearch-widget-container">' +
			'<button class="aacsearch-widget-close" aria-label="Close search">&times;</button>' +
			'<div class="aacsearch-widget-header">' +
			'<input type="text" class="aacsearch-widget-input" placeholder="Search..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />' +
			"</div>" +
			'<div class="aacsearch-widget-results"></div>' +
			"</div>";

		// Close on overlay click (but not on container click)
		overlay.addEventListener("click", function (e) {
			if (e.target === overlay) {
				closeWidget();
			}
		});

		// Close button
		var closeBtn = overlay.querySelector(".aacsearch-widget-close");
		closeBtn.addEventListener("click", closeWidget);

		// Input handler
		var input = overlay.querySelector(".aacsearch-widget-input");
		input.addEventListener("input", function () {
			state.query = input.value.trim();
			debouncedSearch();
		});

		// Keyboard shortcuts
		input.addEventListener("keydown", function (e) {
			if (e.key === "Escape") {
				closeWidget();
			}
		});

		document.body.appendChild(overlay);
	}

	// ─── Search ────────────────────────────────────────────────

	function debouncedSearch() {
		if (state.debounceTimer) {
			clearTimeout(state.debounceTimer);
		}

		if (state.query.length < 2) {
			renderResults([]);
			return;
		}

		state.debounceTimer = setTimeout(performSearch, 300);
	}

	function performSearch() {
		if (state.abortController) {
			state.abortController.abort();
		}

		state.abortController = new AbortController();
		state.loading = true;
		renderResults([]);

		var searchUrl =
			config.apiUrl.replace(/\/+$/, "") +
			"/api/public/" +
			encodeURIComponent(config.projectId) +
			"/search";

		fetch(searchUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				q: state.query,
				query_by: "title,description,sku,tags,categories",
				per_page: 10,
				locale: config.locale || "en",
			}),
			signal: state.abortController.signal,
		})
			.then(function (resp) {
				if (!resp.ok) {
					throw new Error("Search request failed");
				}
				return resp.json();
			})
			.then(function (data) {
				state.loading = false;
				var hits = data && data.hits ? data.hits : [];
				renderResults(hits);
			})
			.catch(function (err) {
				if (err.name === "AbortError") {
					return; // Suppress abort errors
				}
				state.loading = false;
				renderResults([]);
				console.error("AACsearch search error:", err);
			});
	}

	// ─── Render ────────────────────────────────────────────────

	function renderResults(hits) {
		var container = overlay.querySelector(".aacsearch-widget-results");
		if (!container) return;

		if (state.loading) {
			container.innerHTML =
				'<div class="aacsearch-widget-loader">' +
				'<div class="aacsearch-widget-spinner"></div>' +
				"</div>";
			return;
		}

		if (hits.length === 0 && state.query.length >= 2) {
			container.innerHTML =
				'<div class="aacsearch-widget-empty">No results found for "' +
				escapeHtml(state.query) +
				'"</div>';
			return;
		}

		if (hits.length === 0) {
			container.innerHTML =
				'<div class="aacsearch-widget-empty">Start typing to search...</div>';
			return;
		}

		var html = "";
		hits.forEach(function (hit) {
			var doc = hit.document || {};
			var title = escapeHtml(doc.title || "");
			var description = escapeHtml((doc.description || "").substring(0, 120));
			var imageUrl = doc.image_url ? escapeHtml(doc.image_url) : "";
			var productUrl = doc.product_url ? escapeHtml(doc.product_url) : "#";
			var price = doc.price ? "$" + parseFloat(doc.price).toFixed(2) : "";

			html += '<a href="' + productUrl + '" class="aacsearch-widget-result-item">';

			if (imageUrl) {
				html +=
					'<img src="' +
					imageUrl +
					'" alt="' +
					title +
					'" class="aacsearch-widget-result-image" />';
			}

			html += '<div class="aacsearch-widget-result-content">';
			html += '<div class="aacsearch-widget-result-title">' + title + "</div>";
			if (description) {
				html +=
					'<div class="aacsearch-widget-result-description">' + description + "</div>";
			}
			html += "</div>";

			if (price) {
				html += '<div class="aacsearch-widget-result-price">' + price + "</div>";
			}

			html += "</a>";
		});

		container.innerHTML = html;
	}

	// ─── Open / Close ──────────────────────────────────────────

	function openWidget() {
		if (state.open) return;
		state.open = true;

		if (!overlay) {
			createOverlay();
		}

		overlay.style.display = "flex";

		// Focus input after a brief delay for animation
		setTimeout(function () {
			var input = overlay.querySelector(".aacsearch-widget-input");
			if (input) input.focus();
		}, 100);

		// Lock body scroll
		document.body.style.overflow = "hidden";

		// Global escape
		document.addEventListener("keydown", handleGlobalKeydown);
	}

	function closeWidget() {
		if (!state.open) return;
		state.open = false;

		if (overlay) {
			overlay.style.display = "none";
		}

		// Restore body scroll
		document.body.style.overflow = "";

		// Reset state
		state.query = "";
		if (state.abortController) {
			state.abortController.abort();
		}
		if (state.debounceTimer) {
			clearTimeout(state.debounceTimer);
		}

		document.removeEventListener("keydown", handleGlobalKeydown);
	}

	function handleGlobalKeydown(e) {
		if (e.key === "Escape") {
			closeWidget();
		}
	}

	// ─── Utilities ─────────────────────────────────────────────

	function escapeHtml(str) {
		if (!str) return "";
		var div = document.createElement("div");
		div.appendChild(document.createTextNode(str));
		return div.innerHTML;
	}

	// ─── Initialize ────────────────────────────────────────────

	function init() {
		createTrigger();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
