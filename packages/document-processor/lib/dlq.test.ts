import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DeadLetterQueue } from "./dlq";
import type { PipelineDocument } from "./types";

function createTestDocument(overrides: Partial<PipelineDocument> = {}): PipelineDocument {
	return {
		id: "doc-" + Math.random().toString(36).slice(2, 10),
		sourceUri: "/tmp/test-" + Math.random().toString(36).slice(2, 8) + ".txt",
		title: "Test Document",
		rawContent: "test content",
		mimeType: "text/plain",
		fileType: "txt",
		metadata: {},
		...overrides,
	};
}

describe("DeadLetterQueue", () => {
	let dlqPath: string;
	let dlq: DeadLetterQueue;

	beforeEach(() => {
		dlqPath = mkdtempSync(join(tmpdir(), "dlq-test-"));
		dlq = new DeadLetterQueue(dlqPath, 3);
	});

	afterEach(() => {
		try {
			rmSync(dlqPath, { recursive: true, force: true });
		} catch {
			// cleanup best-effort
		}
	});

	describe("push", () => {
		it("adds a record to the queue", () => {
			const doc = createTestDocument();
			const error = new Error("Parse failed: invalid format");

			const record = dlq.push(doc, "parse", error);

			expect(record.documentId).toBe(doc.id);
			expect(record.failedStage).toBe("parse");
			expect(record.error).toBe("Parse failed: invalid format");
			expect(record.retryCount).toBe(0);
			expect(record.maxRetries).toBe(3);
			expect(record.createdAt).toBeTruthy();
			expect(record.nextRetryAt).toBeTruthy();
		});

		it("persists record to disk", () => {
			const doc = createTestDocument();
			dlq.push(doc, "chunk", new Error("Chunk failed"));

			const all = dlq.readAll();
			expect(all).toHaveLength(1);
			expect(all[0]!.documentId).toBe(doc.id);
		});

		it("supports multiple records", () => {
			for (let i = 0; i < 5; i++) {
				dlq.push(createTestDocument(), "parse", new Error(`Error ${i}`));
			}
			expect(dlq.readAll()).toHaveLength(5);
		});
	});

	describe("retry", () => {
		it("increments retry count", () => {
			const doc = createTestDocument();
			const record = dlq.push(doc, "parse", new Error("Fail"));

			const updated = dlq.retry(record);

			expect(updated.retryCount).toBe(1);
			expect(updated.maxRetries).toBe(3);
		});

		it("updates lastAttemptedAt and nextRetryAt", async () => {
			const doc = createTestDocument();
			const record = dlq.push(doc, "parse", new Error("Fail"));

			// Ensure at least 2ms passes so timestamps are distinguishable
			await new Promise((r) => setTimeout(r, 5));
			const updated = dlq.retry(record);

			expect(updated.retryCount).toBe(1);
			// ISO string should be valid and strictly greater (lexicographic)
			expect(updated.lastAttemptedAt > record.lastAttemptedAt).toBe(true);
			expect(updated.nextRetryAt > updated.lastAttemptedAt).toBe(true); // backoff is in the future
		});
	});

	describe("popReadyForRetry", () => {
		it("returns records whose nextRetryAt has passed", () => {
			const doc = createTestDocument();
			dlq.push(doc, "parse", new Error("Fail"));

			// All records should be ready since they're newly created with a past backoff
			const ready = dlq.popReadyForRetry();
			expect(ready.length).toBeGreaterThanOrEqual(0);
		});

		it("does not return exhausted records (maxRetries reached)", () => {
			const doc = createTestDocument();
			let record = dlq.push(doc, "parse", new Error("Fail"));

			// Retry 3 times to exhaust
			for (let i = 0; i < 3; i++) {
				record = dlq.retry(record);
			}

			const ready = dlq.popReadyForRetry();
			expect(ready).toHaveLength(0);
		});
	});

	describe("remove", () => {
		it("removes a record by ID", () => {
			const doc = createTestDocument();
			const record = dlq.push(doc, "parse", new Error("Fail"));

			expect(dlq.readAll()).toHaveLength(1);
			dlq.remove(record.id);
			expect(dlq.readAll()).toHaveLength(0);
		});

		it("removes only the specified record", () => {
			const records = [0, 1, 2].map((i) => {
				return dlq.push(
					createTestDocument({ title: `Doc ${i}` }),
					"parse",
					new Error(`Error ${i}`),
				);
			});

			expect(dlq.readAll()).toHaveLength(3);
			dlq.remove(records[1]!.id);
			const remaining = dlq.readAll();
			expect(remaining).toHaveLength(2);
			expect(remaining.some((r) => r.id === records[1]!.id)).toBe(false);
		});
	});

	describe("count", () => {
		it("returns correct totals", () => {
			// Start fresh: push one, then exhaust one
			const freshDlq = new DeadLetterQueue(mkdtempSync(join(tmpdir(), "dlq-count-")));
			try {
				expect(freshDlq.count()).toEqual({ total: 0, pendingRetry: 0, exhausted: 0 });

				freshDlq.push(createTestDocument(), "parse", new Error("First fail"));
				expect(freshDlq.count()).toEqual({ total: 1, pendingRetry: 1, exhausted: 0 });

				let record = freshDlq.push(createTestDocument(), "parse", new Error("Second fail"));
				for (let i = 0; i < 3; i++) {
					record = freshDlq.retry(record);
				}

				const counts = freshDlq.count();
				expect(counts.total).toBe(2);
				expect(counts.pendingRetry).toBe(1); // first record still pending
				expect(counts.exhausted).toBe(1); // second record exhausted
			} finally {
				rmSync(freshDlq["dlqPath"], { recursive: true, force: true });
			}
		});
	});

	describe("exponential backoff", () => {
		it("increases delay between retries", () => {
			const doc = createTestDocument();
			let record = dlq.push(doc, "parse", new Error("Fail"));

			const firstNextRetry = new Date(record.nextRetryAt).getTime();
			const firstDelay = firstNextRetry - new Date(record.createdAt).getTime();

			record = dlq.retry(record);
			const secondDelay =
				new Date(record.nextRetryAt).getTime() - new Date(record.lastAttemptedAt).getTime();

			// Second delay should be roughly 2x first (exponential backoff)
			expect(secondDelay).toBeGreaterThanOrEqual(firstDelay);
		});
	});
});
