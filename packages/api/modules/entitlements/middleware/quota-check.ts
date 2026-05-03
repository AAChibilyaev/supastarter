/**
 * Hono middleware for plan-level quota checks on public endpoints.
 *
 * Used by public-handler.ts and v1 API routes to check quota before
 * accepting search/indexing requests.
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
 * Middleware that checks search quota before allowing the request.
 * Injects quota info into context for response headers.
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
			return {
				allowed: false,
				status: 429,
				error: resource === "search" ? "search_quota_exceeded" : "ingest_quota_exceeded",
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
