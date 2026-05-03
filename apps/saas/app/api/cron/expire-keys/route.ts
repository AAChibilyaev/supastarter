import { revokeExpiredApiKeys } from "@repo/database";
import { logger } from "@repo/logs";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const expected = process.env.SEARCH_CRON_SECRET;
	if (!expected) {
		logger.warn("SEARCH_CRON_SECRET is not set — expire-keys cron will always reject requests");
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
		const revokedCount = await revokeExpiredApiKeys();

		logger.info("Expired API keys cleanup complete", { revokedCount });

		if (revokedCount > 0) {
			Sentry.captureEvent({
				message: `expire-keys: ${revokedCount} expired API keys revoked`,
				level: "info",
				tags: {
					"cron.job": "expire-keys",
					"cron.revokedCount": String(revokedCount),
				},
			});
		}

		return NextResponse.json({ revoked: revokedCount });
	} catch (error) {
		logger.error("expire-keys cron failed", { error: String(error) });
		Sentry.captureException(error, {
			tags: { "cron.job": "expire-keys" },
		});
		return NextResponse.json({ error: "cleanup_failed" }, { status: 500 });
	}
}
