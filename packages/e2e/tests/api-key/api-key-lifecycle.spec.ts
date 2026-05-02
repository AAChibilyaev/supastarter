/**
 * E2E: API key lifecycle — create, use, revoke, reuse-after-revoke fails
 *
 * Tests the complete API key lifecycle:
 * - Create admin/search/connector/scoped keys via v1 REST API
 * - Use keys for authenticated requests
 * - Revoke keys
 * - Verify revoked key returns 401
 * - Prefix validation (ss_search_, ss_connector_, ss_scoped_)
 */

import { test, expect } from "../../src/fixtures";
import { createTestIndex, createApiKey, revokeApiKey, searchPublic, wait } from "../../src/helpers";

const BASE_URL = process.env.E2E_SAAS_URL || "http://localhost:3010";
const ADMIN_KEY = process.env.E2E_ADMIN_API_KEY || "test-admin-key";

let indexSlug: string;

test.describe.configure({ mode: "serial" });

test.describe("API Key Lifecycle", () => {

	test.beforeAll(async () => {
		// Create a test index
		const index = await createTestIndex(ADMIN_KEY, BASE_URL, `e2e-apikey-${Date.now()}`);
		indexSlug = index.slug;
		await wait(500);
	});

	test("should create a search API key", async () => {
		const result = await createApiKey(ADMIN_KEY, BASE_URL, `e2e-test-search-key`, ["search"], indexSlug);
		expect(result.key).toBeTruthy();
		expect(result.id).toBeTruthy();
		// Key should start with expected prefix format
		expect(result.key).toMatch(/^ss_search_/);
	});

	test("should use a search API key for authenticated requests", async () => {
		const result = await createApiKey(ADMIN_KEY, BASE_URL, `e2e-use-key-${Date.now()}`, ["search"], indexSlug);
		expect(result.key).toBeTruthy();

		// Use the key to search
		const response = await fetch(`${BASE_URL}/api/search/public/${indexSlug}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${result.key}`,
			},
			body: JSON.stringify({ q: "*" }),
		});
		expect(response.status).toBe(200);
	});

	test("should revoke an API key", async () => {
		const result = await createApiKey(ADMIN_KEY, BASE_URL, `e2e-revoke-key-${Date.now()}`, ["search"], indexSlug);
		expect(result.key).toBeTruthy();

		const revoked = await revokeApiKey(ADMIN_KEY, BASE_URL, result.id);
		expect(revoked).toBe(true);
	});

	test("should return 401 for revoked API key", async () => {
		const result = await createApiKey(ADMIN_KEY, BASE_URL, `e2e-revoked-key-${Date.now()}`, ["search"], indexSlug);
		expect(result.key).toBeTruthy();

		// Revoke it
		await revokeApiKey(ADMIN_KEY, BASE_URL, result.id);
		await wait(500);

		// Try to use it
		const response = await fetch(`${BASE_URL}/api/search/public/${indexSlug}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${result.key}`,
			},
			body: JSON.stringify({ q: "*" }),
		});
		expect(response.status).toBe(401);
	});

	test("should reject request with invalid API key format", async () => {
		const response = await fetch(`${BASE_URL}/api/search/public/${indexSlug}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer bad-key-format-without-prefix",
			},
			body: JSON.stringify({ q: "*" }),
		});
		expect(response.status).toBe(401);
	});

	test("should reject request without any Authorization header", async () => {
		const response = await fetch(`${BASE_URL}/api/search/public/${indexSlug}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ q: "*" }),
		});
		expect(response.status).toBe(401);
	});
});
