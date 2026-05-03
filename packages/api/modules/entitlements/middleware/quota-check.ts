/**
 * Hono middleware for plan-level quota checks on public endpoints.
 *
 * Used by public-handler.ts and v1 API routes to check quota before
 * accepting search/indexing requests.
 *
 * Hard cap enforcement: when quota is exhausted and no overage budget exists,
 * returns 429 with a clear error message including upgrade link.
 * If wallet overage is enabled, allows through with wallet deduction.
 */

import { logger } from "@repo/logs";
import { checkQuota, checkHardLimit, invalidatePlanCache } from "@repo/payments/lib/entitlements";
import type { Context } from "hono";

import { getOrgWalletOverage } from "../../search/lib/quota";
import { checkAndSendQuotaAlerts } from "../services/usage-alerts";

export interface QuotaContext {
	planQuota: {
		allowed: boolean;
		remaining: number;
		isSoft: boolean;
		percentUsed: number;
		isOverage?: boolean;
	};
}

/**
 * Build the upgrade URL for the org. Uses the SaaS app billing page.
 */
function upgradeUrl(orgId: string): string {
	return `https://app.aacsearch.com/${orgId}/settings/billing`;
}

/**
 * Build an error message for quota-exceeded responses.
 */
function quotaExceededMessage(
	resource: "search" | "ingest",
	planName: string,
	current: number,
	limit: number,
): string {
	if (resource === "search") {
		return `Your ${planName} plan has exceeded its monthly search quota (${current}/${limit}). Upgrade your plan or enable overage billing to continue searching.`;
	}
	return `Your ${planName} plan has exceeded its monthly indexing quota (${current}/${limit}). Upgrade your plan to continue indexing.`;
}

/**
 * Middleware that checks search quota before allowing the request.
 * Injects quota info into context for response headers.
 *
 * Handles:
 * - Hard cap: block request with 429 + upgrade link (no overage budget)
 * - Overage bypass: allow through with wallet deduction
 * - Soft cap: allow but fire quota alert
 * - Unlimited: always allow
 */
export async function quotaCheck(
	c: Context,
	orgId: string,
	resource: "search" | "ingest",
): Promise<{
	allowed: boolean;
	isOverage?: boolean;
	status?: number;
	error?: string;
	errorPayload?: Record<string, unknown>;
	quota?: QuotaContext["planQuota"];
}> {
	try {
		const quota = await checkQuota(orgId, resource);
		const hardLimit = checkHardLimit(quota.current, quota.limit);

		if (!quota.allowed || quota.isHardCap) {
			// Check wallet overage before returning 429
			const walletOverage = await getOrgWalletOverage(orgId);
			if (
				walletOverage.overageEnabled &&
				walletOverage.overageUsedKopecks < walletOverage.overageLimitKopecks
			) {
				return {
					allowed: true,
					isOverage: true,
					quota: {
						allowed: true,
						remaining: 0,
						isSoft: false,
						percentUsed: hardLimit.percentUsed,
						isOverage: true,
					},
				};
			}
			// ── Hard cap: quota exceeded with no overage budget ──────────────
			const errCode = resource === "search" ? "search_quota_exceeded" : "ingest_quota_exceeded";
			return {
				allowed: false,
				status: 429,
				error: errCode,
				errorPayload: {
					error: errCode,
					message: quotaExceededMessage(resource, quota.planName, quota.current, quota.limit),
					plan: quota.planName,
					plan_id: quota.planId,
					limit: quota.limit,
					used: quota.current,
					upgrade_url: upgradeUrl(orgId),
					reset: quota.periodEnd.toISOString(),
				},
				quota: {
					allowed: false,
					remaining: 0,
					isSoft: false,
					percentUsed: 1,
				},
			};
		}

		// Fire-and-forget: check and send quota alerts asynchronously
		// This runs after every request that has quota usage, but only triggers
		// email/Slack when a threshold (80%/100%) is freshly crossed.
		if (hardLimit.percentUsed > 0) {
			checkAndSendQuotaAlerts({
				organizationId: orgId,
				resource,
				percentUsed: hardLimit.percentUsed,
				current: quota.current,
				limit: quota.limit,
			}).catch((err: unknown) =>
				logger.error("quotaCheck: alert failed", { error: err, orgId, resource }),
			);
		}

		return {
			allowed: true,
			quota: {
				allowed: true,
				remaining: quota.remaining,
				isSoft: hardLimit.isSoft,
				percentUsed: hardLimit.percentUsed,
			},
		};
	} catch (error) {
		logger.error("quotaCheck failed", { error, orgId, resource });
		// Fail open on errors — don't block traffic if quota system is down
		return {
			allowed: true,
			quota: {
				allowed: true,
				remaining: -1,
				isSoft: false,
				percentUsed: 0,
			},
		};
	}
}

/**
 * Parse organization ID from API key context or request.
 */
export function extractOrgId(c: Context): string | null {
	// From verified API key context (set by gatePublicSearchRequest)
	const verified = (c as unknown as Record<string, unknown>).verified as
		| { organizationId: string }
		| undefined;
	if (verified?.organizationId) return verified.organizationId;

	return null;
}

/**
 * Invalidate plan cache for an org (called on payment webhook).
 */
export { invalidatePlanCache };
