import type { PaymentsConfig } from "./types";

/**
 * AI Wallet configuration that piggybacks on the payments config so that
 * subscription event handlers can resolve a plan → included credits mapping
 * without a separate config import. All amounts are in kopecks (RUB minor
 * units). `0n` means no included credits for that plan.
 */
export interface AiWalletConfig {
	/**
	 * Map of plan id → kopecks included with the active subscription each month.
	 * Plan ids must match keys in `plans` below.
	 */
	monthlyIncludedByPlan: Record<string, bigint>;
	/**
	 * Default kopecks balance below which AI_LOW_BALANCE notifications fire.
	 */
	lowBalanceThresholdKopecks: bigint;
	/**
	 * Default reservation lifetime in seconds before stale reservations are released.
	 */
	reservationTtlSeconds: number;
	/**
	 * Whether overage is allowed by default. Per-org override lives in the wallet row.
	 */
	overageDefaultEnabled: boolean;
	maxOverageKopecks: bigint;
}

export interface SearchPlanLimits {
	searchPerMonth: number;
	indexedDocuments: number;
	/** Overage rate in USD microcents per search operation (0 = no overage). */
	overageRateUsdMicrosPerSearch: number;
}

export interface PaymentsConfigWithWallet extends PaymentsConfig {
	aiWallet: AiWalletConfig;
	searchLimits: Record<string, SearchPlanLimits>;
}

/** Read an integer env var with fallback. */
function intFromEnv(key: string, fallback: number): number {
	const raw = process.env[key];
	if (raw === undefined || raw === "") return fallback;
	const val = Number(raw);
	return Number.isFinite(val) ? val : fallback;
}

export const config: PaymentsConfigWithWallet = {
	billingAttachedTo: "user",
	requireActiveSubscription: false,
	aiWallet: {
		monthlyIncludedByPlan: {
			free: BigInt(10_000), // 100 ₽ promo
			starter: BigInt(100_000), // 1 000 ₽
			pro: BigInt(500_000), // 5 000 ₽
			business: BigInt(3_000_000), // 30 000 ₽
		},
		lowBalanceThresholdKopecks: BigInt(20_000), // 200 ₽
		reservationTtlSeconds: 300,
		overageDefaultEnabled: false,
		maxOverageKopecks: BigInt(10_000), // 100 ₽
	},
	searchLimits: {
		free: {
			searchPerMonth: 50_000,
			indexedDocuments: 10_000,
			overageRateUsdMicrosPerSearch: intFromEnv("OVERAGE_RATE_FREE", 0),
		},
		starter: {
			searchPerMonth: 1_000_000,
			indexedDocuments: 250_000,
			overageRateUsdMicrosPerSearch: intFromEnv("OVERAGE_RATE_STARTER", 500),
		},
		pro: {
			searchPerMonth: 10_000_000,
			indexedDocuments: 2_000_000,
			overageRateUsdMicrosPerSearch: intFromEnv("OVERAGE_RATE_PRO", 300),
		},
		business: {
			searchPerMonth: 50_000_000,
			indexedDocuments: 10_000_000,
			overageRateUsdMicrosPerSearch: intFromEnv("OVERAGE_RATE_BUSINESS", 200),
		},
	},
	plans: {
		starter: {
			prices: [
				{
					type: "subscription",
					priceId: process.env.PRICE_ID_STARTER_MONTHLY as string,
					interval: "month",
					amount: 12,
					currency: "USD",
					seatBased: false,
					trialPeriodDays: 7,
				},
				{
					type: "subscription",
					priceId: process.env.PRICE_ID_STARTER_YEARLY as string,
					interval: "year",
					amount: 120,
					currency: "USD",
					seatBased: false,
					trialPeriodDays: 7,
				},
			],
		},
		pro: {
			recommended: true,
			prices: [
				{
					type: "subscription",
					priceId: process.env.PRICE_ID_PRO_MONTHLY as string,
					interval: "month",
					amount: 29,
					currency: "USD",
					seatBased: true,
					trialPeriodDays: 7,
				},
				{
					type: "subscription",
					priceId: process.env.PRICE_ID_PRO_YEARLY as string,
					interval: "year",
					amount: 290,
					currency: "USD",
					seatBased: true,
					trialPeriodDays: 7,
				},
			],
		},
		lifetime: {
			prices: [
				{
					type: "one-time",
					priceId: process.env.PRICE_ID_LIFETIME as string,
					amount: 799,
					currency: "USD",
				},
			],
		},
		enterprise: {
			isEnterprise: true,
		},
	},
};
