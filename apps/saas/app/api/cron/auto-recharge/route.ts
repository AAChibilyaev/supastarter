import { notifyLowBalance } from "@repo/billing-wallet";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
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
		// Find all active wallets that have auto-recharge enabled
		const wallets = await db.aiWallet.findMany({
			where: {
				autoRechargeEnabled: true,
				status: "active",
			},
			select: { id: true },
		});

		logger.info("auto-recharge cron: checking wallets", { count: wallets.length });

		let triggered = 0;
		let errors = 0;

		for (const wallet of wallets) {
			try {
				await notifyLowBalance(wallet.id);
				triggered++;
			} catch (err) {
				errors++;
				logger.error("auto-recharge cron: wallet check failed", {
					walletId: wallet.id,
					error: String(err),
				});
			}
		}

		return NextResponse.json({
			checked: wallets.length,
			triggered,
			errors,
		});
	} catch (error) {
		logger.error("auto-recharge cron failed", { error: String(error) });
		return NextResponse.json({ error: "auto_recharge_cron_failed" }, { status: 500 });
	}
}
