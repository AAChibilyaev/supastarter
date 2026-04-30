// Vanilla JS widget for the @repo/search public endpoint.
// Usage:
//   <script src="https://your-saas/search-widget.js"></script>
//   <script>
//     SupastarterSearch.mount("#my-search", {
//       endpoint: "https://your-saas/api/search/public/products",
//       apiKey: "ss_search_...",
//       queryBy: "title,description",
//     });
//   </script>
(function (global) {
	"use strict";

	function debounce(fn, delay) {
		var timer = null;
		return function () {
			var args = arguments;
			var ctx = this;
			if (timer) clearTimeout(timer);
			timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
		};
	}

	function el(tag, props, children) {
		var node = document.createElement(tag);
		if (props) {
			for (var key in props) {
				if (key === "className") node.className = props[key];
				else if (key === "style") for (var s in props.style) node.style[s] = props.style[s];
				else node.setAttribute(key, props[key]);
			}
		}
		(children || []).forEach(function (child) {
			if (child == null) return;
			node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
		});
		return node;
	}

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	function renderHits(container, hits, options) {
		container.innerHTML = "";
		if (!hits.length) {
			container.appendChild(el("div", { className: "ss-empty" }, ["No results"]));
			return;
		}
		var ul = el("ul", { className: "ss-hits" });
		hits.forEach(function (hit) {
			var doc = hit.document || {};
			var title = doc[options.titleField || "title"] || doc.id || "(untitled)";
			var description = doc[options.descriptionField || "description"];
			var li = el("li", { className: "ss-hit" }, [
				el("strong", null, [String(title)]),
				description ? el("div", { className: "ss-hit-desc" }, [String(description)]) : null,
			]);
			ul.appendChild(li);
		});
		container.appendChild(ul);
	}

	function mount(target, options) {
		var root = typeof target === "string" ? document.querySelector(target) : target;
		if (!root) throw new Error("SupastarterSearch: target not found");
		if (!options || !options.endpoint || !options.apiKey) {
			throw new Error("SupastarterSearch: endpoint and apiKey are required");
		}

		var input = el("input", {
			type: "search",
			className: "ss-input",
			placeholder: options.placeholder || "Search…",
		});
		var results = el("div", { className: "ss-results" });
		root.innerHTML = "";
		root.appendChild(input);
		root.appendChild(results);

		var run = debounce(function () {
			var q = input.value.trim() || "*";
			fetch(options.endpoint, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					authorization: "Bearer " + options.apiKey,
				},
				body: JSON.stringify({
					q: q,
					queryBy: options.queryBy,
					filterBy: options.filterBy,
					facetBy: options.facetBy,
					sortBy: options.sortBy,
					perPage: options.perPage || 10,
					highlightFields: options.highlightFields,
				}),
			})
				.then(function (response) {
					if (!response.ok) throw new Error("HTTP " + response.status);
					return response.json();
				})
				.then(function (data) {
					renderHits(results, data.hits || [], options);
				})
				.catch(function (error) {
					results.innerHTML = "";
					results.appendChild(
						el("div", { className: "ss-error" }, [escapeHtml(error.message)]),
					);
				});
		}, options.debounceMs || 200);

		input.addEventListener("input", run);
		run();

		return {
			destroy: function () {
				input.removeEventListener("input", run);
				root.innerHTML = "";
			},
		};
	}

	global.SupastarterSearch = { mount: mount };
})(typeof window !== "undefined" ? window : this);
