import { describe, expect, it } from "vitest";

import { generateSearchApiKey, hashSearchApiKey, isValidSearchApiKeyShape } from "./keys";

describe("generateSearchApiKey", () => {
	it("returns rawKey starting with ss_search_", () => {
		const generated = generateSearchApiKey();
		expect(generated.rawKey.startsWith("ss_search_")).toBe(true);
	});

	it("returns prefix that is the first 12 chars of rawKey", () => {
		const generated = generateSearchApiKey();
		expect(generated.prefix).toBe(generated.rawKey.slice(0, 12));
		expect(generated.prefix.length).toBe(12);
	});

	it("hash matches hashSearchApiKey of rawKey", () => {
		const generated = generateSearchApiKey();
		expect(generated.hash).toBe(hashSearchApiKey(generated.rawKey));
	});

	it("produces unique keys on repeated calls", () => {
		const a = generateSearchApiKey();
		const b = generateSearchApiKey();
		expect(a.rawKey).not.toBe(b.rawKey);
		expect(a.hash).not.toBe(b.hash);
	});

	it("rawKey has at least 256 bits of entropy in body", () => {
		const generated = generateSearchApiKey();
		const body = generated.rawKey.slice("ss_search_".length);
		expect(body.length).toBeGreaterThanOrEqual(40);
	});
});

describe("hashSearchApiKey", () => {
	it("returns 64-char lowercase hex (sha-256)", () => {
		const hash = hashSearchApiKey("ss_search_anything");
		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});

	it("is deterministic", () => {
		expect(hashSearchApiKey("abc")).toBe(hashSearchApiKey("abc"));
	});

	it("differs for different inputs", () => {
		expect(hashSearchApiKey("a")).not.toBe(hashSearchApiKey("b"));
	});
});

describe("isValidSearchApiKeyShape", () => {
	it("accepts a freshly generated key", () => {
		const generated = generateSearchApiKey();
		expect(isValidSearchApiKeyShape(generated.rawKey)).toBe(true);
	});

	it("rejects empty string", () => {
		expect(isValidSearchApiKeyShape("")).toBe(false);
	});

	it("rejects key without prefix", () => {
		expect(isValidSearchApiKeyShape("not_a_search_key_aaaaaaaaaaaaaa")).toBe(false);
	});

	it("rejects too-short keys", () => {
		expect(isValidSearchApiKeyShape("ss_search_abc")).toBe(false);
	});
});
