/**
 * Feature Flag Evaluation Types
 *
 * Targeting rule types and evaluation context for the
 * isFeatureEnabled evaluation engine (AAC-877).
 */

// ─── Targeting Rules ────────────────────────────────────────────

export type TargetingRuleField = "planTier" | "orgAge" | "geo" | "orgSlug" | "manualList";

export type TargetingRuleOperator = "in" | "notIn" | "gte" | "lt";

export interface TargetingRule {
	field: TargetingRuleField;
	operator: TargetingRuleOperator;
	value: string | string[];
}

export interface TargetingConfig {
	rules: TargetingRule[];
}

// ─── Evaluation Context ─────────────────────────────────────────

export interface EvaluationContext {
	/** Organization ID (the tenant being evaluated) */
	organizationId: string;
	/** Organization slug (from Organization.slug) */
	orgSlug: string | null;
	/** Organization metadata (JSON parsed from Organization.metadata) */
	orgMetadata: Record<string, unknown>;
	/** Organization age in days (based on Organization.createdAt) */
	orgAgeDays: number;
	/** Active subscription price IDs (from Purchase records) */
	activePriceIds?: string[];
	/** Geo/country code if known */
	geo?: string;
	/** Additional context for custom rule evaluation */
	[key: string]: unknown;
}

// ─── Cache Entry ────────────────────────────────────────────────

export interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}
