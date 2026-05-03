import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { createNotification } from "@repo/notifications";

import { sendSlackAlert } from "./slack-alert";

const LOW_BALANCE_RATIO = 0.2; // 20% of included monthly limit
const CRITICAL_BALANCE_RATIO = 0.05; // 5% — triggers auto-recharge attempt
const DEFAULT_LOW_THRESHOLD_KOPECKS = BigInt(20_000); // 200 RUB
const DEFAULT_CRITICAL_THRESHOLD_KOPECKS = BigInt(5_000); // 50 RUB
const DEFAULT_RECHARGE_AMOUNT_KOPECKS = BigInt(100_000); // 1000 RUB

/**
 * Sends AI_LOW_BALANCE notifications to wallet owner(s), triggers auto-recharge,
 * and fires a Slack webhook alert if configured.
 *
 * Threshold logic:
 * 1. If wallet has auto-recharge configured → use wallet's autoRechargeThresholdKopecks
 * 2. Else if wallet has `includedMonthlyLimitKopecks > 0`:
 *    low = 20% of monthly limit, critical = 5%
 * 3. Fallback: low = 20_000 kopecks (200 RUB), critical = 5_000 kopecks (50 RUB)
 *
 * Auto-recharge amount:
 * 1. If wallet has auto-recharge configured → use wallet's autoRechargeAmountKopecks
 * 2. Else: monthly limit or 1000 RUB fallback
 */
export async function notifyLowBalance(walletId: string): Promise<void> {
	const wallet = await db.aiWallet.findUnique({ where: { id: walletId } });
	if (!wallet) return;

	const monthlyLimit = wallet.includedMonthlyLimitKopecks;

	// Use wallet's auto-recharge config when available and enabled
	if (wallet.autoRechargeEnabled && wallet.autoRechargeThresholdKopecks > BigInt(0)) {
		await applyThresholdCheck(wallet, {
			lowThreshold: wallet.autoRechargeThresholdKopecks,
			criticalThreshold: wallet.autoRechargeThresholdKopecks, // same as low for config-based
			rechargeAmount:
				wallet.autoRechargeAmountKopecks > BigInt(0)
					? wallet.autoRechargeAmountKopecks
					: DEFAULT_RECHARGE_AMOUNT_KOPECKS,
		});
		return;
	}

	// Fallback: compute from monthly limit
	const lowThreshold =
		monthlyLimit > BigInt(0)
			? (monthlyLimit * BigInt(Math.round(LOW_BALANCE_RATIO * 100))) / BigInt(100)
			: DEFAULT_LOW_THRESHOLD_KOPECKS;
	const criticalThreshold =
		monthlyLimit > BigInt(0)
			? (monthlyLimit * BigInt(Math.round(CRITICAL_BALANCE_RATIO * 100))) / BigInt(100)
			: DEFAULT_CRITICAL_THRESHOLD_KOPECKS;
	const rechargeAmount =
		monthlyLimit > BigInt(0) ? monthlyLimit : DEFAULT_RECHARGE_AMOUNT_KOPECKS;

	await applyThresholdCheck(wallet, { lowThreshold, criticalThreshold, rechargeAmount });
}

async function applyThresholdCheck(
	wallet: {
		id: string;
		organizationId: string | null;
		userId: string | null;
		availableBalanceKopecks: bigint;
		status: string;
		autoRechargeEnabled: boolean;
		autoRechargeThresholdKopecks: bigint;
		autoRechargeAmountKopecks: bigint;
	},
	opts: {
		lowThreshold: bigint;
		criticalThreshold: bigint;
		rechargeAmount: bigint;
	},
): Promise<void> {
	const { lowThreshold, criticalThreshold, rechargeAmount } = opts;
	const balance = wallet.availableBalanceKopecks;
	const isCritical = balance <= criticalThreshold;
	if (balance > lowThreshold) return;

	const recipients: string[] = [];
	if (wallet.userId) {
		recipients.push(wallet.userId);
	} else if (wallet.organizationId) {
		const members = await db.member.findMany({
			where: {
				organizationId: wallet.organizationId,
				role: { in: ["owner", "admin"] },
			},
			select: { userId: true },
		});
		recipients.push(...members.map((m) => m.userId));
	}

	const balanceRub = (Number(balance) / 100).toFixed(2);
	const lowThresholdRub = (Number(lowThreshold) / 100).toFixed(2);
	const link = wallet.organizationId
		? `/settings/billing/ai-credits?org=${wallet.organizationId}`
		: `/settings/billing/ai-credits`;

	const headline = isCritical
		? "AI wallet balance critically low — auto-recharge triggered"
		: "AI wallet balance is low";
	const title = isCritical ? "Critical: Top up your AI credits now" : "Top up your AI credits";

	// 1. In-app + email notification
	await Promise.all(
		recipients.map((userId: string) =>
			createNotification({
				userId,
				type: "AI_LOW_BALANCE",
				data: {
					headline,
					title,
					message: `Available: ${balanceRub} ₽ (threshold: ${lowThresholdRub} ₽)`,
				},
				link,
			}).catch((err: unknown) =>
				logger.error("notifyLowBalance: createNotification failed", err),
			),
		),
	);

	// 2. Slack webhook alert (if configured)
	await sendSlackAlert({
		text: isCritical
			? `⚡ *AI Wallet CRITICAL* — wallet \`${wallet.id}\``
			: `⚠️ *AI Wallet Low Balance* — wallet \`${wallet.id}\``,
		fallback: `AI Wallet ${isCritical ? "CRITICAL" : "Low Balance"} — ${balanceRub} ₽ remaining`,
		color: isCritical ? "#dc2626" : "#f59e0b",
		fields: [
			{ title: "Available Balance", value: `${balanceRub} ₽`, short: true },
			{ title: "Threshold", value: `${lowThresholdRub} ₽`, short: true },
			{
				title: "Owner",
				value: wallet.organizationId ?? wallet.userId ?? "unknown",
				short: true,
			},
		],
	});

	// 3. Auto-recharge trigger (only at critical threshold)
	if (isCritical) {
		await triggerAutoRecharge(wallet, rechargeAmount);
	}
}

/**
 * Attempts to create a pending auto-recharge order.
 * Uses the configured recharge amount. Deduplicates against existing pending orders.
 */
async function triggerAutoRecharge(
	wallet: {
		id: string;
		organizationId: string | null;
		userId: string | null;
	},
	rechargeAmount: bigint,
): Promise<void> {
	try {
		// Check for existing pending topup order to avoid duplicates
		const pendingOrder = await db.walletTopupOrder.findFirst({
			where: {
				walletId: wallet.id,
				status: "pending",
			},
		});

		if (pendingOrder) {
			logger.info("autoRecharge: pending topup already exists, skipping", {
				walletId: wallet.id,
				orderId: pendingOrder.id,
			});
			return;
		}

		await db.walletTopupOrder.create({
			data: {
				walletId: wallet.id,
				organizationId: wallet.organizationId,
				userId: wallet.userId,
				amountKopecks: rechargeAmount,
				currency: "RUB",
				status: "pending",
				provider: "auto_recharge",
				idempotencyKey: `auto_recharge_${wallet.id}_${Date.now()}`,
			},
		});

		logger.info("autoRecharge: pending order created", {
			walletId: wallet.id,
			amountKopecks: Number(rechargeAmount),
		});
	} catch (err) {
		logger.error("autoRecharge: failed to create topup order", err);
	}
}

export type { SlackAlertPayload } from "./slack-alert";
