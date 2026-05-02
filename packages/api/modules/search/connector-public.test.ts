/**
 * Tests for connector-public.ts — DELETE /connector/documents (AAC-58)
 *
 * BUG REPORT: gateConnectorRequest contains a hash-format mismatch.
 * The function splits k.hash by ":" expecting "salt:sha256(salt+token)" format,
 * but hashSearchApiKey() stores hashes as plain "sha256(rawKey)" with NO colon.
 * Result: every connector token verification fails with 403, even valid tokens.
 *
 * Tests marked "[BUG]" fail until the bug is fixed.
 * Fix: use verifySearchApiKey() from @repo/search (same approach as public-handler.ts),
 * or align hash comparison: hash = hashSearchApiKey(rawKey), compare k.hash === hash.
 */

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

/**
 * SALTED hash — the format gateConnectorRequest currently expects (broken assumption):
 *   `${salt}:${sha256(salt + token)}`
 * No code in the codebase ever writes hashes in this format, so this format
 * cannot exist in production — it is used here ONLY to get past auth in
 * input-validation tests while the bug is unresolved.
 */
const _SALT = "testsalt";
const SALTED_HASH = `${_SALT}:${createHash("sha256")
	.update(_SALT + FAKE_TOKEN)
	.digest("hex")}`;

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

		it("[BUG] valid token with plain sha256 hash should return 200, not 403", async () => {
			// This is the actual production scenario:
			// createConnectorToken → generateSearchApiKey() → hashSearchApiKey(rawKey) → sha256(rawKey)
			// The resulting hash has NO colon — gateConnectorRequest splits by ":" and expects 2 parts,
			// gets 1, hits `continue`, matched stays undefined → always 403.
			//
			// Root cause: gateConnectorRequest (lines 58-68 in connector-public.ts) expects
			//   k.hash format: "salt:sha256(salt+token)"
			// Actual stored format (hashSearchApiKey):
			//   "sha256(rawKey)"  — no colon, no salt
			//
			// Fix: replace the salt-based comparison with hashSearchApiKey(token) === k.hash,
			// or delegate to verifySearchApiKey() from @repo/search (used in public-handler.ts).
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(PLAIN_HASH),
			] as never);
			vi.mocked(enqueueManySearchIngest).mockResolvedValueOnce(1);

			const res = await deleteRequest({ externalIds: ["product-42"] });

			// FAILS now (bug → 403). PASSES after fix (→ 200).
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({ deleted: 1 });
		});
	});

	// ── Input validation (auth bypassed via salted-hash fixture) ──
	// NOTE: these use SALTED_HASH to work around the auth bug.
	// After the bug is fixed, switch the key fixture to makeKeyRecord(PLAIN_HASH).

	describe("input validation", () => {
		it("returns 400 when request body is missing", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(SALTED_HASH),
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
				makeKeyRecord(SALTED_HASH),
			] as never);
			const res = await deleteRequest({ externalIds: [] });
			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body).toMatchObject({ error: "invalid_input" });
		});

		it("returns 400 when externalIds exceeds 500 items", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(SALTED_HASH),
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
				makeKeyRecord(SALTED_HASH),
			] as never);
			const res = await deleteRequest({ other: "data" });
			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body).toMatchObject({ error: "invalid_input" });
		});
	});

	// ── Happy path (requires auth bug fix) ────────────────────��─
	// These tests demonstrate correct endpoint behaviour after the bug is resolved.
	// They currently FAIL because auth returns 403.

	describe("happy path [requires auth bug fix]", () => {
		it("[BUG] returns 200 with deleted count when request is valid", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(PLAIN_HASH),
			] as never);
			vi.mocked(enqueueManySearchIngest).mockResolvedValueOnce(3);

			const res = await deleteRequest({ externalIds: ["p1", "p2", "p3"] });

			// BUG: currently 403; should be 200 after fix
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({ deleted: 3 });
		});

		it("[BUG] returns 502 when enqueueManySearchIngest throws", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(PLAIN_HASH),
			] as never);
			vi.mocked(enqueueManySearchIngest).mockRejectedValueOnce(new Error("db error"));

			const res = await deleteRequest({ externalIds: ["p1"] });

			// BUG: currently 403; should be 502 after fix
			expect(res.status).toBe(502);
			expect(await res.json()).toMatchObject({ error: "delete_failed" });
		});

		it("[BUG] touches key lastUsedAt after successful auth", async () => {
			vi.mocked(db.searchApiKey.findMany).mockResolvedValueOnce([
				makeKeyRecord(PLAIN_HASH),
			] as never);
			vi.mocked(enqueueManySearchIngest).mockResolvedValueOnce(1);

			await deleteRequest({ externalIds: ["p1"] });

			// BUG: currently not called because auth fails; should be called after fix
			expect(vi.mocked(db.searchApiKey.update)).toHaveBeenCalled();
		});
	});
});
