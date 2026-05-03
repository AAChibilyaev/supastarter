/**
 * Server-side PostHog client.
 *
 * Use in API routes, server actions, and webhook handlers.
 * Auto-initializes from env vars with a lazy singleton pattern.
 */

import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

function getApiKey(): string | undefined {
	return process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

function getHost(): string {
	return process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
}

/**
 * Get or create the PostHog server client.
 * Returns null when PostHog is not configured (env var missing).
 */
export function getPostHogClient(): PostHog | null {
	const apiKey = getApiKey();
	if (!apiKey) return null;

	if (!_client) {
		_client = new PostHog(apiKey, {
			host: getHost(),
		});
	}
	return _client;
}

/**
 * Flush pending events.
 * Call before process exit or test teardown.
 */
export async function flushPostHog(): Promise<void> {
	if (_client) {
		await _client.shutdown();
		_client = null;
	}
}

export type { PostHog };
