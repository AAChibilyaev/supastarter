/**
 * Type-safe PostHog event tracking helpers.
 *
 * All product events use the `aac_*` prefix for easy filtering.
 * No PII is captured — user IDs are the only identifier.
 */

import { getPostHogClient } from "./posthog";

// ─── Event catalog ─────────────────────────────────────────────

export type AacEventName =
	| "aac_user_signed_up"
	| "aac_org_created"
	| "aac_collection_created"
	| "aac_first_search_performed"
	| "aac_widget_embedded"
	| "aac_search_api_called"
	| "aac_plan_upgraded"
	| "aac_plan_downgraded"
	| "aac_subscription_cancelled"
	| "aac_api_key_created"
	| "aac_connector_connected";

export type AacEventProperties = Record<string, string | number | boolean | null>;

/**
 * Track an event server-side.
 * Safe to call even when PostHog is not configured (no-op).
 */
export function trackEvent(
	eventName: AacEventName,
	distinctId: string,
	properties?: AacEventProperties,
): void {
	const client = getPostHogClient();
	if (!client) return;

	client.capture({
		distinctId,
		event: eventName,
		properties: {
			...properties,
			$source: "server",
		},
	});
}

/**
 * Track an event client-side via posthog-js.
 * Import `usePostHog` from `posthog-js/react` in client components.
 */
export function getClientEventProperties(
	eventName: AacEventName,
	properties?: AacEventProperties,
): { event: AacEventName; properties: AacEventProperties } {
	return {
		event: eventName,
		properties: {
			...properties,
			$source: "client",
		},
	};
}

/**
 * Identify a user server-side.
 */
export function identifyUser(
	distinctId: string,
	traits?: Record<string, string | number | boolean>,
): void {
	const client = getPostHogClient();
	if (!client) return;

	client.identify({
		distinctId,
		properties: traits,
	});
}

export { getPostHogClient } from "./posthog";
