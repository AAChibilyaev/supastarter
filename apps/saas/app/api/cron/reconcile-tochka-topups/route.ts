import { reconcileStaleTopupOrders } from "@repo/api/lib/wallet-reconcile";
import { logger } from "@repo/logs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const expected = process.env.WALLET_CRON_SECRET;
	if (!expected) {
		logger.warn("WALLET_CRON_SECRET is not set — reconcile-tochka-topups cron will always reject requests");
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
		const result = await reconcileStaleTopupOrders();
		return NextResponse.json(result);
	} catch (error) {
		logger.error("reconcile-tochka-topups cron failed", { error });
		return NextResponse.json({ error: "reconcile_failed" }, { status: 500 });
	}
}
