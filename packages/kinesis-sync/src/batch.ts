/**
 * Batch processing utilities for @aacsearch/kinesis-sync.
 */

/**
 * Split an array into chunks of the given size.
 */
export function chunk<T>(arr: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		result.push(arr.slice(i, i + size));
	}
	return result;
}

/**
 * Retry an async function with exponential backoff and jitter.
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number } = {},
): Promise<T> {
	const { maxRetries = 3, baseDelayMs = 200, maxDelayMs = 30000 } = options;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			if (attempt >= maxRetries) {
				throw error instanceof Error ? error : new Error(String(error));
			}
			const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
			const jitter = Math.random() * delay * 0.1;
			await sleep(delay + jitter);
		}
	}
	throw new Error("Unreachable");
}

/**
 * Sleep for the given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
