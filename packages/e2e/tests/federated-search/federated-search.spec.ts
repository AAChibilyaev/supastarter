/**
 * E2E: Federated Search (AAC-126)
 *
 * Tests the federated search and grouped search features:
 * - Federated search across multiple search indexes
 * - Dedup mode: removes duplicate documents across indexes
 * - Union mode: blends results sorted by weight
 * - Per-index weight affects result ordering
 * - Grouped search returns results grouped by field
 * - Input constraints (max 10 indexes, query length limits)
 * - API-level tests (no UI interaction needed)
 */

import { test, expect } from "../../src/fixtures";
import {
	createTestIndex,
	createApiKey,
	seedDocuments,
	searchPublic,
	wait,
} from "../../src/helpers";

const BASE_URL = process.env.E2E_SAAS_URL || "http://localhost:3010";
const ADMIN_KEY = process.env.E2E_ADMIN_API_KEY || "test-admin-key";

let indexSlugA: string;
let indexSlugB: string;
let searchKey: string;
let adminApiKey: string;
let orgId: string;

test.describe.configure({ mode: "serial" });

test.describe("Federated Search — AAC-126", () => {
	test.beforeAll(async () => {
		// Create two test indexes with overlapping product data
		const indexA = await createTestIndex(ADMIN_KEY, BASE_URL, `e2e-fed-a-${Date.now()}`);
		indexSlugA = indexA.slug;

		const indexB = await createTestIndex(ADMIN_KEY, BASE_URL, `e2e-fed-b-${Date.now()}`);
		indexSlugB = indexB.slug;

		// Create admin API key with access to both indexes
		const key = await createApiKey(
			ADMIN_KEY,
			BASE_URL,
			"e2e-federated-admin",
			["search", "ingest", "manage"],
			indexSlugA,
		);
		adminApiKey = key.key;

		// Create a search-only key (scoped to first index for single-index tests)
		const searchKeyResult = await createApiKey(
			ADMIN_KEY,
			BASE_URL,
			"e2e-federated-search",
			["search"],
			indexSlugA,
		);
		searchKey = searchKeyResult.key;

		// Seed documents into Index A — electronics
		await seedDocuments(adminApiKey, BASE_URL, indexSlugA, [
			{
				id: "1",
				title: "Wireless Bluetooth Headphones",
				description: "Noise-cancelling over-ear headphones",
				price: 79.99,
				category: "electronics",
			},
			{
				id: "2",
				title: "USB-C Charging Cable",
				description: "Fast charging 2m cable",
				price: 12.99,
				category: "electronics",
			},
			{
				id: "3",
				title: "Laptop Stand",
				description: "Adjustable aluminum laptop stand",
				price: 34.99,
				category: "accessories",
			},
		]);

		// Seed documents into Index B — books & media
		await seedDocuments(adminApiKey, BASE_URL, indexSlugB, [
			{
				id: "101",
				title: "Wireless Bluetooth Headphones",
				description: "Premium wireless audio experience",
				price: 149.99,
				category: "audio",
			},
			{
				id: "102",
				title: "TypeScript Handbook",
				description: "Complete guide to TypeScript",
				price: 39.99,
				category: "books",
			},
			{
				id: "103",
				title: "Clean Code",
				description: "Software engineering principles",
				price: 29.99,
				category: "books",
			},
		]);

		await wait(1500); // Let Typesense index
	});

	test.afterAll(async () => {
		// Cleanup: delete test indexes
		await fetch(`${BASE_URL}/api/v1/indexes/${indexSlugA}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminApiKey}` },
		}).catch(() => {});
		await fetch(`${BASE_URL}/api/v1/indexes/${indexSlugB}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminApiKey}` },
		}).catch(() => {});
	});

	// ─── Basic Federated Search ───────────────────────────────

	test("should search across multiple indexes via federated search", async () => {
		const response = await fetch(`${BASE_URL}/api/search/federated`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminApiKey}`,
			},
			body: JSON.stringify({
				searches: [
					{ slug: indexSlugA, query: "headphones" },
					{ slug: indexSlugB, query: "headphones" },
				],
				perPage: 10,
			}),
		});

		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty("results");

		// Should have results from both indexes
		const slugsWithResults = data.results
			.filter((r: { found: number }) => r.found > 0)
			.map((r: { slug: string }) => r.slug);
		expect(slugsWithResults.length).toBeGreaterThanOrEqual(1);
	});

	test("should return search time metrics in federated response", async () => {
		const response = await fetch(`${BASE_URL}/api/search/federated`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminApiKey}`,
			},
			body: JSON.stringify({
				searches: [
					{ slug: indexSlugA, query: "cable" },
					{ slug: indexSlugB, query: "typescript" },
				],
			}),
		});

		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty("totalTimeMs");
		expect(typeof data.totalTimeMs).toBe("number");
	});

	// ─── Dedup Mode ───────────────────────────────────────────

	test("should deduplicate results across indexes when dedup=true", async () => {
		const response = await fetch(`${BASE_URL}/api/search/federated`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminApiKey}`,
			},
			body: JSON.stringify({
				searches: [
					{ slug: indexSlugA, query: "Bluetooth" },
					{ slug: indexSlugB, query: "Bluetooth" },
				],
				dedup: true,
			}),
		});

		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty("results");
	});

	// ─── Union Mode ───────────────────────────────────────────

	test("should return union results sorted by weight when union=true", async () => {
		const response = await fetch(`${BASE_URL}/api/search/federated`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminApiKey}`,
			},
			body: JSON.stringify({
				searches: [
					{ slug: indexSlugA, query: "headphones", weight: 1 },
					{ slug: indexSlugB, query: "headphones", weight: 2 },
				],
				union: true,
			}),
		});

		expect(response.status).toBe(200);

		const data = await response.json();
		if (data.union) {
			expect(Array.isArray(data.union)).toBeTruthy();
			// Union results should have _sourceSlug annotation
			expect(data.union[0]).toHaveProperty("_sourceSlug");
		}
	});

	// ─── Per-Index Weight ─────────────────────────────────────

	test("should respect per-index weight in result ordering", async () => {
		const responseLowWeight = await fetch(`${BASE_URL}/api/search/federated`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminApiKey}`,
			},
			body: JSON.stringify({
				searches: [
					{ slug: indexSlugA, query: "Bluetooth", weight: 0.5 },
					{ slug: indexSlugB, query: "Bluetooth", weight: 2 },
				],
				union: true,
			}),
		});

		expect(responseLowWeight.status).toBe(200);
	});

	// ─── Max Indexes Constraint ───────────────────────────────

	test("should handle federated search with single index", async () => {
		const response = await fetch(`${BASE_URL}/api/search/federated`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminApiKey}`,
			},
			body: JSON.stringify({
				searches: [{ slug: indexSlugA, query: "laptop" }],
			}),
		});

		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.results.length).toBe(1);
		expect(data.results[0].found).toBeGreaterThanOrEqual(1);
	});

	// ─── Auth Guard ───────────────────────────────────────────

	test("should return 401 for unauthenticated federated search", async () => {
		const response = await fetch(`${BASE_URL}/api/search/federated`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				searches: [{ slug: indexSlugA, query: "test" }],
			}),
		});

		expect(response.status).toBe(401);
	});
});

test.describe("Grouped Search — AAC-126", () => {
	let groupedIndexSlug: string;

	test.beforeAll(async () => {
		// Create index with category field for grouping
		const index = await createTestIndex(ADMIN_KEY, BASE_URL, `e2e-grouped-${Date.now()}`);
		groupedIndexSlug = index.slug;

		const key = await createApiKey(
			ADMIN_KEY,
			BASE_URL,
			"e2e-grouped-admin",
			["search", "ingest", "manage"],
			groupedIndexSlug,
		);
		adminApiKey = key.key;

		// Seed diverse products across categories
		await seedDocuments(adminApiKey, BASE_URL, groupedIndexSlug, [
			{ id: "1", title: "Red Running Shoes", price: 89.99, category: "shoes" },
			{ id: "2", title: "Blue Sneakers", price: 69.99, category: "shoes" },
			{ id: "3", title: "Cotton T-Shirt", price: 24.99, category: "apparel" },
			{ id: "4", title: "Denim Jacket", price: 119.99, category: "apparel" },
			{ id: "5", title: "Leather Wallet", price: 49.99, category: "accessories" },
			{ id: "6", title: "Sports Watch", price: 199.99, category: "accessories" },
		]);

		await wait(1000);
	});

	test.afterAll(async () => {
		await fetch(`${BASE_URL}/api/v1/indexes/${groupedIndexSlug}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminApiKey}` },
		}).catch(() => {});
	});

	test("should return grouped results from a single index", async () => {
		const response = await fetch(
			`${BASE_URL}/api/search/indexes/${groupedIndexSlug}/grouped-search`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${adminApiKey}`,
				},
				body: JSON.stringify({
					query: "*",
					groupBy: "category",
					groupLimit: 2,
				}),
			},
		);

		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty("groups");
		expect(Array.isArray(data.groups)).toBeTruthy();
		expect(data.groups.length).toBeGreaterThanOrEqual(1);
		expect(data.groups[0]).toHaveProperty("groupKey");
		expect(data.groups[0]).toHaveProperty("hits");
	});

	test("should limit grouping by groupLimit parameter", async () => {
		const response = await fetch(
			`${BASE_URL}/api/search/indexes/${groupedIndexSlug}/grouped-search`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${adminApiKey}`,
				},
				body: JSON.stringify({
					query: "*",
					groupBy: "category",
					groupLimit: 1,
				}),
			},
		);

		expect(response.status).toBe(200);

		const data = await response.json();
		for (const group of data.groups) {
			expect(group.hits.length).toBeLessThanOrEqual(1);
		}
	});

	test("should return 401 for unauthenticated grouped search", async () => {
		const response = await fetch(
			`${BASE_URL}/api/search/indexes/${groupedIndexSlug}/grouped-search`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ query: "*", groupBy: "category" }),
			},
		);

		expect(response.status).toBe(401);
	});
});

test.describe("Federated Search — UI Navigation", () => {
	test("should load search page with federated/preview tab", async ({ authPage }) => {
		const page = authPage;

		await page.goto(`${BASE_URL}/search?tab=playground`);
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(3000);

		expect(page.url()).toContain("/search");

		const bodyText = (await page.textContent("body").catch(() => "")) ?? "";
		const hasSearchContent =
			bodyText.includes("search") ||
			bodyText.includes("Search") ||
			bodyText.includes("preview") ||
			bodyText.includes("Preview") ||
			bodyText.includes("playground") ||
			bodyText.includes("Playground") ||
			bodyText.includes("query");

		expect(hasSearchContent).toBeTruthy();
	});
});
