import { randomUUID } from "node:crypto";

import { db } from "@repo/database";
import { logger } from "@repo/logs";

export interface ChargeAiUsageInput {
	userId: string;
	requestId: string;
	model: string;
	inputTokens: number;
	outputTokens: number;
	costKopecks: bigint;
}

export interface ChargeAiUsageResult {
	charged: boolean;
	remainingBalanceKopecks: bigint;
	usageEventId: string;
}

/**
 * Charge a user's AI wallet for a completed AI request.
 *
 * - Finds or creates an AiWallet for the user.
 * - Checks idempotency via `requestId` (skips duplicate charges).
 * - Creates an AiUsageEvent and a debit transaction in a single `$transaction`.
 * - Returns whether a new charge occurred, the remaining balance, and the usage event id.
 */
export async function chargeAiUsage(input: ChargeAiUsageInput): Promise<ChargeAiUsageResult> {
	const { userId, requestId, model, inputTokens, outputTokens, costKopecks } = input;

	// Idempotency: check for existing usage event with this requestId
	const existingEvent = await db.aiUsageEvent.findFirst({
		where: { requestId },
		select: { id: true, walletId: true },
	});

	if (existingEvent) {
		// Already charged — return the existing state
		const wallet = await db.aiWallet.findUnique({
			where: { id: existingEvent.walletId },
			select: { availableBalanceKopecks: true },
		});
		return {
			charged: false,
			remainingBalanceKopecks: wallet?.availableBalanceKopecks ?? BigInt(0),
			usageEventId: existingEvent.id,
		};
	}

	// Find or create wallet for the user
	let wallet = await db.aiWallet.findUnique({ where: { userId } });

	if (!wallet) {
		wallet = await db.aiWallet.create({
			data: {
				userId,
				currency: "RUB",
				availableBalanceKopecks: BigInt(0),
				reservedBalanceKopecks: BigInt(0),
				includedMonthlyLimitKopecks: BigInt(0),
				includedUsedPeriodKopecks: BigInt(0),
				promoBalanceKopecks: BigInt(0),
				overageLimitKopecks: BigInt(0),
				overageUsedKopecks: BigInt(0),
				status: "active",
				periodStart: new Date(),
				periodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
			},
		});
	}

	const walletId = wallet.id;
	const totalTokens = inputTokens + outputTokens;

	// Perform the charge inside a transaction
	const result = await db.$transaction(async (tx) => {
		// Double-check idempotency inside transaction
		const existing = await tx.aiUsageEvent.findFirst({
			where: { requestId },
			select: { id: true },
		});
		if (existing) {
			const w = await tx.aiWallet.findUnique({
				where: { id: walletId },
				select: { availableBalanceKopecks: true },
			});
			return {
				charged: false,
				remainingBalanceKopecks: w?.availableBalanceKopecks ?? BigInt(0),
				usageEventId: existing.id,
			};
		}

		// Create the usage event
		const usageEvent = await tx.aiUsageEvent.create({
			data: {
				walletId,
				userId,
				operation: "chat_completion",
				provider: "openai",
				model,
				status: "completed",
				promptTokens: inputTokens,
				completionTokens: outputTokens,
				totalTokens,
				inputCostKopecks: costKopecks,
				outputCostKopecks: BigInt(0),
				flatFeeKopecks: BigInt(0),
				markupBps: 0,
				totalChargeKopecks: costKopecks,
				providerCostUsdMicros: BigInt(0),
				fxRateRubPerUsdMicros: BigInt(0),
				requestId,
				idempotencyKey: `charge-ai-usage:${requestId}`,
			},
		});

		// Debit the wallet: create transaction and decrement balance
		await tx.aiWalletTransaction.create({
			data: {
				walletId,
				userId,
				type: "debit",
				direction: "debit",
				amountKopecks: costKopecks,
				currency: "RUB",
				source: "prepaid",
				usageEventId: usageEvent.id,
				idempotencyKey: `tx:charge-ai-usage:${requestId}:${randomUUID()}`,
			},
		});

		const updatedWallet = await tx.aiWallet.update({
			where: { id: walletId },
			data: {
				availableBalanceKopecks: {
					decrement: costKopecks,
				},
			},
			select: { availableBalanceKopecks: true },
		});

		return {
			charged: true,
			remainingBalanceKopecks: updatedWallet.availableBalanceKopecks,
			usageEventId: usageEvent.id,
		};
	});

	// Check auto-recharge threshold and fire low-balance notification
	if (result.charged) {
		const threshold =
			wallet.autoRechargeEnabled && wallet.autoRechargeThresholdKopecks > BigInt(0)
				? wallet.autoRechargeThresholdKopecks
				: wallet.includedMonthlyLimitKopecks;
		if (threshold > BigInt(0) && result.remainingBalanceKopecks < threshold) {
			logger.warn(
				{
					userId,
					walletId,
					balanceKopecks: result.remainingBalanceKopecks.toString(),
					thresholdKopecks: threshold.toString(),
					autoRechargeEnabled: wallet.autoRechargeEnabled,
				},
				"chargeAiUsage: wallet balance below auto-recharge threshold",
			);
			// Fire-and-forget: trigger low-balance notification + auto-recharge
			void import("@repo/billing-wallet").then(({ notifyLowBalance }) => {
				notifyLowBalance(walletId).catch((err: unknown) =>
					logger.error("chargeAiUsage: notifyLowBalance failed", err),
				);
			});
		}
	}

	return result;
}
