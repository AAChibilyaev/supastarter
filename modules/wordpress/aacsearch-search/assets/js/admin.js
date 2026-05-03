/**
 * AACsearch Search — Admin JavaScript
 *
 * Handles AJAX actions for connection testing, reindexing, and log management.
 */
(function ($) {
	"use strict";

	var aacsearch = {
		/**
		 * Initialize admin JS.
		 */
		init: function () {
			this.bindEvents();
		},

		/**
		 * Bind event handlers.
		 */
		bindEvents: function () {
			// Connection test
			$("#aacsearch-test-connection").on("click", function (e) {
				e.preventDefault();
				aacsearch.testConnection();
			});

			// Full reindex
			$("#aacsearch-run-reindex").on("click", function (e) {
				e.preventDefault();
				aacsearch.runReindex();
			});

			// Clear debug log
			$("#aacsearch-clear-log").on("click", function (e) {
				e.preventDefault();
				aacsearch.clearLog();
			});
		},

		/**
		 * Test connection to AACsearch API.
		 */
		testConnection: function () {
			var statusEl = $("#aacsearch-connection-status");

			statusEl.removeClass("success error").addClass("").text(aacsearchAdmin.i18n.testing);

			$.post(
				aacsearchAdmin.ajaxUrl,
				{
					action: "aacsearch_test_connection",
					nonce: aacsearchAdmin.nonce,
				},
				function (response) {
					if (response.success) {
						statusEl
							.addClass("success")
							.text(response.data.message || aacsearchAdmin.i18n.testSuccess);
					} else {
						statusEl
							.addClass("error")
							.text((response.data && response.data.message) || aacsearchAdmin.i18n.testFailed);
					}
				},
			).fail(function () {
				statusEl.addClass("error").text(aacsearchAdmin.i18n.testFailed);
			});
		},

		/**
		 * Run full reindex.
		 */
		runReindex: function () {
			if (!confirm(aacsearchAdmin.i18n.confirmReindex)) {
				return;
			}

			var statusEl = $("#aacsearch-reindex-status");
			var btnEl = $("#aacsearch-run-reindex");

			btnEl.prop("disabled", true);
			statusEl.removeClass("success error").text(aacsearchAdmin.i18n.reindexing);

			$.post(
				aacsearchAdmin.ajaxUrl,
				{
					action: "aacsearch_run_reindex",
					nonce: aacsearchAdmin.nonce,
				},
				function (response) {
					if (response.success) {
						statusEl
							.addClass("success")
							.text(response.message || aacsearchAdmin.i18n.reindexSuccess);
					} else {
						statusEl
							.addClass("error")
							.text(
								response.message ||
									aacsearchAdmin.i18n.error + " " + aacsearchAdmin.i18n.reindexFailed,
							);
					}
				},
			).always(function () {
				btnEl.prop("disabled", false);
			});
		},

		/**
		 * Clear debug log.
		 */
		clearLog: function () {
			var statusEl = $("#aacsearch-clear-log-status");

			statusEl.text("Clearing...");

			$.post(
				aacsearchAdmin.ajaxUrl,
				{
					action: "aacsearch_clear_log",
					nonce: aacsearchAdmin.nonce,
				},
				function (response) {
					if (response.success) {
						statusEl.text(response.data.message || "Log cleared.");
						// Reload the page to show empty log
						location.reload();
					} else {
						statusEl.text((response.data && response.data.message) || "Failed to clear log.");
					}
				},
			).fail(function () {
				statusEl.text("Failed to clear log.");
			});
		},
	};

	$(document).ready(function () {
		aacsearch.init();
	});
})(jQuery);
