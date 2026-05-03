import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

import { logger } from "@repo/logs";

import type { DeadLetterRecord, PipelineDocument, PipelineStage } from "./types";

/**
 * File-based dead-letter queue for failed pipeline documents.
 *
 * Stores failed documents as JSONL files for durability.
 * Supports retry with exponential backoff.
 */
export class DeadLetterQueue {
	private readonly dlqPath: string;
	private readonly maxRetries: number;

	constructor(dlqPath: string, maxRetries = 3) {
		this.dlqPath = dlqPath;
		this.maxRetries = maxRetries;

		if (!existsSync(dlqPath)) {
			mkdirSync(dlqPath, { recursive: true });
		}
	}

	/**
	 * Push a failed document to the dead-letter queue.
	 */
	push(
		document: PipelineDocument,
		failedStage: PipelineStage,
		error: Error,
	): DeadLetterRecord {
		const backoffHours = this.calculateBackoffHours(0);
		const record: DeadLetterRecord = {
			id: `${document.id}-${Date.now()}`,
			documentId: document.id,
			sourceUri: document.sourceUri,
			failedStage,
			error: error.message,
			errorStack: error.stack,
			document,
			retryCount: 0,
			maxRetries: this.maxRetries,
			lastAttemptedAt: new Date().toISOString(),
			createdAt: new Date().toISOString(),
			nextRetryAt: new Date(Date.now() + backoffHours * 60 * 60 * 1000).toISOString(),
		};

		this.writeRecord(record);
		logger.warn(
			`[DLQ] Pushed ${document.sourceUri} (stage: ${failedStage}, retry: 0/${this.maxRetries})`,
		);

		return record;
	}

	/**
	 * Retry a DLQ record: increment retry count and update timestamps.
	 */
	retry(record: DeadLetterRecord): DeadLetterRecord {
		const updated: DeadLetterRecord = {
			...record,
			retryCount: record.retryCount + 1,
			lastAttemptedAt: new Date().toISOString(),
			nextRetryAt: new Date(
				Date.now() + this.calculateBackoffHours(record.retryCount + 1) * 60 * 60 * 1000,
			).toISOString(),
		};

		this.writeRecord(updated);
		return updated;
	}

	/**
	 * Pop all records that are ready for retry.
	 */
	popReadyForRetry(): DeadLetterRecord[] {
		const now = new Date().toISOString();
		const all = this.readAll();
		const ready = all.filter((r) => r.retryCount < r.maxRetries && r.nextRetryAt <= now);
		return ready;
	}

	/**
	 * Get all records in the DLQ.
	 */
	readAll(): DeadLetterRecord[] {
		const records: DeadLetterRecord[] = [];

		if (!existsSync(this.dlqPath)) {
			return records;
		}

		try {
			const files = this.listFiles();
			for (const file of files) {
				try {
					const content = readFileSync(file, "utf-8");
					const lines = content.trim().split("\n");
					for (const line of lines) {
						if (line.trim()) {
							try {
								records.push(JSON.parse(line));
							} catch {
								// skip malformed lines
							}
						}
					}
				} catch {
					// skip unreadable files
				}
			}
		} catch {
			// dlq path empty
		}

		return records;
	}

	/**
	 * Remove a record from the DLQ (after successful retry or max retries exhausted).
	 */
	remove(recordId: string): void {
		const records = this.readAll().filter((r) => r.id !== recordId);
		this.rewriteAll(records);
	}

	/**
	 * Get count of failed documents.
	 */
	count(): { total: number; pendingRetry: number; exhausted: number } {
		const all = this.readAll();
		return {
			total: all.length,
			pendingRetry: all.filter((r) => r.retryCount < r.maxRetries).length,
			exhausted: all.filter((r) => r.retryCount >= r.maxRetries).length,
		};
	}

	private writeRecord(record: DeadLetterRecord): void {
		const date = new Date().toISOString().split("T")[0]!;
		const filePath = join(this.dlqPath, `dlq-${date}.jsonl`);
		appendFileSync(filePath, JSON.stringify(record) + "\n");
	}

	private rewriteAll(records: DeadLetterRecord[]): void {
		const date = new Date().toISOString().split("T")[0]!;
		const filePath = join(this.dlqPath, `dlq-${date}.jsonl`);

		if (records.length === 0) {
			try {
				unlinkSync(filePath);
			} catch {
				// file may not exist
			}
			return;
		}

		writeFileSync(filePath, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
	}

	private calculateBackoffHours(attempt: number): number {
		// Exponential backoff: 1h, 2h, 4h, 8h...
		return Math.min(Math.pow(2, attempt), 24); // cap at 24h
	}

	private listFiles(): string[] {
		const { readdirSync } = require("node:fs") as typeof import("node:fs");
		return readdirSync(this.dlqPath)
			.filter((f: string) => f.startsWith("dlq-") && f.endsWith(".jsonl"))
			.map((f: string) => join(this.dlqPath, f));
	}
}
