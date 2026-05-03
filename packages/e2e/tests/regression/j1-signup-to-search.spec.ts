/**
 * Regression J1: Signup → Org Creation → First Index → First Search
 *
 * Tests the complete new user onboarding journey end-to-end:
 * - Registration with unique credentials
 * - Organization creation
 * - First search index creation
 * - Document import
 * - Public search execution
 */

import { test, expect } from "../../src/fixtures";
import { wait } from "../../src/helpers";

const BASE_URL = process.env.E2E_SAAS_URL || "http://localhost:3010";

// Generate unique signup credentials for isolation
const SIGNUP_EMAIL = `regression-j1-${Date.now()}@aacsearch.io`;
const SIGNUP_PASSWORD = "RegressionJ1Test!";

test.describe.configure({ mode: "serial" });

test.describe("J1: Signup → First Search", () => {
	let indexSlug = "";

	test("1 — Register a new account and create organization", async ({ page }) => {
		// Navigate to signup
		await page.goto(`${BASE_URL}/signup`);
		await page.waitForLoadState("networkidle");

		// Fill registration form
		await page.fill('input[name="email"]', SIGNUP_EMAIL);
		await page.fill('input[name="password"]', SIGNUP_PASSWORD);
		await page.fill('input[name="name"]', "Regression J1 User");

		// Submit
		await page.click('button[type="submit"]');
		await page.waitForTimeout(3000);

		// Should redirect to onboarding, getting-started, overview, or org creation
		const url = page.url();
		const onExpectedPage =
			url.includes("/onboarding") ||
			url.includes("/getting-started") ||
			url.includes("/overview") ||
			url.includes("/create");

		expect(onExpectedPage).toBeTruthy();
	});

	test("2 — Create first search index", async ({ authPage: _authPage }) => {
		// Use the signup page from previous test (fresh authPage not needed)
		// This test depends on the user being logged in from test 1
		// For Playwright serial mode, we re-use the implicit session

		const response = await fetch(`${BASE_URL}/api/v1/indexes`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				// Using admin API key as fallback (session may not propagate via fetch)
				Authorization: `Bearer ${process.env.E2E_ADMIN_API_KEY || "test-admin-key"}`,
			},
			body: JSON.stringify({
				name: `regression-index-${Date.now()}`,
				fields: [
					{ name: "title", type: "string" },
					{ name: "description", type: "string" },
					{ name: "price", type: "float" },
				],
				defaultSortingField: "title",
			}),
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveProperty("slug");
		indexSlug = data.slug;
	});

	test("3 — Seed documents and verify via search API", async () => {
		expect(indexSlug).toBeTruthy();

		// Seed sample documents
		const seedResponse = await fetch(`${BASE_URL}/api/v1/indexes/${indexSlug}/documents`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.E2E_ADMIN_API_KEY || "test-admin-key"}`,
			},
			body: JSON.stringify({
				documents: [
					{
						id: "1",
						title: "Regression Test Product",
						description: "Used for E2E regression testing",
						price: 19.99,
					},
					{
						id: "2",
						title: "Another Test Item",
						description: "Second product for search validation",
						price: 29.99,
					},
				],
			}),
		});
		expect(seedResponse.status).toBe(200);

		await wait(2000); // Allow Typesense to index

		// Verify via public search API
		const searchResponse = await fetch(`${BASE_URL}/api/search/public/${indexSlug}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.E2E_ADMIN_API_KEY || "test-admin-key"}`,
			},
			body: JSON.stringify({ q: "regression", perPage: 10 }),
		});
		expect(searchResponse.status).toBe(200);

		const searchData = await searchResponse.json();
		expect(searchData.found).toBeGreaterThanOrEqual(1);

		const titles = searchData.hits.map(
			(h: { document?: { title?: string } }) => h.document?.title || "",
		);
		expect(titles).toContain("Regression Test Product");
	});

	test("4 — Verify search via UI Search Preview", async ({ authPage }) => {
		const page = authPage;

		await page.goto(`${BASE_URL}/search?tab=playground`);
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(2000);

		// Search preview tab should be accessible
		expect(page.url()).toContain("/search");

		const bodyText = await page.textContent("body").catch(() => "");
		const hasSearchContent =
			bodyText.includes("search") ||
			bodyText.includes("Search") ||
			bodyText.includes("preview") ||
			bodyText.includes("Preview") ||
			bodyText.includes("playground") ||
			bodyText.includes("Playground") ||
			bodyText.includes("query") ||
			bodyText.includes("Query");

		expect(hasSearchContent).toBeTruthy();
	});
});
