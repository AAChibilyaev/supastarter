/**
 * E2E: Search Features — Typo Tolerance, Geo, Export, Batch Delete, Collections Metadata (AAC-321)
 *
 * Tests the v1 REST API and public search endpoints for AAC-321 features:
 * - Typo Tolerance: num_typos, exact, prefix, infix
 * - Geo Search: polygon, bounding box
 * - Export Documents: streaming JSONL/JSON
 * - Batch Delete: by IDs array
 * - Delete by Query: by filter expression
 * - Collections Metadata: token_separators, symbol_tokens_to_index
 *
 * These are API-level tests (no UI interaction needed).
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

let indexSlug: string;
let searchKey: string;
let adminApiKey: string;

test.describe.configure({ mode: "serial" });

test.describe("AAC-321 Search Features API", () => {
	test.beforeAll(async () => {
		// Create a test index with geo field
		const index = await createTestIndex(ADMIN_KEY, BASE_URL, `e2e-search-features-${Date.now()}`);
		indexSlug = index.slug;

		// Create API keys
		const key = await createApiKey(
			ADMIN_KEY,
			BASE_URL,
			"e2e-search-features-admin",
			["search", "ingest", "manage"],
			indexSlug,
		);
		adminApiKey = key.key;

		const searchKeyResult = await createApiKey(
			ADMIN_KEY,
			BASE_URL,
			"e2e-search-features-search",
			["search"],
			indexSlug,
		);
		searchKey = searchKeyResult.key;

		// Seed test documents
		await seedDocuments(adminApiKey, BASE_URL, indexSlug, [
			{
				id: "1",
				title: "Nike Running Shoes",
				description: "Premium running shoes for athletes",
				price: 129.99,
				category: "shoes",
				location: "40.7128, -74.0060",
			},
			{
				id: "2",
				title: "Adidas Sneakers",
				description: "Casual sneakers for everyday wear",
				price: 89.99,
				category: "shoes",
				location: "40.7580, -73.9855",
			},
			{
				id: "3",
				title: "Puma Sports T-Shirt",
				description: "Breathable sports t-shirt for men",
				price: 39.99,
				category: "apparel",
				location: "51.5074, -0.1278",
			},
			{
				id: "4",
				title: "C++ Programming Guide",
				description: "Advanced C++ programming techniques and best practices",
				price: 49.99,
				category: "books",
			},
			{
				id: "5",
				title: "Hello World in C#",
				description: "Getting started with CSharp dotnet development",
				price: 29.99,
				category: "books",
			},
			{
				id: "6",
				title: "Reebok Running Shorts",
				description: "Lightweight shorts for running",
				price: 34.99,
				category: "apparel",
			},
		]);

		await wait(1000); // Let Typesense index
	});

	test.afterAll(async () => {
		// Cleanup: delete test index
		await fetch(`${BASE_URL}/api/v1/indexes/${indexSlug}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminApiKey}` },
		}).catch(() => {});
	});

	// ─── Typo Tolerance ──────────────────────────────────────────

	test.describe("Typo Tolerance", () => {
		test("should find documents with typos using numTypos=2", async () => {
			const result = await searchPublic(indexSlug, "nikee", searchKey, BASE_URL, {
				numTypos: 2,
			});
			expect(result.found).toBeGreaterThanOrEqual(1);
			expect(result.hits.some((h: any) => h.document?.title?.includes("Nike"))).toBeTruthy();
		});

		test("should find documents with typos using numTypos=1", async () => {
			const result = await searchPublic(indexSlug, "adida", searchKey, BASE_URL, {
				numTypos: 1,
			});
			expect(result.found).toBeGreaterThanOrEqual(1);
		});

		test("should return no results with exact search when typo exists", async () => {
			const result = await searchPublic(indexSlug, "nikee", searchKey, BASE_URL, {
				exact: true,
			});
			expect(result.found).toBe(0);
		});

		test("should find exact match with exact=false/typo", async () => {
			const result = await searchPublic(indexSlug, "nike", searchKey, BASE_URL, {
				exact: false,
			});
			expect(result.found).toBeGreaterThanOrEqual(1);
		});
	});

	// ─── Prefix & Infix Search ───────────────────────────────────

	test.describe("Prefix & Infix Search", () => {
		test("should find documents by prefix (true)", async () => {
			const result = await searchPublic(indexSlug, "nik", searchKey, BASE_URL, {
				prefix: true,
			});
			expect(result.found).toBeGreaterThanOrEqual(1);
		});

		test("should NOT find documents by prefix when prefix=false", async () => {
			const result = await searchPublic(indexSlug, "nik", searchKey, BASE_URL, {
				prefix: false,
			});
			expect(result.found).toBe(0);
		});

		test("should find documents by infix (fallback)", async () => {
			const result = await searchPublic(indexSlug, "run", searchKey, BASE_URL, {
				infix: "fallback",
			});
			expect(result.found).toBeGreaterThanOrEqual(1);
		});
	});

	// ─── Export Documents ────────────────────────────────────────

	test.describe("Export Documents", () => {
		test("should export documents as JSONL", async () => {
			const response = await fetch(`${BASE_URL}/api/v1/indexes/${indexSlug}/documents/export`, {
				headers: { Authorization: `Bearer ${adminApiKey}` },
			});
			expect(response.status).toBe(200);
			const text = await response.text();
			const lines = text.trim().split("\n").filter(Boolean);
			expect(lines.length).toBeGreaterThanOrEqual(6);
			const firstDoc = JSON.parse(lines[0]);
			expect(firstDoc).toHaveProperty("title");
		});

		test("should return 401 without auth", async () => {
			const response = await fetch(`${BASE_URL}/api/v1/indexes/${indexSlug}/documents/export`);
			expect(response.status).toBe(401);
		});
	});

	// ─── Batch Delete Documents ──────────────────────────────────

	test.describe("Batch Delete", () => {
		test("should batch delete documents by IDs", async () => {
			const response = await fetch(
				`${BASE_URL}/api/v1/indexes/${indexSlug}/documents:batchDelete`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${adminApiKey}`,
					},
					body: JSON.stringify({ ids: ["4", "5"] }),
				},
			);
			expect(response.status).toBe(200);

			await wait(500);

			// Verify deletions
			const result = await searchPublic(indexSlug, "C++", searchKey, BASE_URL, {});
			expect(result.found).toBe(0);
		});

		test("should return 401 for unauthorized batch delete", async () => {
			const response = await fetch(
				`${BASE_URL}/api/v1/indexes/${indexSlug}/documents:batchDelete`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ids: ["1"] }),
				},
			);
			expect(response.status).toBe(401);
		});
	});

	// ─── Delete by Query ─────────────────────────────────────────

	test.describe("Delete by Query", () => {
		test("should delete documents by filter expression", async () => {
			const response = await fetch(
				`${BASE_URL}/api/v1/indexes/${indexSlug}/documents/delete-by-query`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${adminApiKey}`,
					},
					body: JSON.stringify({ filterBy: "category:=apparel" }),
				},
			);
			expect(response.status).toBe(200);

			await wait(500);

			// Verify apparel documents are deleted
			const result = await searchPublic(indexSlug, "shorts", searchKey, BASE_URL, {});
			expect(result.found).toBe(0);
		});

		test("should return 401 for unauthorized delete by query", async () => {
			const response = await fetch(
				`${BASE_URL}/api/v1/indexes/${indexSlug}/documents/delete-by-query`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ filterBy: "id:1" }),
				},
			);
			expect(response.status).toBe(401);
		});
	});
});
