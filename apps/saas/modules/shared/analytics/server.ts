import { PostHog } from "posthog-node";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

function createServerClient(): PostHog | null {
	if (!POSTHOG_KEY) {
		return null;
	}

	return new PostHog(POSTHOG_KEY, {
		host: POSTHOG_HOST,
	});
}

const _client = createServerClient();

/**
 * Access the server-side PostHog client.
 * Returns null if PostHog is not configured (NEXT_PUBLIC_POSTHOG_KEY missing).
 */
export function getPostHogServer(): PostHog | null {
	return _client;
}

/**
 * Capture a server-side event.
 * Silently no-ops if PostHog is not configured.
 */
export async function captureServerEvent(
	event: string,
	distinctId: string,
	properties?: Record<string, unknown>,
): Promise<void> {
	const client = getPostHogServer();
	if (!client) return;

	client.capture({
		distinctId,
		event,
		properties: {
			...properties,
			$groups: properties?.$groups ?? undefined,
		},
	});

	await client.flush();
}

/**
 * Identify a user on the server side.
 * Silently no-ops if PostHog is not configured.
 */
export async function identifyServerUser(
	distinctId: string,
	traits?: Record<string, unknown>,
): Promise<void> {
	const client = getPostHogServer();
	if (!client) return;

	client.identify({
		distinctId,
		properties: traits ?? {},
	});

	await client.flush();
}

/**
 * Set group properties on the server side.
 */
export async function groupServer(
	groupType: string,
	groupKey: string,
	properties?: Record<string, unknown>,
): Promise<void> {
	const client = getPostHogServer();
	if (!client) return;

	client.groupIdentify({
		groupType,
		groupKey,
		properties: properties ?? {},
	});

	await client.flush();
}

/**
 * Gracefully shutdown the PostHog client (call during app shutdown).
 */
export async function shutdownPostHog(): Promise<void> {
	const client = getPostHogServer();
	if (!client) return;

	await client.shutdown();
}
