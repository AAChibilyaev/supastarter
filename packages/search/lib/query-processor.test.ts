import { describe, expect, it } from "vitest";

import { processQuery, hasNegation, hasWildcard } from "./query-processor";

describe("processQuery", () => {
	it("returns empty query as-is", () => {
		const result = processQuery("");
		expect(result.q).toBe("");
		expect(result.isExactPhrase).toBe(false);
	});

	it("returns wildcard query as-is", () => {
		const result = processQuery("*");
		expect(result.q).toBe("*");
		expect(result.isExactPhrase).toBe(false);
	});

	it("returns trimmed query as-is", () => {
		const result = processQuery("  ");
		expect(result.q).toBe("");
		expect(result.isExactPhrase).toBe(false);
	});

	it("detects full phrase query and strips quotes", () => {
		const result = processQuery('"exact phrase"');
		expect(result.q).toBe("exact phrase");
		expect(result.isExactPhrase).toBe(true);
	});

	it("handles multi-word phrase", () => {
		const result = processQuery('"blue suede shoes"');
		expect(result.q).toBe("blue suede shoes");
		expect(result.isExactPhrase).toBe(true);
	});

	it("leaves partially quoted query as-is", () => {
		const result = processQuery('"blue" shoes');
		expect(result.q).toBe('"blue" shoes');
		expect(result.isExactPhrase).toBe(false);
	});

	it("leaves unquoted query as-is", () => {
		const result = processQuery("red shoes");
		expect(result.q).toBe("red shoes");
		expect(result.isExactPhrase).toBe(false);
	});

	it("handles single word query", () => {
		const result = processQuery("shoes");
		expect(result.q).toBe("shoes");
		expect(result.isExactPhrase).toBe(false);
	});

	it("handles negation in query (pass through)", () => {
		const result = processQuery("shoes -boots");
		expect(result.q).toBe("shoes -boots");
		expect(result.isExactPhrase).toBe(false);
	});

	it("handles wildcard in query (pass through)", () => {
		const result = processQuery("sho*");
		expect(result.q).toBe("sho*");
		expect(result.isExactPhrase).toBe(false);
	});
});

describe("hasNegation", () => {
	it("detects leading negation", () => {
		expect(hasNegation("-excluded")).toBe(true);
	});

	it("detects mid-query negation", () => {
		expect(hasNegation("shoes -boots")).toBe(true);
	});

	it("detects ! negation", () => {
		expect(hasNegation("!excluded")).toBe(true);
	});

	it("does not flag hyphenated words", () => {
		expect(hasNegation("well-known")).toBe(false);
	});

	it("returns false for plain query", () => {
		expect(hasNegation("red shoes")).toBe(false);
	});
});

describe("hasWildcard", () => {
	it("detects trailing asterisk", () => {
		expect(hasWildcard("sho*")).toBe(true);
	});

	it("detects leading asterisk", () => {
		expect(hasWildcard("*shoes")).toBe(true);
	});

	it("detects question mark", () => {
		expect(hasWildcard("sho?s")).toBe(true);
	});

	it("returns false for plain query", () => {
		expect(hasWildcard("shoes")).toBe(false);
	});
});
