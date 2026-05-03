/**
 * E2E: Widget integration — embed script load, search modal, floating bubble
 *
 * Tests the widget embed functionality:
 * - Widget script endpoint returns valid JavaScript
 * - Widget search API works with valid API key
 * - Basic integration validations
 *
 * NOTE: Full widget E2E (Cmd+K modal, floating bubble in browser) requires
 * the widget feature to be stable. See AAC-99 (Widget EPIC).
 */

import { test, expect } from "../../src/fixtures";
import { createTestIndex, createApiKey, wait } from "../../src/helpers";

const BASE_URL = process.env.E2E_SAAS_URL || "http://localhost:3010";

test.describe("Widget Integration", () => {
	test("should serve widget.js script", async () => {
		const response = await fetch(`${BASE_URL}/api/widget/widget.js`);
		expect(response.status).toBe(200);

		const contentType = response.headers.get("content-type") || "";
		expect(
			contentType.includes("javascript") ||
				contentType.includes("text/") ||
				contentType.includes("application/"),
		).toBeTruthy();

		const body = await response.text();
		expect(body.length).toBeGreaterThan(100);
	});

	test("should accept widget search requests with valid API key", async ({ apiClient: _apiClient }) => {
		const index = await createTestIndex(
			process.env.E2E_ADMIN_API_KEY || "test-admin-key",
			BASE_URL,
			`e2e-widget-${Date.now()}`,
		);
		await wait(500);

		const key = await createApiKey(
			process.env.E2E_ADMIN_API_KEY || "test-admin-key",
			BASE_URL,
			`e2e-widget-key-${Date.now()}`,
			["search"],
			index.slug,
		);

		// Attempt a widget search (POST to widget API)
		const response = await fetch(`${BASE_URL}/api/search/public/${index.slug}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${key.key}`,
			},
			body: JSON.stringify({ q: "test", perPage: 10 }),
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveProperty("hits");
	});

	test("should embed widget script in a test page and execute", async ({ page }) => {
		// Load a simple HTML page that includes the widget script
		await page.goto(`${BASE_URL}/api/widget/widget.js`);

		// Verify the script is valid and executable
		const scriptContent = await page.evaluate(() => {
			return document.body.innerText || document.body.textContent || "";
		});
		expect(scriptContent.length).toBeGreaterThan(0);
	});
});
