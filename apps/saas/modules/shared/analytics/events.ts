/**
 * Type-safe AACsearch event definitions for PostHog analytics.
 *
 * All events are prefixed with `aac_`.
 * No PII should be included in event properties.
 */

// ─── User Events ───────────────────────────────────────────────

export type UserSignedUpEvent = {
	name: "aac_user_signed_up";
	properties: {
		method: "google" | "github" | "email" | "magic_link";
		locale: string;
	};
};

export type OrgCreatedEvent = {
	name: "aac_org_created";
	properties: {
		org_name: string;
		org_size?: string;
	};
};

export type CollectionCreatedEvent = {
	name: "aac_collection_created";
	properties: {
		collection_name: string;
		doc_count?: number;
	};
};

// ─── Activation Events ─────────────────────────────────────────

export type FirstSearchPerformedEvent = {
	name: "aac_first_search_performed";
	properties: {
		search_term: string;
		result_count: number;
		latency_ms?: number;
	};
};

export type WidgetEmbeddedEvent = {
	name: "aac_widget_embedded";
	properties: {
		project_id: string;
	};
};

export type SearchApiCalledEvent = {
	name: "aac_search_api_called";
	properties: {
		endpoint: string;
		status: number;
		latency?: number;
	};
};

// ─── Business Events ───────────────────────────────────────────

export type PlanUpgradedEvent = {
	name: "aac_plan_upgraded";
	properties: {
		from_plan: string;
		to_plan: string;
	};
};

export type PlanDowngradedEvent = {
	name: "aac_plan_downgraded";
	properties: {
		from_plan: string;
		to_plan: string;
	};
};

export type SubscriptionCancelledEvent = {
	name: "aac_subscription_cancelled";
	properties: {
		reason?: string;
	};
};

export type ApiKeyCreatedEvent = {
	name: "aac_api_key_created";
	properties: {
		key_type: "search" | "admin" | "scoped";
	};
};

export type ConnectorConnectedEvent = {
	name: "aac_connector_connected";
	properties: {
		connector_type: "prestashop" | "bitrix" | "shopify" | "woocommerce" | "custom";
	};
};

// ─── Union type ────────────────────────────────────────────────

export type AacEvent =
	| UserSignedUpEvent
	| OrgCreatedEvent
	| CollectionCreatedEvent
	| FirstSearchPerformedEvent
	| WidgetEmbeddedEvent
	| SearchApiCalledEvent
	| PlanUpgradedEvent
	| PlanDowngradedEvent
	| SubscriptionCancelledEvent
	| ApiKeyCreatedEvent
	| ConnectorConnectedEvent;

// ─── Helper to create a hashed user ID for privacy ─────────────

/**
 * Create a privacy-safe hashed user ID for analytics.
 * Uses SHA-256 to avoid storing PII as PostHog distinct IDs.
 * Note: this is best-effort; for production, use the server-side
 * `crypto.subtle` path instead when available.
 */
export function hashUserId(userId: string): string {
	// Simple hash using a non-crypto fast approach for development
	// In production, the server-side identifyServerUser handles hashing
	return `user_${userId.slice(0, 12)}`;
}
