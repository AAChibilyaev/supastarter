import {
	aggregateSearchUsage,
	db,
	getAiWalletByOrganizationId,
	getOrganizationById,
	getPurchasesByOrganizationId,
} from "@repo/database";
import type { Prisma } from "@repo/database";
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

// ─── Wallet overage charge ──────────────────────────────────────

export interface ChargeWalletOverageResult {
	charged: boolean;
	kopecksCharged?: bigint;
	error?: string;
}

function buildOverageIdempotencyKey(orgId: string, requestId: string): string {
	return `search_overage:${orgId}:${requestId}`;
}

/**
 * Charge the AiWallet for over-limit searches.
 * Fire-and-forget — caller must NOT await this (use `void`).
 * All errors are caught and logged; never throws.
 *
 * Formula: chargeKopecks = searchCount × overageRateUsdMicrosPerSearch × fxRate / 10^12
 * Minimum charge: 1 kopeck.
 */
export async function chargeWalletOverage(params: {
	orgId: string;
	searchCount: number;
	planId?: string;
	requestId?: string;
}): Promise<ChargeWalletOverageResult> {
	const { orgId, searchCount, requestId = crypto.randomUUID() } = params;
	let planId = params.planId;

	try {
		const wallet = await getAiWalletByOrganizationId(orgId);
		if (!wallet || wallet.overageLimitKopecks <= BigInt(0)) {
			return { charged: false };
		}

		// Resolve planId if not provided
		if (!planId) {
			const snapshot = await resolveOrgPlanQuota(orgId);
			planId = snapshot.planId;
		}

		const overageRate = paymentsConfig.searchLimits[planId]?.overageRateUsdMicrosPerSearch ?? 0;
		if (overageRate <= 0) {
			return { charged: false };
		}

		// Fetch latest USD/RUB FX rate
		const fxRate = await db.fxRate.findFirst({
			where: { pair: "USD/RUB" },
			orderBy: { effectiveAt: "desc" },
		});
		if (!fxRate || fxRate.ratePer1UnitMicros <= BigInt(0)) {
			logger.error("chargeWalletOverage: no valid FX rate", { orgId });
			return { charged: false, error: "no_fx_rate" };
		}

		// chargeKopecks = searchCount * overageRateUsdMicros * ratePer1UnitMicros / 10^12
		const chargeRaw =
			(BigInt(searchCount) * BigInt(overageRate) * fxRate.ratePer1UnitMicros) /
			BigInt(1_000_000_000_000);
		const chargeKopecks = chargeRaw < BigInt(1) ? BigInt(1) : chargeRaw;

		// Check ceiling
		if (wallet.overageUsedKopecks + chargeKopecks > wallet.overageLimitKopecks) {
			return { charged: false, error: "overage_limit_reached" };
		}

		const idempotencyKey = buildOverageIdempotencyKey(orgId, requestId);

		await db.$transaction(async (tx) => {
			await tx.aiWallet.update({
				where: { id: wallet.id },
				data: {
					overageUsedKopecks: { increment: chargeKopecks },
					...(wallet.availableBalanceKopecks >= chargeKopecks
						? { availableBalanceKopecks: { decrement: chargeKopecks } }
						: {}),
				},
			});

			await tx.aiWalletTransaction.create({
				data: {
					walletId: wallet.id,
					organizationId: orgId,
					type: "debit",
					direction: "debit",
					source: "overage",
					amountKopecks: chargeKopecks,
					currency: "RUB",
					idempotencyKey,
					metadata: {
						planId,
						searchCount,
						overageRateUsdMicrosPerSearch: overageRate,
						fxRatePair: fxRate.pair,
						fxRatePer1UnitMicros: fxRate.ratePer1UnitMicros.toString(),
					} satisfies Prisma.InputJsonValue,
				},
			});
		});

		logger.info("Wallet overage charged", {
			orgId,
			planId,
			kopecksCharged: chargeKopecks.toString(),
			requestId,
		});

		return { charged: true, kopecksCharged: chargeKopecks };
	} catch (error) {
		logger.error("chargeWalletOverage failed", { error, orgId, planId });
		return { charged: false, error: "charge_failed" };
	}
}
