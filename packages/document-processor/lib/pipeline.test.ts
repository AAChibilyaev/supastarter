import { describe, expect, it } from "vitest";

import { DocumentPipeline } from "./pipeline";

// Mock embedding function for tests
const testEmbeddingFn = async (chunks: string[]) => {
	return chunks.map(() => Array.from({ length: 4 }, () => Math.random()));
};

// Mock index function for tests
const testIndexFn = async (
	documents: Array<{ text: string; embedding?: number[]; metadata: Record<string, unknown> }>,
) => {
	return documents.map((_, i) => ({
		chunkIndex: i,
		indexedId: `idx-${i}`,
		success: true,
	}));
};

describe("DocumentPipeline", () => {
	describe("processFile", () => {
		it("processes a plain text file", async () => {
			const pipeline = new DocumentPipeline();
			const content = "Hello world. This is a test document. It has multiple sentences.";

			const result = await pipeline.processFile("test.txt", content, "text/plain");

			expect(result.id).toBeTruthy();
			expect(result.title).toBe("test");
			expect(result.sourceUri).toBe("test.txt");
			expect(result.chunks.length).toBeGreaterThanOrEqual(1);
			expect(result.chunks[0]!.text).toContain("Hello world");
		});

		it("processes with embedding and index functions", async () => {
			const pipeline = new DocumentPipeline();
			const content =
				"Test content for full pipeline processing with embedding and indexing.";

			const result = await pipeline.processFile(
				"test.txt",
				content,
				"text/plain",
				{ strategy: "fixed" },
				testEmbeddingFn,
				testIndexFn,
			);

			expect(result.embeddings.length).toBeGreaterThan(0);
			expect(result.embeddings[0]!.length).toBe(4); // Our mock returns 4-dim vectors
			expect(result.indexResults.length).toBeGreaterThan(0);
			expect(result.indexResults[0]!.success).toBe(true);
			expect(result.indexResults[0]!.indexedId).toBe("idx-0");
		});

		it("returns empty embeddings and indexResults when functions not provided", async () => {
			const pipeline = new DocumentPipeline();
			const content = "Test content.";

			const result = await pipeline.processFile("test.txt", content, "text/plain");

			expect(result.embeddings).toEqual([]);
			expect(result.indexResults).toEqual([]);
		});

		it("throws for unsupported file type", async () => {
			const pipeline = new DocumentPipeline();

			await expect(
				pipeline.processFile("file.xyz", "content", "application/unknown"),
			).rejects.toThrow("Unsupported file type");
		});

		it("throws for unknown extension without mime type", async () => {
			const pipeline = new DocumentPipeline();

			await expect(pipeline.processFile("file.xyz", "content")).rejects.toThrow(
				"Unsupported file type",
			);
		});

		it("progress tracker works", async () => {
			const pipeline = new DocumentPipeline();
			const tracker = pipeline.getProgressTracker();

			const content = "Test content for progress tracking.";
			await pipeline.processFile("test.txt", content, "text/plain");

			const allProgress = tracker.getAll();
			expect(allProgress.length).toBeGreaterThan(0);

			const lastProgress = tracker.get(allProgress[0]!.documentId);
			expect(lastProgress).toBeTruthy();
			expect(lastProgress!.status).toBe("completed");
			expect(lastProgress!.progress).toBe(100);
		});
	});

	describe("processUrl", () => {
		it("handles empty result from crawl (non-HTTP URL)", async () => {
			const pipeline = new DocumentPipeline();

			// This will fail to crawl but shouldn't throw — pipeline catches crawl errors
			const results = await pipeline.processUrl("http://localhost:1/nonexistent");
			expect(results).toBeInstanceOf(Array);
		});
	});

	describe("chunking options", () => {
		it("uses different chunk strategies", async () => {
			const pipeline = new DocumentPipeline();
			const text =
				"# Heading\n\nParagraph content here. With more text.\n\n## Subheading\n\nMore detailed content for the sub-section.";

			const markdownResult = await pipeline.processFile("doc.md", text, "text/markdown", {
				strategy: "markdown",
			});

			// Markdown chunks should preserve heading information
			const allText = markdownResult.chunks.map((c) => c.text).join(" ");
			expect(allText).toContain("Heading");
		});
	});
});
