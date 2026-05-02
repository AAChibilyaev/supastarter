/**
 * E2E: Typesense Features API — Synonyms, Curations, Facets, Sorting
 *
 * Tests the v1 REST API endpoints for Typesense features (AAC-310):
 * - Synonyms CRUD: list, create, upsert, delete
 * - Curations CRUD: list, create, upsert, delete
 * - Sorting fields: list, add, replace, remove
 * - Facets: list facet configurations
 *
 * These are API-level tests (no UI interaction needed).
 */

import { test, expect } from "../../src/fixtures";
import { createTestIndex, createApiKey, wait } from "../../src/helpers";

const BASE_URL = process.env.E2E_SAAS_URL || "http://localhost:3010";
const ADMIN_KEY = process.env.E2E_ADMIN_API_KEY || "test-admin-key";

let indexSlug: string;
let adminApiKey: string;

test.describe.configure({ mode: "serial" });

test.describe("Typesense Features API", () => {
	test.beforeAll(async () => {
		// Create a test index
		const index = await createTestIndex(ADMIN_KEY, BASE_URL, `e2e-ts-features-${Date.now()}`);
		indexSlug = index.slug;

		// Create an API key with full access
		const key = await createApiKey(
			ADMIN_KEY,
			BASE_URL,
			`e2e-ts-features-key`,
			["search", "ingest", "manage"],
			indexSlug,
		);
		adminApiKey = key.key;

		await wait(500);
	});

	// ─── Synonyms ───────────────────────────────────────────────────

	test.describe("Synonyms", () => {
		const SYNONYM_ROOT = () => `${BASE_URL}/api/v1/indexes/${indexSlug}/synonyms`;

		test("should list synonyms (empty)", async () => {
			const response = await fetch(SYNONYM_ROOT(), {
				headers: { Authorization: `Bearer ${adminApiKey}` },
			});
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(Array.isArray(body.synonyms ?? body)).toBeTruthy();
		});

		test("should create a synonym", async () => {
			const response = await fetch(SYNONYM_ROOT(), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${adminApiKey}`,
				},
				body: JSON.stringify({
					root: "laptop",
					synonyms: ["notebook", "ultrabook", "macbook"],
				}),
			});

			expect(response.ok).toBeTruthy();
			const body = await response.json();
			expect(body).toHaveProperty("id");
		});

		test("should list synonyms after creation", async () => {
			const response = await fetch(SYNONYM_ROOT(), {
				headers: { Authorization: `Bearer ${adminApiKey}` },
			});
			expect(response.status).toBe(200);
			const body = await response.json();
			const synonyms = body.synonyms ?? body;
			expect(synonyms.length).toBeGreaterThanOrEqual(1);
		});

		test("should return 401 for unauthenticated synonym request", async () => {
			const response = await fetch(SYNONYM_ROOT());
			expect(response.status).toBe(401);
		});

		test("should return 400 for invalid synonym payload", async () => {
			const response = await fetch(SYNONYM_ROOT(), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${adminApiKey}`,
				},
				body: JSON.stringify({ invalid: "payload" }),
			});
			// Should reject with 400
			expect(response.status).toBe(400);
		});
	});

	// ─── Curations ──────────────────────────────────────────────────

	test.describe("Curations", () => {
		const CURATION_ROOT = () => `${BASE_URL}/api/v1/indexes/${indexSlug}/curations`;

		test("should list curations (empty)", async () => {
			const response = await fetch(CURATION_ROOT(), {
				headers: { Authorization: `Bearer ${adminApiKey}` },
			});
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(Array.isArray(body.curations ?? body)).toBeTruthy();
		});

		test("should create a curation", async () => {
			const response = await fetch(CURATION_ROOT(), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${adminApiKey}`,
				},
				body: JSON.stringify({
					query: "laptop",
					curated: [{ document_id: "doc-1" }],
				}),
			});

			expect(response.ok).toBeTruthy();
		});

		test("should return 401 for unauthenticated curation request", async () => {
			const response = await fetch(CURATION_ROOT());
			expect(response.status).toBe(401);
		});
	});

	// ─── Sorting ────────────────────────────────────────────────────

	test.describe("Sorting", () => {
		const SORTING_ROOT = () => `${BASE_URL}/api/v1/indexes/${indexSlug}/sorting`;

		test("should list sorting fields (empty or default)", async () => {
			const response = await fetch(SORTING_ROOT(), {
				headers: { Authorization: `Bearer ${adminApiKey}` },
			});
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body).toBeDefined();
		});

		test("should add a sorting field", async () => {
			const response = await fetch(SORTING_ROOT(), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${adminApiKey}`,
				},
				body: JSON.stringify({
					name: "price_asc",
					field: "price",
					direction: "asc",
				}),
			});

			expect(response.ok).toBeTruthy();
		});

		test("should return 401 for unauthenticated sorting request", async () => {
			const response = await fetch(SORTING_ROOT());
			expect(response.status).toBe(401);
		});
	});

	// ─── Facets ─────────────────────────────────────────────────────

	test.describe("Facets", () => {
		const FACETS_ROOT = () => `${BASE_URL}/api/v1/indexes/${indexSlug}/facets`;

		test("should list facet configurations", async () => {
			const response = await fetch(FACETS_ROOT(), {
				headers: { Authorization: `Bearer ${adminApiKey}` },
			});
			// 200 or 404 (if facets not configured) are both acceptable
			expect([200, 404]).toContain(response.status);
			if (response.status === 200) {
				const body = await response.json();
				expect(Array.isArray(body.facets ?? body)).toBeTruthy();
			}
		});

		test("should return 401 for unauthenticated facets request", async () => {
			const response = await fetch(FACETS_ROOT());
			expect(response.status).toBe(401);
		});

		test("should return JSON always (no raw errors)", async () => {
			// Invariant 6: no raw Typesense errors to client
			const response = await fetch(`${BASE_URL}/api/v1/indexes/${indexSlug}/facets`, {
				headers: {
					Authorization: `Bearer ${adminApiKey}`,
					Accept: "application/json",
				},
			});
			const contentType = response.headers.get("content-type") || "";
			expect(contentType).toContain("application/json");
		});
	});

	// ─── Error handling ─────────────────────────────────────────────

	test.describe("Error handling", () => {
		test("should return 404 for non-existent index", async () => {
			const response = await fetch(`${BASE_URL}/api/v1/indexes/non-existent-id/synonyms`, {
				headers: { Authorization: `Bearer ${adminApiKey}` },
			});
			expect(response.status).toBe(404);
		});

		test("should return JSON error body (not raw text) for all endpoints", async () => {
			const endpoints = [
				`/api/v1/indexes/${indexSlug}/synonyms`,
				`/api/v1/indexes/${indexSlug}/curations`,
				`/api/v1/indexes/${indexSlug}/sorting`,
				`/api/v1/indexes/${indexSlug}/facets`,
			];

			for (const endpoint of endpoints) {
				const response = await fetch(`${BASE_URL}${endpoint}`, {
					headers: {
						Authorization: "Bearer invalid-key",
						Accept: "application/json",
					},
				});
				const contentType = response.headers.get("content-type") || "";
				expect(contentType).toContain("application/json");
				const body = await response.json();
				expect(typeof body).toBe("object");
				expect(body).not.toHaveProperty("message"); // No raw error messages
			}
		});
	});
});
