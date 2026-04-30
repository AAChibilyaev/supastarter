import { syncRecentSubscriptionsToWallet } from "@repo/api/lib/wallet-sync";
import { logger } from "@repo/logs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const expected = process.env.WALLET_CRON_SECRET;
	if (!expected) return false;
	const auth = request.headers.get("authorization");
	if (auth === `Bearer ${expected}`) return true;
	return request.headers.get("x-cron-secret") === expected;
}

/**
 * Safety-net cron: re-syncs included monthly AI credits for any active
 * subscription purchase whose webhook may have been dropped or misordered.
 * The underlying `apply_subscription_to_wallet` PL function is idempotent
 * per (subscriptionId, current calendar month), so calling this hourly
 * (and from the webhook) is safe.
 */
export async function POST(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	try {
		const result = await syncRecentSubscriptionsToWallet();
		return NextResponse.json(result);
	} catch (error) {
		logger.error("sync-subscriptions cron failed", { error });
		return NextResponse.json({ error: "sync_failed" }, { status: 500 });
	}
}
