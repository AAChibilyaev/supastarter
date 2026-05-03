import { describe, expect, it } from "vitest";

import { chunkText } from "./chunker";

describe("chunkText — fixed strategy", () => {
	it("returns empty for empty input", () => {
		const result = chunkText("");
		expect(result.chunks).toEqual([]);
		expect(result.metadata).toEqual([]);
	});

	it("returns empty for whitespace-only input", () => {
		const result = chunkText("   \n  \n  ");
		expect(result.chunks).toEqual([]);
		expect(result.metadata).toEqual([]);
	});

	it("chunks short text into single chunk", () => {
		const text = "This is a short paragraph of text that should fit in one chunk.";
		const result = chunkText(text);
		expect(result.chunks).toHaveLength(1);
		expect(result.chunks[0]).toBe(text);
		expect(result.metadata[0]!.wordCount).toBeGreaterThan(0);
		expect(result.metadata[0]!.charCount).toBeGreaterThan(0);
	});

	it("splits long text across multiple paragraphs", () => {
		// Generate a long text well over maxWords (500 default)
		const paragraphs: string[] = [];
		for (let i = 0; i < 50; i++) {
			paragraphs.push(`Paragraph number ${i + 1}. ` + "word ".repeat(30));
		}
		const text = paragraphs.join("\n\n");

		const result = chunkText(text);
		expect(result.chunks.length).toBeGreaterThan(1);
		expect(result.metadata.length).toBe(result.chunks.length);

		// Each chunk should have metadata
		for (const meta of result.metadata) {
			expect(meta.index).toBeGreaterThanOrEqual(0);
			expect(meta.wordCount).toBeGreaterThan(0);
			expect(meta.charCount).toBeGreaterThan(0);
			expect(meta.text).toBeTruthy();
		}
	});

	it("splits large single paragraphs by sentences", () => {
		// A single paragraph with many sentences — all on one line.
		// Each sentence is ~9 words; with maxWords=30, each group is ~3 sentences (27 words).
		// minChunkSize=1 ensures we don't merge small groups back together.
		const sentences: string[] = [];
		for (let i = 0; i < 100; i++) {
			sentences.push(`Sentence number ${i + 1} in the test paragraph.`);
		}
		const text = sentences.join(" ");

		const result = chunkText(text, { maxWords: 30, minChunkSize: 1 });
		expect(result.chunks.length).toBeGreaterThan(1);
	});

	it("handles very long single paragraph with no paragraphs splitting", () => {
		const manyWords = "word ".repeat(2000);
		const result = chunkText(manyWords, { maxWords: 100 });
		expect(result.chunks.length).toBeGreaterThan(1);
	});

	it("respects overlapWords configuration", () => {
		const text =
			"First paragraph about topic A. It has some content.\n\n" +
			"Second paragraph about topic B. More words here.\n\n" +
			"Third paragraph about topic C. Yet more words.\n\n" +
			"Fourth paragraph about topic D. Ending content.\n\n" +
			"Fifth paragraph about topic E. Almost done.\n\n" +
			"Sixth paragraph about topic F. Final words.";

		const noOverlap = chunkText(text, { maxWords: 20, overlapWords: 0 });
		const withOverlap = chunkText(text, { maxWords: 20, overlapWords: 10 });

		// With overlap, we should have at least as many chunks (or same)
		expect(withOverlap.chunks.length).toBeGreaterThanOrEqual(noOverlap.chunks.length);
	});

	it("filters out chunks below minChunkSize by merging", () => {
		const text =
			"Large paragraph one. With enough words to exceed minimum.\n\n" +
			"Small.\n\n" +
			"Another large paragraph. Also sufficiently wordy.";

		const result = chunkText(text, { minChunkSize: 5, maxWords: 50 });
		expect(result.chunks.length).toBeGreaterThan(0);
		// Chunks should all be present
		expect(result.chunks.some((c) => c.includes("Large paragraph"))).toBe(true);
	});
});

describe("chunkText — semantic strategy", () => {
	it("falls back to fixed for short text", () => {
		const text = "Short text with only a few sentences.";
		const result = chunkText(text, { strategy: "semantic" });
		expect(result.chunks.length).toBeGreaterThan(0);
		expect(result.chunks[0]).toBe(text);
	});

	it("splits by topic boundaries using heading-like patterns", () => {
		const text = [
			"Introduction to the topic. This covers the basics. It is quite simple.",
			"SPECIAL SECTION. Here is a section written in all caps. Follow the rules.",
			"Conclusion. Final thoughts on the matter. That is all about this topic.",
		].join(" ");

		const result = chunkText(text, { strategy: "semantic", maxWords: 10 });
		expect(result.chunks.length).toBeGreaterThanOrEqual(1);
	});

	it("splits on transitional phrases", () => {
		const text = [
			"First we discuss the architecture. It uses microservices.",
			"However, there are some drawbacks. Scaling can be tricky.",
			"Therefore, we recommend a different approach. It works better.",
		].join(" ");

		const result = chunkText(text, { strategy: "semantic", maxWords: 10, minChunkSize: 1 });
		expect(result.chunks.length).toBeGreaterThan(1);
	});

	it("splits on numbered section starts", () => {
		const text = [
			"Introduction paragraph about the system.",
			"1. Setup. First install the dependencies.",
			"2. Configuration. Then configure the environment.",
			"3. Deployment. Finally deploy to production.",
		].join(" ");

		const result = chunkText(text, { strategy: "semantic", maxWords: 8, minChunkSize: 1 });
		expect(result.chunks.length).toBeGreaterThan(1);
	});

	it("applies overlap to maintain context continuity", () => {
		const sentences: string[] = [];
		for (let i = 0; i < 30; i++) {
			sentences.push(`Sentence ${i + 1} about a continuing topic in this document.`);
		}
		const text = sentences.join(" ") + " However, this is a new topic. It shifts focus.";

		const result = chunkText(text, {
			strategy: "semantic",
			maxWords: 15,
			overlapWords: 5,
			minChunkSize: 1,
		});
		expect(result.chunks.length).toBeGreaterThan(1);
	});
});

describe("chunkText — markdown strategy", () => {
	it("preserves heading structure in chunks", () => {
		const text = [
			"# Introduction",
			"",
			"Welcome to the guide. This is the intro section. It has several sentences to explain things.",
			"",
			"## Installation",
			"",
			"Follow these steps to install. First run the setup command. Then configure the environment.",
			"",
			"## Usage",
			"",
			"Here is how to use the tool. It is quite straightforward. Just follow the examples.",
		].join("\n");

		const result = chunkText(text, { strategy: "markdown", maxWords: 20, minChunkSize: 1 });
		expect(result.chunks.length).toBeGreaterThanOrEqual(2);
		// Check that section headings are preserved
		expect(result.chunks.some((c) => c.includes("Introduction"))).toBe(true);
		expect(result.chunks.some((c) => c.includes("Installation"))).toBe(true);
		expect(result.chunks.some((c) => c.includes("Usage"))).toBe(true);
	});

	it("splits large sections into sub-chunks", () => {
		const text = [
			"# Large Section",
			"",
			...Array.from(
				{ length: 100 },
				(_, i) => `Detail paragraph number ${i + 1} with enough text.`,
			),
		].join("\n");

		const result = chunkText(text, { strategy: "markdown", maxWords: 50 });
		expect(result.chunks.length).toBeGreaterThan(1);
	});

	it("handles content without headings", () => {
		const text = "Just a plain document with no markdown headings at all.\n\n".repeat(10);
		const result = chunkText(text, { strategy: "markdown", maxWords: 50 });
		expect(result.chunks.length).toBeGreaterThan(0);
	});
});

describe("chunkText — code strategy", () => {
	it("handles pure text without code blocks", () => {
		const text = "Just a plain text document with no code blocks in it whatsoever.";
		const result = chunkText(text, { strategy: "code" });
		expect(result.chunks.length).toBe(1);
	});

	it("splits by code block boundaries", () => {
		const text = [
			"Start with some explanation about the code.",
			"",
			"```typescript",
			"function hello() {",
			'  console.log("Hello, world!");',
			"  return true;",
			"}",
			"```",
			"",
			"Then more explanation after the code block.",
			"",
			"```python",
			"def greet():",
			'    print("Hello")',
			"```",
		].join("\n");

		const result = chunkText(text, { strategy: "code", maxWords: 10, minChunkSize: 1 });
		expect(result.chunks.length).toBeGreaterThanOrEqual(2);
		// Code fences should be preserved
		expect(result.chunks.some((c) => c.includes("```typescript"))).toBe(true);
		expect(result.chunks.some((c) => c.includes("```python"))).toBe(true);
	});

	it("preserves language annotations in code blocks", () => {
		const text = [
			"```tsx",
			"export function Component() {",
			"  return <div>Hello</div>;",
			"}",
			"```",
		].join("\n");

		const result = chunkText(text, { strategy: "code", minChunkSize: 1 });
		expect(result.chunks[0]).toContain("```tsx");
		expect(result.chunks[0]).toContain("Component");
	});

	it("splits large code blocks by function boundaries", () => {
		const code = [
			"```typescript",
			"export function firstFunction() {",
			"  const x = 1;",
			"  const y = 2;",
			"  return x + y;",
			"}",
			"",
			"export function secondFunction() {",
			'  const a = "hello";',
			'  const b = "world";',
			'  return a + " " + b;',
			"}",
			"",
			"export const thirdFunction = () => {",
			"  return 42;",
			"};",
			"```",
		].join("\n");

		const text = "Some context.\n\n" + code + "\n\nMore context after.";

		// Use a very small maxWords to force function-level splitting
		const result = chunkText(text, { strategy: "code", maxWords: 20, minChunkSize: 1 });
		expect(result.chunks.length).toBeGreaterThan(1);
	});
});

describe("chunkText — strategy edge cases", () => {
	it("handles single word", () => {
		const result = chunkText("Hello");
		expect(result.chunks).toHaveLength(1);
		expect(result.chunks[0]).toBe("Hello");
	});

	it("handles unicode text", () => {
		const text =
			"Привет мир! Это тестовый документ на русском языке. Он содержит несколько предложений.";
		const result = chunkText(text, { maxWords: 5 });
		expect(result.chunks.length).toBeGreaterThan(0);
		expect(result.metadata[0]!.wordCount).toBeGreaterThan(0);
	});

	it("handles text with special characters", () => {
		const text =
			"Email: test@example.com. URL: https://example.com/path?q=1&r=2. Price: $99.99!";
		const result = chunkText(text, { maxWords: 100 });
		expect(result.chunks).toHaveLength(1);
	});

	it("handles very long single word (e.g. base64 string)", () => {
		const text = "A".repeat(10000);
		const result = chunkText(text, { maxWords: 100 });
		expect(result.chunks.length).toBeGreaterThan(0);
	});
});
