import { logger } from "@repo/logs";
import { flushAllSearchIngestBuffers } from "@repo/search";
import * as Sentry from "@sentry/nextjs";
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

		// Report buffer lag as Sentry metric if unprocessed rows are accumulating
		if (result.totalFailures > 0) {
			Sentry.captureEvent({
				message: `search-flush: ${result.totalFailures} failures out of ${result.totalFlushed} processed`,
				level: "warning",
				tags: {
					"cron.job": "search-flush",
					"cron.processedIndexes": String(result.processedIndexes),
					"cron.totalFlushed": String(result.totalFlushed),
					"cron.totalFailures": String(result.totalFailures),
				},
			});
		}

		return NextResponse.json(result);
	} catch (error) {
		logger.error("search-flush cron failed", { error });
		Sentry.captureException(error, {
			tags: { "cron.job": "search-flush" },
		});
		return NextResponse.json({ error: "flush_failed" }, { status: 500 });
	}
}
