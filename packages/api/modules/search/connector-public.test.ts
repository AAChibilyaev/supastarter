/**
 * Tests for connector-public.ts — DELETE /connector/documents (AAC-158)
 *
 * Verifies that gateConnectorRequest correctly authenticates connector tokens
 * using plain sha256 hash comparison (matching hashSearchApiKey() output).
 */
/* oxlint-disable typescript-eslint/unbound-method */

import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/database", () => ({
	db: {
		searchApiKey: {
			findMany: vi.fn(),
			update: vi.fn().mockResolvedValue({}),
		},
	},
	enqueueManySearchIngest: vi.fn().mockResolvedValue(3),
	recordSearchUsage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@repo/logs", () => ({
	logger: {
		warn: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

vi.mock("./lib/connectors/runtime", () => ({
	getConnectorDefinition: vi.fn(),
}));

vi.mock("./lib/diagnostics-store", () => ({
	recordDiagnostics: vi.fn().mockReturnValue({ receivedAt: new Date().toISOString() }),
}));

vi.mock("./lib/sync-jobs", () => ({
	createSyncJob: vi.fn().mockResolvedValue({ id: "job-1" }),
	completeSyncJob: vi.fn().mockResolvedValue(null),
	failSyncJob: vi.fn().mockResolvedValue(null),
	getSyncJob: vi.fn().mockResolvedValue(null),
}));

import { db, enqueueManySearchIngest } from "@repo/database";

import { connectorApp } from "./connector-public";

// ─── Fixtures ────────────────────────────────────────────────────

const FAKE_TOKEN = "ss_connector_TESTTOKEN123456789A";
const FAKE_PREFIX = FAKE_TOKEN.slice(0, 8); // "ss_conne"

/**
 * PLAIN hash — how hashSearchApiKey() actually stores the hash in the DB:
 *   createHash("sha256").update(rawKey).digest("hex")
 * This does NOT contain ":", so gateConnectorRequest skips it (the bug).
 */
const PLAIN_HASH = createHash("sha256").update(FAKE_TOKEN).digest("hex");

function makeKeyRecord(hash: string) {
	return {
		id: "key-id-1",
		hash,
		prefix: FAKE_PREFIX,
		scopes: ["connector_write"],
		revokedAt: null,
		index: {
			id: "index-id-1",
			slug: "products",
			organizationId: "org-id-1",
		},
	};
}

function deleteRequest(body: unknown, token = FAKE_TOKEN) {
	return connectorApp.request("/connector/documents", {
		method: "DELETE",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});
}

// ─── Tests ───────────────────────────────────────────────────────

describe("DELETE /connector/documents", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ── Authentication ───────────────────────���──────────────────

	describe("authentication", () => {
		it("returns 401 when Authorization header is missing", async () => {
			const res = await connectorApp.request("/connector/documents", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ externalIds: ["p1"] }),
			});
			expect(res.status).toBe(401);
			expect(await res.json()).toEqual({ error: "missing_bearer_token" });
		});

		it("returns 403 when no DB key matches the token prefix", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([]);
			const res = await deleteRequest({ externalIds: ["p1"] });
			expect(res.status).toBe(403);
			expect(await res.json()).toEqual({ error: "invalid_or_revoked_key" });
		});

		it("valid token with plain sha256 hash returns 200", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(PLAIN_HASH),
			] as never);
			vi.mocked(enqueueManySearchIngest).mockResolvedValueOnce(1);

			const res = await deleteRequest({ externalIds: ["product-42"] });

			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({ deleted: 1 });
		});
	});

	// ── Input validation ──────────────────────────────────────────

	describe("input validation", () => {
		it("returns 400 when request body is missing", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(PLAIN_HASH),
			] as never);
			const res = await connectorApp.request("/connector/documents", {
				method: "DELETE",
				headers: { Authorization: `Bearer ${FAKE_TOKEN}` },
				// no Content-Type, no body
			});
			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body).toMatchObject({ error: "invalid_json" });
		});

		it("returns 400 when externalIds is an empty array", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(PLAIN_HASH),
			] as never);
			const res = await deleteRequest({ externalIds: [] });
			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body).toMatchObject({ error: "invalid_input" });
		});

		it("returns 400 when externalIds exceeds 500 items", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(PLAIN_HASH),
			] as never);
			const res = await deleteRequest({
				externalIds: Array.from({ length: 501 }, (_, i) => `p${i}`),
			});
			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body).toMatchObject({ error: "invalid_input" });
		});

		it("returns 400 when externalIds field is missing entirely", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(PLAIN_HASH),
			] as never);
			const res = await deleteRequest({ other: "data" });
			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body).toMatchObject({ error: "invalid_input" });
		});
	});

	// ── Happy path ────────────────────────────────────────────────

	describe("happy path", () => {
		it("returns 200 with deleted count when request is valid", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(PLAIN_HASH),
			] as never);
			vi.mocked(enqueueManySearchIngest).mockResolvedValueOnce(3);

			const res = await deleteRequest({ externalIds: ["p1", "p2", "p3"] });

			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({ deleted: 3 });
		});

		it("returns 502 when enqueueManySearchIngest throws", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(PLAIN_HASH),
			] as never);
			vi.mocked(enqueueManySearchIngest).mockRejectedValueOnce(new Error("db error"));

			const res = await deleteRequest({ externalIds: ["p1"] });

			expect(res.status).toBe(502);
			expect(await res.json()).toMatchObject({ error: "delete_failed" });
		});

		it("touches key lastUsedAt after successful auth", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(PLAIN_HASH),
			] as never);
			vi.mocked(enqueueManySearchIngest).mockResolvedValueOnce(1);

			await deleteRequest({ externalIds: ["p1"] });

			expect(vi.mocked(db.searchApiKey.update)).toHaveBeenCalled();
		});
	});
});
