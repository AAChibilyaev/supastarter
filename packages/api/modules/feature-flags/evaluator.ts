/**
 * Feature Flag Evaluation Engine (AAC-877)
 *
 * isFeatureEnabled(orgId, flagName) → boolean
 *
 * Evaluation order:
 *   1. Kill switch → force off
 *   2. Org override → per-tenant override
 *   3. Targeting rules → plan tier, geo, org slug, manual list
 *   4. Percentage rollout → deterministic hash-based
 *   5. Fallback → flag.enabled default
 *
 * Cached 60s in-memory (Redis-ready — swap Map for Redis when available).
 *
 * Usage:
 *   import { isFeatureEnabled } from "@repo/api/modules/feature-flags/evaluator";
 *   const enabled = await isFeatureEnabled(orgId, "analytics-v2", { geo: "US" });
 */

import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { resolveOrgPlan } from "@repo/payments/lib/entitlements";

import type { CacheEntry, EvaluationContext, TargetingRule, TargetingRuleField } from "./types";

// ─── Flag Cache ──────────────────────────────────────────────────

const flagCache = new Map<string, CacheEntry<FlagRecord | null>>();
const FLAG_CACHE_TTL_MS = 60_000;

interface FlagRecord {
	id: string;
	key: string;
	enabled: boolean;
	killSwitch: boolean;
	rolloutPercentage: number | null;
	targetingRules: Record<string, unknown> | null;
	overrides: Array<{
		organizationId: string;
		enabled: boolean;
	}>;
}

async function loadFlagByKey(flagKey: string): Promise<FlagRecord | null> {
	const now = Date.now();
	const cached = flagCache.get(flagKey);
	if (cached && cached.expiresAt > now) return cached.data;

	try {
		const flag = await db.featureFlag.findUnique({
			where: { key: flagKey },
			include: {
				overrides: {
					select: {
						organizationId: true,
						enabled: true,
					},
				},
			},
		});

		if (!flag) {
			flagCache.set(flagKey, { data: null, expiresAt: now + FLAG_CACHE_TTL_MS });
			return null;
		}

		const record: FlagRecord = {
			id: flag.id,
			key: flag.key,
			enabled: flag.enabled,
			killSwitch: flag.killSwitch,
			rolloutPercentage: flag.rolloutPercentage,
			targetingRules: flag.targetingRules as Record<string, unknown> | null,
			overrides: flag.overrides,
		};

		flagCache.set(flagKey, { data: record, expiresAt: now + FLAG_CACHE_TTL_MS });
		return record;
	} catch (error) {
		logger.error("Failed to load feature flag", { flagKey, error });
		return null;
	}
}

// ─── Org Context Cache ──────────────────────────────────────────

const orgContextCache = new Map<string, CacheEntry<EvaluationContext>>();
const ORG_CACHE_TTL_MS = 60_000;

async function buildOrgContext(
	orgId: string,
	extraContext?: Partial<EvaluationContext>,
): Promise<EvaluationContext> {
	const now = Date.now();
	const cached = orgContextCache.get(orgId);
	if (cached && cached.expiresAt > now) {
		return { ...cached.data, ...extraContext };
	}

	try {
		const org = await db.organization.findUnique({
			where: { id: orgId },
			select: {
				slug: true,
				metadata: true,
				createdAt: true,
			},
		});

		if (!org) {
			throw new Error(`Organization not found: ${orgId}`);
		}

		let orgMetadata: Record<string, unknown> = {};
		try {
			if (org.metadata) {
				orgMetadata = JSON.parse(org.metadata) as Record<string, unknown>;
			}
		} catch {
			// invalid JSON — use empty
		}

		let planId = "free";
		try {
			const plan = await resolveOrgPlan(orgId);
			planId = plan.planId;
		} catch {
			// fallback to free
		}

		const orgAgeMs = Date.now() - new Date(org.createdAt).getTime();
		const orgAgeDays = Math.floor(orgAgeMs / 86400_000);

		const context: EvaluationContext = {
			organizationId: orgId,
			orgSlug: org.slug,
			orgMetadata,
			orgAgeDays,
			planTier: planId,
		};

		orgContextCache.set(orgId, { data: context, expiresAt: now + ORG_CACHE_TTL_MS });

		return { ...context, ...extraContext };
	} catch (error) {
		logger.error("Failed to build org context", { orgId, error });
		// Return a minimal context so evaluation doesn't crash
		return {
			organizationId: orgId,
			orgSlug: null,
			orgMetadata: {},
			orgAgeDays: 0,
			planTier: "free",
			...extraContext,
		};
	}
}

// ─── Rule Evaluation ─────────────────────────────────────────────

function evaluateTargetingRules(rules: TargetingRule[], context: EvaluationContext): boolean {
	if (rules.length === 0) return true;

	return rules.every((rule) => {
		const fieldValue = getFieldValue(rule.field, context);
		if (fieldValue === null || fieldValue === undefined) return false;

		const values = Array.isArray(rule.value) ? rule.value : [rule.value];
		const strField = String(fieldValue);

		switch (rule.operator) {
			case "in":
				return values.some((v) => strField === String(v));
			case "notIn":
				return values.every((v) => strField !== String(v));
			case "gte": {
				const numVal = Number(values[0]);
				const numField = Number(fieldValue);
				if (isNaN(numVal) || isNaN(numField)) return false;
				return numField >= numVal;
			}
			case "lt": {
				const numVal = Number(values[0]);
				const numField = Number(fieldValue);
				if (isNaN(numVal) || isNaN(numField)) return false;
				return numField < numVal;
			}
			default:
				return false;
		}
	});
}

function getFieldValue(
	field: TargetingRuleField | string,
	context: EvaluationContext,
): string | number | null {
	switch (field) {
		case "planTier":
			return context.planTier ?? "free";
		case "orgSlug":
			return context.orgSlug ?? "";
		case "geo":
			return context.geo ?? null;
		case "orgAge":
			return context.orgAgeDays;
		case "manualList":
			return context.organizationId;
		default:
			// Support dynamic fields from context
			const val = context[field];
			return val !== undefined ? (typeof val === "string" ? val : String(val)) : null;
	}
}

// ─── Percentage Rollout ──────────────────────────────────────────

/**
 * Deterministic hash-based rollout check.
 * Uses orgId to consistently assign orgs to rollout groups.
 * This ensures the same org always sees the same result for a given flag.
 */
function isInRollout(orgId: string, flagKey: string, percentage: number): boolean {
	let hash = 0;
	const combined = `${flagKey}:${orgId}`;
	for (let i = 0; i < combined.length; i++) {
		const char = combined.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0; // Convert to 32bit integer
	}

	// Map hash to 0-100 range
	const slot = Math.abs(hash) % 100;
	return slot < percentage;
}

// ─── Cache Invalidation ─────────────────────────────────────────

export function invalidateFlagCache(flagKey: string): void {
	flagCache.delete(flagKey);
}

export function invalidateOrgContextCache(orgId: string): void {
	orgContextCache.delete(orgId);
}

export function clearAllCaches(): void {
	flagCache.clear();
	orgContextCache.clear();
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Evaluate whether a feature flag is enabled for a given organization.
 *
 * @param orgId - Organization ID to evaluate for
 * @param flagKey - Feature flag key (e.g. "analytics-v2")
 * @param extraContext - Optional evaluation context overrides (geo, etc.)
 * @returns boolean — true if the flag is enabled for this org
 */
export async function isFeatureEnabled(
	orgId: string,
	flagKey: string,
	extraContext?: Partial<EvaluationContext>,
): Promise<boolean> {
	if (!orgId || !flagKey) return false;

	const flag = await loadFlagByKey(flagKey);
	if (!flag) return false;

	// Step 1: Kill switch — force off for ALL orgs
	if (flag.killSwitch) return false;

	// Step 2: Org override — per-organization override
	const override = flag.overrides.find((o) => o.organizationId === orgId);
	if (override !== undefined) return override.enabled;

	// Step 3: Build context for targeting rules
	const context = await buildOrgContext(orgId, extraContext);

	// Step 4: Targeting rules — evaluate plan tier, geo, slug, etc.
	if (flag.targetingRules) {
		const rules = parseTargetingRules(flag.targetingRules);
		if (rules.length > 0) {
			const rulesPass = evaluateTargetingRules(rules, context);
			if (!rulesPass) return false;
		}
	}

	// Step 5: Percentage rollout
	if (flag.rolloutPercentage !== null && flag.rolloutPercentage !== undefined) {
		// If 0%, never enabled. If 100%, always enabled.
		if (flag.rolloutPercentage <= 0) return false;
		if (flag.rolloutPercentage >= 100) return flag.enabled;

		return isInRollout(orgId, flagKey, flag.rolloutPercentage);
	}

	// Step 6: Fallback — flag's default enabled state
	return flag.enabled;
}

/**
 * Evaluate a feature flag for a specific organization with a manual override check first.
 * Used by API procedures to check flags with override support.
 *
 * @param orgId - Organization ID
 * @param flagKey - Feature flag key
 * @param extraContext - Optional context overrides
 * @returns boolean
 */
export async function checkFlagWithOverride(
	orgId: string,
	flagKey: string,
	extraContext?: Partial<EvaluationContext>,
): Promise<boolean> {
	return isFeatureEnabled(orgId, flagKey, extraContext);
}

// ─── Helpers ─────────────────────────────────────────────────────

function parseTargetingRules(rules: Record<string, unknown>): TargetingRule[] {
	try {
		// Support both { rules: [...] } format and direct array format
		const raw = Array.isArray(rules)
			? rules
			: Array.isArray((rules as { rules?: unknown }).rules)
				? (rules as { rules: unknown[] }).rules
				: [];

		return raw.filter((r): r is TargetingRule => {
			if (!r || typeof r !== "object") return false;
			const rule = r as Record<string, unknown>;
			return (
				typeof rule.field === "string" &&
				typeof rule.operator === "string" &&
				rule.value !== undefined
			);
		});
	} catch {
		return [];
	}
}

// ─── Export types ────────────────────────────────────────────────

export type { EvaluationContext };
