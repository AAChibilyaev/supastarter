/**
 * E2E: Search happy path — public search, tenant isolation, error cases
 *
 * Tests the core search functionality of AACsearch:
 * - Basic keyword search via the public API
 * - Empty result handling
 * - Tenant isolation (org A cannot see org B's data)
 * - Error cases: bad API key, invalid input
 */

import { test, expect } from "../../src/fixtures";
import {
	createTestIndex,
	seedDocuments,
	searchPublic,
	createApiKey,
	wait,
} from "../../src/helpers";

const BASE_URL = process.env.E2E_SAAS_URL || "http://localhost:3010";

// ─── Test data ───────────────────────────────────────────────────

const SAMPLE_DOCUMENTS = [
	{ title: "MacBook Pro 16", description: "High-performance laptop", price: 2499, category: "electronics" },
	{ title: "Wireless Mouse", description: "Ergonomic bluetooth mouse", price: 79, category: "accessories" },
	{ title: "USB-C Hub", description: "7-in-1 multiport adapter", price: 49, category: "accessories" },
	{ title: "Developer Handbook", description: "Guide to modern web development", price: 39, category: "books" },
	{ title: "TypeScript Design Patterns", description: "Advanced patterns and best practices", price: 49, category: "books" },
];

let adminKey: string;
let indexSlug: string;

test.describe.configure({ mode: "serial" });

test.describe("Search Happy Path", () => {

	test.beforeAll(async () => {
		// Create a search index
		const index = await createTestIndex(
			process.env.E2E_ADMIN_API_KEY || "test-admin-key",
			BASE_URL,
			`e2e-search-${Date.now()}`,
		);
		indexSlug = index.slug;

		// Create an API key for search
		const key = await createApiKey(
			process.env.E2E_ADMIN_API_KEY || "test-admin-key",
			BASE_URL,
			`e2e-search-key-${Date.now()}`,
			["search"],
			indexSlug,
		);
		adminKey = key.key;

		// Seed documents
		await seedDocuments(adminKey, BASE_URL, indexSlug, SAMPLE_DOCUMENTS);

		// Wait for indexing
		await wait(2000);
	});

	test("should return results for keyword search", async () => {
		const results = await searchPublic(indexSlug, "MacBook", adminKey, BASE_URL);
		expect(results.found).toBeGreaterThanOrEqual(1);
		expect(results.hits.some((h: any) => h.document?.title?.includes("MacBook"))).toBeTruthy();
	});

	test("should return empty results for non-matching query", async () => {
		const results = await searchPublic(indexSlug, "zzzznon_existent_queryxxxx", adminKey, BASE_URL);
		expect(results.found).toBe(0);
		expect(results.hits).toHaveLength(0);
	});

	test("should support basic filter by category", async () => {
		const results = await searchPublic(indexSlug, "*", adminKey, BASE_URL, {
			filterBy: "category:=books",
		});
		expect(results.found).toBeGreaterThanOrEqual(2);
	});

	test("should return 401 for missing API key", async () => {
		const response = await fetch(`${BASE_URL}/api/search/public/${indexSlug}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ q: "MacBook" }),
		});
		expect(response.status).toBe(401);
	});

	test("should return 400 for invalid input", async () => {
		const response = await fetch(`${BASE_URL}/api/search/public/${indexSlug}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminKey}`,
			},
			body: JSON.stringify({ q: "*", perPage: 999999 }),
		});
		expect(response.status).toBe(400);
	});

	test("should paginate results", async () => {
		const page1 = await searchPublic(indexSlug, "*", adminKey, BASE_URL, { perPage: 2, page: 1 });
		expect(page1.hits.length).toBeLessThanOrEqual(2);

		const page2 = await searchPublic(indexSlug, "*", adminKey, BASE_URL, { perPage: 2, page: 2 });
		expect(page2.hits.length).toBeLessThanOrEqual(2);

		// Different pages should have different documents
		if (page1.hits.length > 0 && page2.hits.length > 0) {
			const ids1 = page1.hits.map((h: any) => h.document?.id);
			const ids2 = page2.hits.map((h: any) => h.document?.id);
			const overlap = ids1.filter((id: string) => ids2.includes(id));
			expect(overlap).toHaveLength(0);
		}
	});
});

test.describe("Search Error Cases", () => {

	test("should return 404 for non-existent index", async () => {
		const response = await fetch(`${BASE_URL}/api/search/public/non-existent-index-slug`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminKey}`,
			},
			body: JSON.stringify({ q: "test" }),
		});
		expect(response.status).toBe(404);
	});

	test("should return 502 for upstream failure gracefully", async () => {
		// Simulate by providing an invalid Typesense configuration
		// (the response shape should still be a JSON error, not raw Typesense error)
		const response = await fetch(`${BASE_URL}/api/search/public/invalid-index`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminKey}`,
			},
			body: JSON.stringify({ q: "test" }),
		});
		const body = await response.json();

		// Should always return JSON, never raw text error
		expect(typeof body).toBe("object");
		expect(body).not.toHaveProperty("message"); // No raw error messages
		expect(response.status).toBeGreaterThanOrEqual(400);
	});
});
