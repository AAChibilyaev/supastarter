import {
	aggregateSearchUsage,
	getAiWalletByOrganizationId,
	getOrganizationById,
	getPurchasesByOrganizationId,
} from "@repo/database";
import { logger } from "@repo/logs";
import { getPlanIdByProviderPriceId } from "@repo/payments";
import { config as paymentsConfig } from "@repo/payments/config";

interface QuotaSnapshot {
	planId: string;
	searchPerMonth: number;
	indexedDocuments: number;
	searchQueriesUsedThisPeriod: number;
	indexedDocumentsUsedThisPeriod: number;
	periodStart: Date;
	periodEnd: Date;
}

const cache = new Map<string, { snapshot: QuotaSnapshot; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

function monthBounds(now: Date = new Date()) {
	const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	return { periodStart, periodEnd };
}

async function resolvePlanIdForOrg(organizationId: string): Promise<string> {
	const purchases = await getPurchasesByOrganizationId(organizationId);
	const subscription = purchases.find((p) => p.type === "SUBSCRIPTION");
	if (subscription) {
		const planId = getPlanIdByProviderPriceId(subscription.priceId);
		if (planId) return planId;
	}
	return "free";
}

export async function resolveOrgPlanQuota(organizationId: string): Promise<QuotaSnapshot> {
	const cached = cache.get(organizationId);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.snapshot;
	}

	const org = await getOrganizationById(organizationId);
	if (!org) {
		// Defensive — caller should already have verified key→org mapping.
		throw new Error(`organization_not_found:${organizationId}`);
	}

	const planId = await resolvePlanIdForOrg(organizationId);
	const limits = paymentsConfig.searchLimits[planId] ?? paymentsConfig.searchLimits.free;
	const { periodStart, periodEnd } = monthBounds();

	const usage = await aggregateSearchUsage(organizationId, periodStart);
	const searchQueriesUsedThisPeriod = usage
		.filter((row) => row.type === "search_query" || row.type === "search")
		.reduce((acc, row) => acc + row.total, 0);
	const indexedDocumentsUsedThisPeriod = usage
		.filter(
			(row) =>
				row.type === "ingest_write" ||
				row.type === "documents_indexed" ||
				row.type === "ingest_enqueued" ||
				row.type === "ingest",
		)
		.reduce((acc, row) => acc + row.total, 0);

	const snapshot: QuotaSnapshot = {
		planId,
		searchPerMonth: limits.searchPerMonth,
		indexedDocuments: limits.indexedDocuments,
		searchQueriesUsedThisPeriod,
		indexedDocumentsUsedThisPeriod,
		periodStart,
		periodEnd,
	};

	cache.set(organizationId, { snapshot, expiresAt: Date.now() + CACHE_TTL_MS });
	return snapshot;
}

export function invalidateOrgQuotaCache(organizationId: string): void {
	cache.delete(organizationId);
}

// ─── Wallet overage helpers ─────────────────────────────────────

export interface WalletOverageInfo {
	overageEnabled: boolean;
	overageLimitKopecks: bigint;
	overageUsedKopecks: bigint;
}

/**
 * Check if an org has wallet-based overage available.
 * Fail-open: returns { overageEnabled: false } on any error.
 */
export async function getOrgWalletOverage(orgId: string): Promise<WalletOverageInfo> {
	try {
		const wallet = await getAiWalletByOrganizationId(orgId);
		if (!wallet) {
			return {
				overageEnabled: false,
				overageLimitKopecks: BigInt(0),
				overageUsedKopecks: BigInt(0),
			};
		}
		const overageEnabled = wallet.overageLimitKopecks > BigInt(0);
		return {
			overageEnabled,
			overageLimitKopecks: wallet.overageLimitKopecks,
			overageUsedKopecks: wallet.overageUsedKopecks,
		};
	} catch (error) {
		logger.error("getOrgWalletOverage failed", { error, orgId });
		return {
			overageEnabled: false,
			overageLimitKopecks: BigInt(0),
			overageUsedKopecks: BigInt(0),
		};
	}
}
