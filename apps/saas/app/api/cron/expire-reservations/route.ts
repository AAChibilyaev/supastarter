import { expireStaleReservations } from "@repo/billing-wallet";
import { logger } from "@repo/logs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const expected = process.env.WALLET_CRON_SECRET;
	if (!expected) {
		logger.warn(
			"WALLET_CRON_SECRET is not set — expire-reservations cron will always reject requests",
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
		const expired = await expireStaleReservations();
		return NextResponse.json({ expired });
	} catch (error) {
		logger.error("expire-reservations cron failed", { error });
		return NextResponse.json({ error: "expire_failed" }, { status: 500 });
	}
}
