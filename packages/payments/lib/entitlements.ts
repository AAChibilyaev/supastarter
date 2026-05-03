/**
 * AACsearch entitlement system — plan resolution, feature matrix, quota checking.
 *
 * Every API request passes through: Auth gate → Feature gate → Quota gate → Rate gate.
 * If any gate closes, the request is rejected BEFORE reaching Typesense.
 *
 * This file is separate from lib/plans.ts (payment provider plans) to avoid conflicts.
 */

import { db } from "@repo/database";
import { logger } from "@repo/logs";

import { getPlanIdByProviderPriceId } from "../index";

// ─── Types ──────────────────────────────────────────────────────

export type PlanId = "free" | "starter" | "pro" | "business" | "enterprise";

export interface PlanFeatures {
	synonyms: boolean;
	curations: boolean;
	analytics: "none" | "basic" | "full";
	customDomain: boolean;
	customBranding: boolean;
	multiSearch: boolean;
	scopedTokens: boolean;
	apiAccess: boolean;
	widget: boolean;
}

export interface PlanLimits {
	maxIndexes: number;
	maxDocuments: number;
	maxSearchesPerMonth: number;
	maxApiKeys: number;
	apiKeysPerIndex: number;
	rateLimitPerMinute: number;
	maxProjects: number;
	analyticsRetentionDays: number;
}

export interface PlanInfo {
	planId: PlanId;
	name: string;
	features: PlanFeatures;
	limits: PlanLimits;
	status: "active" | "trialing" | "past_due" | "canceled" | "expired";
	graceReadsUntil: Date | null;
	graceWritesUntil: Date | null;
	trialEndsAt: Date | null;
}

export interface QuotaInfo {
	resource: string;
	allowed: boolean;
	current: number;
	limit: number;
	remaining: number;
	isUnlimited: boolean;
	periodStart: Date;
	periodEnd: Date;
}

// ─── Feature matrix ─────────────────────────────────────────────

const PLANS: Record<PlanId, { name: string; features: PlanFeatures; limits: PlanLimits }> = {
	free: {
		name: "Free",
		features: {
			synonyms: false,
			curations: false,
			analytics: "basic",
			customDomain: false,
			customBranding: false,
			multiSearch: true,
			scopedTokens: false,
			apiAccess: true,
			widget: true,
		},
		limits: {
			maxIndexes: 1,
			maxDocuments: 500,
			maxSearchesPerMonth: 1_000,
			maxApiKeys: 5,
			apiKeysPerIndex: 2,
			rateLimitPerMinute: 60,
			maxProjects: 1,
			analyticsRetentionDays: 7,
		},
	},
	starter: {
		name: "Starter",
		features: {
			synonyms: false,
			curations: false,
			analytics: "full",
			customDomain: true,
			customBranding: false,
			multiSearch: true,
			scopedTokens: true,
			apiAccess: true,
			widget: true,
		},
		limits: {
			maxIndexes: 3,
			maxDocuments: 10_000,
			maxSearchesPerMonth: 50_000,
			maxApiKeys: 20,
			apiKeysPerIndex: 5,
			rateLimitPerMinute: 600,
			maxProjects: 3,
			analyticsRetentionDays: 30,
		},
	},
	pro: {
		name: "Pro",
		features: {
			synonyms: true,
			curations: true,
			analytics: "full",
			customDomain: true,
			customBranding: true,
			multiSearch: true,
			scopedTokens: true,
			apiAccess: true,
			widget: true,
		},
		limits: {
			maxIndexes: 10,
			maxDocuments: 100_000,
			maxSearchesPerMonth: 500_000,
			maxApiKeys: 100,
			apiKeysPerIndex: 20,
			rateLimitPerMinute: 6_000,
			maxProjects: 10,
			analyticsRetentionDays: 90,
		},
	},
	business: {
		name: "Business",
		features: {
			synonyms: true,
			curations: true,
			analytics: "full",
			customDomain: true,
			customBranding: true,
			multiSearch: true,
			scopedTokens: true,
			apiAccess: true,
			widget: true,
		},
		limits: {
			maxIndexes: 50,
			maxDocuments: 1_000_000,
			maxSearchesPerMonth: -1,
			maxApiKeys: 500,
			apiKeysPerIndex: 50,
			rateLimitPerMinute: 60_000,
			maxProjects: 50,
			analyticsRetentionDays: 365,
		},
	},
	enterprise: {
		name: "Enterprise",
		features: {
			synonyms: true,
			curations: true,
			analytics: "full",
			customDomain: true,
			customBranding: true,
			multiSearch: true,
			scopedTokens: true,
			apiAccess: true,
			widget: true,
		},
		limits: {
			maxIndexes: -1,
			maxDocuments: -1,
			maxSearchesPerMonth: -1,
			maxApiKeys: -1,
			apiKeysPerIndex: -1,
			rateLimitPerMinute: -1,
			maxProjects: -1,
			analyticsRetentionDays: 365,
		},
	},
};

// ─── Plan resolution ────────────────────────────────────────────

const planCache = new Map<string, { plan: PlanInfo; expiresAt: number }>();

function getPeriodBounds(): { start: Date; end: Date } {
	const now = new Date();
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
	return { start, end };
}

/**
 * Resolve the active plan for an organization.
 * Order: active subscription → priceId → planId → feature set → fallback free.
 * Cached 60s to avoid DB hammering.
 */
export async function resolveOrgPlan(orgId: string): Promise<PlanInfo> {
	const now = Date.now();
	const cached = planCache.get(orgId);
	if (cached && cached.expiresAt > now) return cached.plan;

	try {
		const purchase = await db.purchase.findFirst({
			where: { organizationId: orgId, type: "SUBSCRIPTION" },
			orderBy: { createdAt: "desc" },
		});

		const planId = resolvePlanId(purchase);
		const planDef = PLANS[planId];
		if (!planDef) return buildFreePlan();

		const info = buildPlanInfo(planId, planDef, purchase);
		planCache.set(orgId, { plan: info, expiresAt: now + 60_000 });
		return info;
	} catch (error) {
		logger.error("resolveOrgPlan failed", { error, orgId });
		return buildFreePlan();
	}
}

function resolvePlanId(purchase: { priceId: string } | null): PlanId {
	if (!purchase) return "free";
	const pid = getPlanIdByProviderPriceId(purchase.priceId);
	if (
		pid === "free" ||
		pid === "starter" ||
		pid === "pro" ||
		pid === "business" ||
		pid === "enterprise"
	) {
		return pid;
	}
	return "free";
}

const GRACE_READ_DAYS = 7;

function buildFreePlan(): PlanInfo {
	return {
		planId: "free",
		name: PLANS.free.name,
		features: { ...PLANS.free.features },
		limits: { ...PLANS.free.limits },
		status: "active",
		graceReadsUntil: null,
		graceWritesUntil: null,
		trialEndsAt: null,
	};
}

function buildPlanInfo(
	planId: PlanId,
	planDef: (typeof PLANS)[PlanId],
	purchase: { status: string | null; createdAt: Date; updatedAt: Date } | null,
): PlanInfo {
	const status = purchase?.status ?? "active";
	const now = new Date();
	let graceReadsUntil: Date | null = null;
	let graceWritesUntil: Date | null = null;
	let resolvedStatus: PlanInfo["status"] = "active";

	if (status === "canceled" || status === "incomplete_expired") {
		resolvedStatus = "canceled";
		if (purchase?.updatedAt) {
			graceReadsUntil = new Date(purchase.updatedAt.getTime() + GRACE_READ_DAYS * 86400_000);
			if (graceReadsUntil <= now) graceReadsUntil = null;
		}
		graceWritesUntil = null;
	} else if (status === "past_due") {
		resolvedStatus = "past_due";
		graceReadsUntil = new Date(now.getTime() + 3 * 86400_000);
		graceWritesUntil = null;
	} else if (status === "trialing") {
		resolvedStatus = "trialing";
	}

	return {
		planId,
		name: planDef.name,
		features: { ...planDef.features },
		limits: { ...planDef.limits },
		status: resolvedStatus,
		graceReadsUntil,
		graceWritesUntil,
		trialEndsAt: null,
	};
}

export function invalidatePlanCache(orgId: string): void {
	planCache.delete(orgId);
}

// ─── Feature checks ─────────────────────────────────────────────

export function checkFeature(plan: PlanInfo, feature: keyof PlanFeatures): boolean {
	const value = plan.features[feature];
	if (typeof value === "boolean") return value;
	return value === "full";
}

export function getRequiredPlanForFeature(feature: keyof PlanFeatures): string {
	for (const [, pdef] of Object.entries(PLANS)) {
		const val = pdef.features[feature];
		if (typeof val === "boolean" ? val : val === "full") return pdef.name;
	}
	return "Enterprise";
}

// ─── Quota checks ───────────────────────────────────────────────

export async function checkQuota(orgId: string, resource: "search" | "ingest"): Promise<QuotaInfo> {
	const plan = await resolveOrgPlan(orgId);
	const period = getPeriodBounds();

	// Grace period for writes
	if (resource === "ingest" && plan.graceWritesUntil === null && plan.status === "canceled") {
		return {
			resource,
			allowed: false,
			current: 0,
			limit: 0,
			remaining: 0,
			isUnlimited: false,
			periodStart: period.start,
			periodEnd: period.end,
		};
	}

	// Grace period for reads
	if (resource === "search" && plan.graceReadsUntil === null && plan.status === "canceled") {
		return {
			resource,
			allowed: false,
			current: 0,
			limit: 0,
			remaining: 0,
			isUnlimited: false,
			periodStart: period.start,
			periodEnd: period.end,
		};
	}

	const limit = resource === "search" ? plan.limits.maxSearchesPerMonth : plan.limits.maxDocuments;
	if (limit === -1) {
		return {
			resource,
			allowed: true,
			current: 0,
			limit: -1,
			remaining: -1,
			isUnlimited: true,
			periodStart: period.start,
			periodEnd: period.end,
		};
	}

	try {
		const typeFilter = resource === "search" ? "search" : "ingest_enqueued";
		const agg = await db.searchUsageEvent.aggregate({
			where: {
				organizationId: orgId,
				type: { contains: typeFilter },
				createdAt: { gte: period.start, lte: period.end },
			},
			_sum: { count: true },
		});
		const current = Number(agg._sum.count ?? 0);
		return {
			resource,
			allowed: current < limit,
			current,
			limit,
			remaining: Math.max(0, limit - current),
			isUnlimited: false,
			periodStart: period.start,
			periodEnd: period.end,
		};
	} catch (error) {
		logger.error("checkQuota failed", { error, orgId, resource });
		return {
			resource,
			allowed: true,
			current: 0,
			limit,
			remaining: limit,
			isUnlimited: false,
			periodStart: period.start,
			periodEnd: period.end,
		};
	}
}

export function checkHardLimit(
	current: number,
	limit: number,
	softThreshold = 0.9,
): {
	withinLimit: boolean;
	isSoft: boolean;
	percentUsed: number;
} {
	if (limit === -1) return { withinLimit: true, isSoft: false, percentUsed: 0 };
	const percentUsed = current / limit;
	if (current >= limit) return { withinLimit: false, isSoft: false, percentUsed };
	if (percentUsed >= softThreshold) return { withinLimit: true, isSoft: true, percentUsed };
	return { withinLimit: true, isSoft: false, percentUsed };
}
