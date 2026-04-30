import { z } from "zod";

/**
 * Helpers for serializing `bigint` values to JSON-safe strings.
 * oRPC + JSON cannot stringify `bigint` natively — every kopecks field on the
 * wire is a numeric string ("12345" → 123.45 ₽).
 */
const bigintAsString = z.bigint().transform((v) => v.toString());

export const aiWalletDtoSchema = z.object({
	id: z.string(),
	userId: z.string().nullable(),
	organizationId: z.string().nullable(),
	currency: z.string(),
	availableBalanceKopecks: bigintAsString,
	reservedBalanceKopecks: bigintAsString,
	includedMonthlyLimitKopecks: bigintAsString,
	includedUsedPeriodKopecks: bigintAsString,
	promoBalanceKopecks: bigintAsString,
	overageLimitKopecks: bigintAsString,
	overageUsedKopecks: bigintAsString,
	status: z.string(),
	periodStart: z.date(),
	periodEnd: z.date(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const aiWalletTransactionDtoSchema = z.object({
	id: z.string(),
	walletId: z.string(),
	userId: z.string().nullable(),
	organizationId: z.string().nullable(),
	projectId: z.string().nullable(),
	type: z.string(),
	direction: z.string(),
	amountKopecks: bigintAsString,
	currency: z.string(),
	source: z.string(),
	usageEventId: z.string().nullable(),
	reservationId: z.string().nullable(),
	topupOrderId: z.string().nullable(),
	idempotencyKey: z.string(),
	metadata: z.unknown().nullable(),
	createdAt: z.date(),
});

export const aiUsageEventDtoSchema = z.object({
	id: z.string(),
	walletId: z.string(),
	userId: z.string().nullable(),
	organizationId: z.string().nullable(),
	projectId: z.string().nullable(),
	apiKeyId: z.string().nullable(),
	reservationId: z.string().nullable(),
	operation: z.string(),
	provider: z.string(),
	model: z.string(),
	status: z.string(),
	promptTokens: z.number().int(),
	completionTokens: z.number().int(),
	totalTokens: z.number().int(),
	totalChargeKopecks: bigintAsString,
	createdAt: z.date(),
});

export const createTopupInputSchema = z.object({
	amountKopecks: z
		.bigint()
		.min(BigInt(10000))
		.max(BigInt(100_000_000)),
	organizationId: z.string().optional(),
});

export const adminAdjustInputSchema = z.object({
	walletId: z.string(),
	amountKopecks: z.bigint().min(BigInt(1)),
	direction: z.enum(["credit", "debit"]),
	reason: z.string().min(10).max(500),
});
