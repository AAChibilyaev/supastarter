/**
 * Batching and retry utilities for the PostgreSQL sync connector.
 */

import type { SyncResult } from "./types";

/** Exponential backoff retry configuration */
export interface RetryConfig {
	maxRetries: number;
	baseDelayMs: number;
	maxDelayMs: number;
}

const DEFAULT_RETRY: RetryConfig = {
	maxRetries: 3,
	baseDelayMs: 1000,
	maxDelayMs: 15000,
};

/** Returns true if the error should NOT be retried (client errors) */
function isClientError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const msg = error.message;
	return msg.includes("400") || msg.includes("401") || msg.includes("403") || msg.includes("404");
}

/**
 * Retry an async operation with exponential backoff.
 * Only retries on network errors (5xx, ECONNRESET, etc.) — not 4xx.
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	config: RetryConfig = DEFAULT_RETRY,
): Promise<T> {
	let lastError: unknown;

	for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (isClientError(error)) {
				throw error;
			}

			if (attempt < config.maxRetries) {
				const delay = Math.min(
					config.baseDelayMs * Math.pow(2, attempt),
					config.maxDelayMs,
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	if (lastError instanceof Error) throw lastError;
	throw new Error("Retry exhausted");
}

/**
 * Split an array into chunks of the given size.
 */
export function chunk<T>(array: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size));
	}
	return result;
}

/**
 * Merge multiple SyncResult objects into one.
 */
export function mergeResults(results: SyncResult[]): SyncResult {
	return results.reduce(
		(acc, r) => ({
			synced: acc.synced + r.synced,
			skipped: acc.skipped + r.skipped,
			errors: [...acc.errors, ...r.errors],
		}),
		{ synced: 0, skipped: 0, errors: [] },
	);
}
