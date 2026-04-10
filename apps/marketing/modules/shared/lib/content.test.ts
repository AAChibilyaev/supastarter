import { describe, expect, it } from "vitest";

import {
	getActivePathFromUrlParam,
	getLocalizedDocumentWithFallback,
	getUniqueBasePaths,
	slugifyHeadline,
} from "./content";

describe("getActivePathFromUrlParam", () => {
	it("returns a string as-is", () => {
		expect(getActivePathFromUrlParam("my-post")).toBe("my-post");
	});

	it("joins array segments with /", () => {
		expect(getActivePathFromUrlParam(["blog", "my-post"])).toBe("blog/my-post");
	});

	it("returns empty string for empty string input", () => {
		expect(getActivePathFromUrlParam("")).toBe("");
	});

	it("joins single-element arrays without extra slashes", () => {
		expect(getActivePathFromUrlParam(["single"])).toBe("single");
	});
});

describe("getLocalizedDocumentWithFallback", () => {
	const docs = [
		{ path: "first-post", locale: "en", title: "First Post" },
		{ path: "first-post", locale: "de", title: "Erster Beitrag" },
		{ path: "second-post", locale: "en", title: "Second Post" },
	];

	it("returns the exact locale match when available", () => {
		const result = getLocalizedDocumentWithFallback(docs, "first-post", "de");
		expect(result?.title).toBe("Erster Beitrag");
	});

	it("falls back to default locale when exact locale not found", () => {
		const result = getLocalizedDocumentWithFallback(docs, "second-post", "de");
		expect(result?.title).toBe("Second Post");
	});

	it("returns undefined when path does not exist", () => {
		const result = getLocalizedDocumentWithFallback(docs, "nonexistent", "en");
		expect(result).toBeUndefined();
	});

	it("returns default locale content when requested locale is also default", () => {
		const result = getLocalizedDocumentWithFallback(docs, "first-post", "en");
		expect(result?.title).toBe("First Post");
	});

	it("respects custom defaultLocale option", () => {
		const customDocs = [
			{ path: "post", locale: "de", title: "German Post" },
			{ path: "post", locale: "fr", title: "French Post" },
		];
		const result = getLocalizedDocumentWithFallback(customDocs, "post", "es", {
			defaultLocale: "de",
		});
		expect(result?.title).toBe("German Post");
	});
});

describe("getUniqueBasePaths", () => {
	it("returns unique paths from documents", () => {
		const docs = [
			{ path: "first-post", locale: "en" },
			{ path: "first-post", locale: "de" },
			{ path: "second-post", locale: "en" },
		];
		const result = getUniqueBasePaths(docs);
		expect(result).toEqual(["first-post", "second-post"]);
	});

	it("returns empty array for empty input", () => {
		expect(getUniqueBasePaths([])).toEqual([]);
	});

	it("preserves order of first occurrence", () => {
		const docs = [{ path: "c" }, { path: "a" }, { path: "b" }, { path: "c" }, { path: "a" }];
		expect(getUniqueBasePaths(docs)).toEqual(["c", "a", "b"]);
	});
});

describe("slugifyHeadline", () => {
	it("lowercases and hyphenates a headline", () => {
		expect(slugifyHeadline("Hello World")).toBe("hello-world");
	});

	it("removes special characters", () => {
		expect(slugifyHeadline("Hello, World!")).toBe("hello-world");
	});

	it("handles multiple spaces", () => {
		expect(slugifyHeadline("Hello   World")).toBe("hello-world");
	});

	it("trims leading/trailing whitespace", () => {
		expect(slugifyHeadline("  Hello World  ")).toBe("hello-world");
	});

	it("handles numbers in headlines", () => {
		expect(slugifyHeadline("Top 10 Tips")).toBe("top-10-tips");
	});
});
