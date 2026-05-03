import { notifyLowBalance } from "@repo/billing-wallet";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { processAutoRechargePayments } from "@repo/payments";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const expected = process.env.WALLET_CRON_SECRET;
	if (!expected) {
		logger.warn(
			"WALLET_CRON_SECRET is not set — auto-recharge cron will always reject requests",
		);
		return false;
	}
	const auth = request.headers.get("authorization");
	if (auth === `Bearer ${expected}`) return true;
	return request.headers.get("x-cron-secret") === expected;
}

export async function POST(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	try {
		// Phase 1: Check all auto-recharge-enabled wallets for low balance
		const wallets = await db.aiWallet.findMany({
			where: {
				autoRechargeEnabled: true,
				status: "active",
			},
			select: { id: true },
		});

		logger.info("auto-recharge cron: checking wallets", { count: wallets.length });

		let notifications = 0;
		let notifyErrors = 0;

		for (const wallet of wallets) {
			try {
				await notifyLowBalance(wallet.id);
				notifications++;
			} catch (err) {
				notifyErrors++;
				logger.error("auto-recharge cron: wallet check failed", {
					walletId: wallet.id,
					error: String(err),
				});
			}
		}

		// Phase 2: Process pending auto-recharge orders via Stripe
		const paymentResult = await processAutoRechargePayments();

		return NextResponse.json({
			checked: wallets.length,
			notifications,
			notifyErrors,
			payments: paymentResult,
		});
	} catch (error) {
		logger.error("auto-recharge cron failed", { error: String(error) });
		return NextResponse.json({ error: "auto_recharge_cron_failed" }, { status: 500 });
	}
}
