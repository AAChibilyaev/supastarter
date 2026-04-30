/**
 * Feature-gate middleware for oRPC procedures.
 *
 * Usage:
 *   export const getSynonyms = protectedProcedure
 *     .use(featureGate('synonyms'))
 *     .handler(...)
 *
 * The middleware resolves the org's plan, checks feature availability,
 * and throws ORPCError if the feature is not available.
 */

import { ORPCError } from "@orpc/server";
import type { PlanFeatures } from "@repo/payments/lib/entitlements";
import { checkFeature, resolveOrgPlan } from "@repo/payments/lib/entitlements";

type FeatureKey = keyof PlanFeatures;

const FEATURE_LABELS: Record<FeatureKey, string> = {
	synonyms: "Synonyms",
	curations: "Curated results",
	analytics: "Advanced analytics",
	customDomain: "Custom domain",
	customBranding: "White-label branding",
	multiSearch: "Multi-search",
	scopedTokens: "Scoped search tokens",
	apiAccess: "API access",
	widget: "Search widget",
};

/**
 * Middleware that checks if the org's plan includes the specified feature.
 * Injects the resolved plan into context for downstream use.
 */
export function featureGate(feature: FeatureKey) {
	return async ({
		context,
		next,
	}: {
		context: Record<string, unknown>;
		next: (opts?: { context?: Record<string, unknown> }) => Promise<unknown>;
	}) => {
		const session = context.session as { activeOrganizationId?: string } | undefined;
		const orgId = session?.activeOrganizationId;
		if (!orgId) {
			throw new ORPCError("FORBIDDEN", { message: "No active organization." });
		}

		const plan = await resolveOrgPlan(orgId);

		if (!checkFeature(plan, feature)) {
			const label = FEATURE_LABELS[feature] ?? feature;
			throw new ORPCError("FORBIDDEN", {
				message: `${label} requires ${plan.name} plan or higher. Current: ${plan.name}. Upgrade at /choose-plan.`,
			});
		}

		return next({ context: { ...context, plan } });
	};
}

/**
 * Write-specific feature gate that also checks grace period.
 * Blocks writes immediately on canceled subscriptions.
 */
export function writeGate(feature: FeatureKey) {
	return async ({
		context,
		next,
	}: {
		context: Record<string, unknown>;
		next: (opts?: { context?: Record<string, unknown> }) => Promise<unknown>;
	}) => {
		const session = context.session as { activeOrganizationId?: string } | undefined;
		const orgId = session?.activeOrganizationId;
		if (!orgId) {
			throw new ORPCError("FORBIDDEN", { message: "No active organization." });
		}

		const plan = await resolveOrgPlan(orgId);

		// Block writes during grace period
		if (plan.graceWritesUntil === null && plan.status === "canceled") {
			throw new ORPCError("PAYMENT_REQUIRED", {
				message: `Write operations blocked. Your ${plan.name} plan was canceled. Reactivate at /choose-plan.`,
			});
		}

		if (!checkFeature(plan, feature)) {
			const label = FEATURE_LABELS[feature] ?? feature;
			throw new ORPCError("FORBIDDEN", {
				message: `${label} requires ${plan.name} plan or higher.`,
			});
		}

		return next({ context: { ...context, plan } });
	};
}
