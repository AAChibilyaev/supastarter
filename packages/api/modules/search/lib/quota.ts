import {
	aggregateSearchUsage,
	getOrganizationById,
	getPurchasesByOrganizationId,
} from "@repo/database";
import { getPlanIdByProviderPriceId } from "@repo/payments";
import { config as paymentsConfig } from "@repo/payments/config";

interface QuotaSnapshot {
	planId: string;
	searchPerMonth: number;
	indexedDocuments: number;
	searchUsedThisPeriod: number;
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
	const searchUsedThisPeriod = usage
		.filter((row) => row.type === "search")
		.reduce((acc, row) => acc + row.total, 0);

	const snapshot: QuotaSnapshot = {
		planId,
		searchPerMonth: limits.searchPerMonth,
		indexedDocuments: limits.indexedDocuments,
		searchUsedThisPeriod,
		periodStart,
		periodEnd,
	};

	cache.set(organizationId, { snapshot, expiresAt: Date.now() + CACHE_TTL_MS });
	return snapshot;
}

export function invalidateOrgQuotaCache(organizationId: string): void {
	cache.delete(organizationId);
}
