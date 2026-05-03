/**
 * E2E: Index Lifecycle — CRUD, stats, error handling
 *
 * Tests the full lifecycle of a search index via the v1 REST API:
 * - List projects/orgs to get org ID
 * - Create index with fields
 * - List indexes (verify new one appears)
 * - Get single index by ID
 * - Get index stats
 * - Update index (rename, disable/enable)
 * - Delete index
 * - Error cases: auth, 404, duplicate slug, invalid input
 */

import { test, expect } from "../../src/fixtures";
import { wait } from "../../src/helpers";

const BASE_URL = process.env.E2E_SAAS_URL || "http://localhost:3010";
const ADMIN_KEY = process.env.E2E_ADMIN_API_KEY || "test-admin-key";

let orgId: string;
let indexId: string;
let indexSlug: string;

test.describe.configure({ mode: "serial" });

test.describe("Index Lifecycle", () => {
	test.beforeAll(async () => {
		// Get the organization/project ID
		const projectsRes = await fetch(`${BASE_URL}/api/v1/projects`, {
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		});
		expect(projectsRes.status).toBe(200);
		const project = await projectsRes.json();
		orgId = project.id;
		expect(orgId).toBeTruthy();
	});

	test("should create a search index", async () => {
		indexSlug = `e2e-lifecycle-${Date.now()}`;

		const response = await fetch(`${BASE_URL}/api/v1/projects/${orgId}/indexes`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_KEY}`,
			},
			body: JSON.stringify({
				slug: indexSlug,
				displayName: "E2E Lifecycle Test Index",
				fields: [
					{ name: "title", type: "string" },
					{ name: "description", type: "string" },
					{ name: "price", type: "float" },
					{ name: "category", type: "string" },
				],
				defaultSortingField: "title",
			}),
		});

		expect(response.status).toBe(201);
		const body = await response.json();
		expect(body).toHaveProperty("id");
		expect(body).toHaveProperty("slug");
		expect(body.slug).toBe(indexSlug);
		expect(body.displayName).toBe("E2E Lifecycle Test Index");
		expect(body.enabled).toBe(true);
		indexId = body.id;
	});

	test("should list indexes and include the new one", async () => {
		const response = await fetch(`${BASE_URL}/api/v1/projects/${orgId}/indexes`, {
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		});

		expect(response.status).toBe(200);
		const indexes = await response.json();
		expect(Array.isArray(indexes)).toBe(true);

		const found = indexes.find((idx: { id: string; slug: string }) => idx.id === indexId);
		expect(found).toBeDefined();
		expect(found.slug).toBe(indexSlug);
		expect(found.displayName).toBe("E2E Lifecycle Test Index");
		expect(found.enabled).toBe(true);
	});

	test("should get index by ID", async () => {
		const response = await fetch(`${BASE_URL}/api/v1/indexes/${indexId}`, {
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.id).toBe(indexId);
		expect(body.slug).toBe(indexSlug);
		expect(body.displayName).toBe("E2E Lifecycle Test Index");
		expect(body).toHaveProperty("schema");
		expect(body.schema).toHaveProperty("fields");
		expect(body.schema.fields.length).toBeGreaterThanOrEqual(4);
		expect(body.organizationId).toBe(orgId);
	});

	test("should get index stats", async () => {
		const response = await fetch(`${BASE_URL}/api/v1/indexes/${indexId}/stats`, {
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		});

		expect(response.status).toBe(200);
		const stats = await response.json();
		expect(stats.id).toBe(indexId);
		expect(stats.slug).toBe(indexSlug);
		expect(stats).toHaveProperty("documentCount");
		expect(typeof stats.documentCount).toBe("number");
		expect(stats).toHaveProperty("usage");
		expect(stats.usage).toHaveProperty("totalSearches");
		expect(stats).toHaveProperty("ingestQueue");
		expect(stats.ingestQueue).toHaveProperty("pending");
		expect(stats.ingestQueue).toHaveProperty("failed");
		expect(stats).toHaveProperty("apiKeysCount");
	});

	test("should update index display name and disable it", async () => {
		// Rename
		let response = await fetch(`${BASE_URL}/api/v1/indexes/${indexId}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_KEY}`,
			},
			body: JSON.stringify({
				displayName: "E2E Lifecycle - Renamed",
			}),
		});

		expect(response.status).toBe(200);
		let body = await response.json();
		expect(body.displayName).toBe("E2E Lifecycle - Renamed");
		expect(body.enabled).toBe(true); // unchanged

		// Disable
		response = await fetch(`${BASE_URL}/api/v1/indexes/${indexId}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_KEY}`,
			},
			body: JSON.stringify({ enabled: false }),
		});

		expect(response.status).toBe(200);
		body = await response.json();
		expect(body.enabled).toBe(false);
		expect(body.displayName).toBe("E2E Lifecycle - Renamed"); // unchanged

		// Re-enable for subsequent tests
		response = await fetch(`${BASE_URL}/api/v1/indexes/${indexId}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_KEY}`,
			},
			body: JSON.stringify({ enabled: true }),
		});

		expect(response.status).toBe(200);
		body = await response.json();
		expect(body.enabled).toBe(true);
	});

	test("should delete the index and verify cleanup", async () => {
		// Delete
		const deleteResponse = await fetch(`${BASE_URL}/api/v1/indexes/${indexId}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		});

		expect(deleteResponse.status).toBe(200);
		const result = await deleteResponse.json();
		expect(result.deleted).toBe(true);
		expect(result.id).toBe(indexId);

		// Verify it's gone — should return 404
		const getResponse = await fetch(`${BASE_URL}/api/v1/indexes/${indexId}`, {
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		});

		expect(getResponse.status).toBe(404);
	});
});

test.describe("Index Lifecycle — Error Cases", () => {
	test("should return 401 when no API key is provided", async () => {
		const response = await fetch(`${BASE_URL}/api/v1/projects/${orgId}/indexes`, {
			method: "POST",
		});
		expect(response.status).toBe(401);
	});

	test("should return 404 for non-existent index", async () => {
		const response = await fetch(`${BASE_URL}/api/v1/indexes/non-existent-id-that-is-long-enough`, {
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		});
		expect(response.status).toBe(404);
	});

	test("should reject duplicate slug with 409", async () => {
		if (!orgId) {
			orgId = (
				await (
					await fetch(`${BASE_URL}/api/v1/projects`, {
						headers: { Authorization: `Bearer ${ADMIN_KEY}` },
					})
				).json()
			).id;
		}

		const slug = `e2e-conflict-${Date.now()}`;

		// Create first index
		const createRes1 = await fetch(`${BASE_URL}/api/v1/projects/${orgId}/indexes`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_KEY}`,
			},
			body: JSON.stringify({
				slug,
				displayName: "Conflict Test 1",
				fields: [{ name: "title", type: "string" }],
			}),
		});
		expect(createRes1.status).toBe(201);
		const idx1 = await createRes1.json();

		// Try creating with same slug — should conflict
		const createRes2 = await fetch(`${BASE_URL}/api/v1/projects/${orgId}/indexes`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_KEY}`,
			},
			body: JSON.stringify({
				slug,
				displayName: "Conflict Test 2",
				fields: [{ name: "title", type: "string" }],
			}),
		});
		expect(createRes2.status).toBe(409);
		const errBody = await createRes2.json();
		expect(errBody).toHaveProperty("error");
		expect(errBody.error).toBe("conflict");

		// Clean up
		await fetch(`${BASE_URL}/api/v1/indexes/${idx1.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${ADMIN_KEY}` },
		});
	});

	test("should return 400 for invalid input", async () => {
		const response = await fetch(`${BASE_URL}/api/v1/projects/${orgId}/indexes`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_KEY}`,
			},
			body: JSON.stringify({
				slug: "", // invalid — too short
				displayName: "",
				fields: [],
			}),
		});

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body).toHaveProperty("error");
		expect(body.error).toBe("invalid_input");
	});

	test("should return 404 for wrong project ID", async () => {
		const response = await fetch(
			`${BASE_URL}/api/v1/projects/00000000-0000-0000-0000-000000000000/indexes`,
			{
				headers: { Authorization: `Bearer ${ADMIN_KEY}` },
			},
		);

		expect(response.status).toBe(404);
	});

	test("should reject PATCH with empty body", async () => {
		const response = await fetch(
			`${BASE_URL}/api/v1/indexes/${indexId || "00000000-0000-0000-0000-000000000000"}`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${ADMIN_KEY}`,
				},
				body: JSON.stringify({}),
			},
		);

		expect(response.status).toBe(400);
	});
});
