/**
 * Regression J2 + J5: API Key Lifecycle & Multi-Tenant Isolation
 *
 * Tests:
 * - API key creation → usage → revocation → reuse fails
 * - Multi-tenant isolation: org A data never visible from org B
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
let adminKey: string;
let keyId: string;

test.describe.configure({ mode: "serial" });

test.describe("J2: API Key Lifecycle", () => {
	test.beforeAll(async () => {
		// Create a shared test index
		const index = await createTestIndex(ADMIN_KEY, BASE_URL, `regression-j2-${Date.now()}`);
		indexSlug = index.slug;

		// Seed documents
		await seedDocuments(ADMIN_KEY, BASE_URL, indexSlug, [
			{
				id: "1",
				title: "API Key Test Document",
				description: "For API key lifecycle test",
				price: 9.99,
			},
		]);

		await wait(1000);

		// Create admin key
		const key = await createApiKey(
			ADMIN_KEY,
			BASE_URL,
			"regression-j2-admin",
			["search", "ingest", "manage"],
			indexSlug,
		);
		adminKey = key.key;
		keyId = key.id;
	});

	test.afterAll(async () => {
		// Cleanup
		await fetch(`${BASE_URL}/api/v1/indexes/${indexSlug}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		}).catch(() => {});
	});

	test("1 — Create API key and receive plaintext key once", async () => {
		const key = await createApiKey(
			ADMIN_KEY,
			BASE_URL,
			"regression-j2-search",
			["search"],
			indexSlug,
		);
		searchKey = key.key;
		expect(searchKey).toBeTruthy();
		expect(searchKey.length).toBeGreaterThan(10);
	});

	test("2 — Use API key for public search", async () => {
		const result = await searchPublic(indexSlug, "API", searchKey, BASE_URL);
		expect(result.found).toBeGreaterThanOrEqual(1);
		expect(result.hits.length).toBeGreaterThanOrEqual(1);
	});

	test("3 — Use API key for admin operations (ingest)", async () => {
		const response = await fetch(`${BASE_URL}/api/v1/indexes/${indexSlug}/documents`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminKey}`,
			},
			body: JSON.stringify({
				documents: [{ id: "100", title: "Admin Inserted Document", price: 14.99 }],
			}),
		});
		expect(response.status).toBe(200);
	});

	test("4 — Revoke key then verify search fails with 401", async () => {
		// Revoke via API
		const response = await fetch(`${BASE_URL}/api/v1/keys/${keyId}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		});
		expect(response.ok).toBeTruthy();

		await wait(500);

		// Verify revoked key cannot search
		const searchResponse = await fetch(`${BASE_URL}/api/search/public/${indexSlug}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${searchKey}`,
			},
			body: JSON.stringify({ q: "test" }),
		});
		expect(searchResponse.status).toBe(401);
	});
});

test.describe("J5: Multi-Tenant Isolation", () => {
	let orgAindexSlug: string;
	let orgBindexSlug: string;
	let orgAkey: string;
	let orgBkey: string;

	test("1 — Create org A with data and org B with different data", async () => {
		// Index A - Org A
		const indexA = await createTestIndex(ADMIN_KEY, BASE_URL, `regression-orga-${Date.now()}`);
		orgAindexSlug = indexA.slug;

		await seedDocuments(ADMIN_KEY, BASE_URL, orgAindexSlug, [
			{
				id: "1",
				title: "Org A Secret Document",
				description: "Should not leak to Org B",
				price: 100,
			},
		]);

		const keyA = await createApiKey(
			ADMIN_KEY,
			BASE_URL,
			"regression-orga-key",
			["search"],
			orgAindexSlug,
		);
		orgAkey = keyA.key;

		// Index B - Org B
		const indexB = await createTestIndex(ADMIN_KEY, BASE_URL, `regression-orgb-${Date.now()}`);
		orgBindexSlug = indexB.slug;

		await seedDocuments(ADMIN_KEY, BASE_URL, orgBindexSlug, [
			{
				id: "1",
				title: "Org B Confidential Document",
				description: "Should not leak to Org A",
				price: 200,
			},
		]);

		const keyB = await createApiKey(
			ADMIN_KEY,
			BASE_URL,
			"regression-orgb-key",
			["search"],
			orgBindexSlug,
		);
		orgBkey = keyB.key;

		await wait(1000);
	});

	test("2 — Org A cannot search Org B index with Org A key", async () => {
		// Attempt to search Org B index with Org A key
		const result = await searchPublic(orgBindexSlug, "*", orgAkey, BASE_URL);
		// Either 0 results or auth error — data isolation
		expect(result.found).toBe(0);
	});

	test("3 — Org B cannot search Org A index with Org B key", async () => {
		const result = await searchPublic(orgAindexSlug, "*", orgBkey, BASE_URL);
		expect(result.found).toBe(0);
	});

	test("4 — Each org can search its own index", async () => {
		const resultA = await searchPublic(orgAindexSlug, "Secret", orgAkey, BASE_URL);
		expect(resultA.found).toBeGreaterThanOrEqual(1);

		const resultB = await searchPublic(orgBindexSlug, "Confidential", orgBkey, BASE_URL);
		expect(resultB.found).toBeGreaterThanOrEqual(1);
	});

	test.afterAll(async () => {
		// Cleanup
		await fetch(`${BASE_URL}/api/v1/indexes/${orgAindexSlug}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		}).catch(() => {});
		await fetch(`${BASE_URL}/api/v1/indexes/${orgBindexSlug}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		}).catch(() => {});
	});
});
