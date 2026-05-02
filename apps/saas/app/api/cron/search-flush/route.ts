import { logger } from "@repo/logs";
import { flushAllSearchIngestBuffers } from "@repo/search";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const expected = process.env.SEARCH_CRON_SECRET;
	if (!expected) {
		logger.warn(
			"SEARCH_CRON_SECRET is not set — search-flush cron will always reject requests",
		);
		return false;
	}

	const auth = request.headers.get("authorization");
	if (auth === `Bearer ${expected}`) {
		return true;
	}

	const headerSecret = request.headers.get("x-cron-secret");
	return headerSecret === expected;
}

export async function POST(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	try {
		const result = await flushAllSearchIngestBuffers({ limitPerIndex: 500 });
		return NextResponse.json(result);
	} catch (error) {
		logger.error("search-flush cron failed", { error });
		return NextResponse.json({ error: "flush_failed" }, { status: 500 });
	}
}
