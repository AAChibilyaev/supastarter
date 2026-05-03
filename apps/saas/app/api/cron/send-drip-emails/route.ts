import { findUsersForDripDay, recordDripSent } from "@repo/database/prisma/queries/drip-emails";
import { logger } from "@repo/logs";
import { sendEmail } from "@repo/mail";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DRIP_DAYS = [0, 1, 3, 7, 14, 21] as const;

function isAuthorized(request: Request): boolean {
	const expected = process.env.SEARCH_CRON_SECRET;
	if (!expected) {
		logger.warn(
			"SEARCH_CRON_SECRET is not set — send-drip-emails cron will always reject requests",
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

async function sendDripForDay(
	dripDay: (typeof DRIP_DAYS)[number],
): Promise<{ sent: number; errors: number }> {
	const templateId = `dripDay${dripDay}` as const;
	const users = await findUsersForDripDay(dripDay);

	if (users.length === 0) {
		return { sent: 0, errors: 0 };
	}

	let sent = 0;
	let errors = 0;

	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aacsearch.io";

	for (const user of users) {
		try {
			const context: { name: string } & Record<string, string> = { name: user.name };

			if (dripDay === 0) {
				context.quickstartUrl = `${appUrl}/getting-started`;
			} else if (dripDay === 1) {
				context.videoUrl = `${appUrl}/docs/tutorials/first-collection`;
				context.collectionUrl = `${appUrl}/getting-started`;
			} else if (dripDay === 3) {
				context.connectorUrl = `${appUrl}/connectors`;
				context.docsUrl = `${appUrl}/docs/connectors`;
			} else if (dripDay === 7) {
				context.settingsUrl = `${appUrl}/search/settings`;
			} else if (dripDay === 14) {
				context.caseStudyUrl = `${appUrl}/blog/case-study`;
				context.blogUrl = `${appUrl}/blog`;
			} else if (dripDay === 21) {
				context.billingUrl = `${appUrl}/settings/billing`;
			}

			await sendEmail({
				to: user.email,
				templateId,
				context,
				locale: "en",
			});

			await recordDripSent(user.userId, dripDay);
			sent++;
		} catch (error) {
			logger.error(`Failed to send dripDay${dripDay} to ${user.email}`, { error });
			errors++;
		}
	}

	return { sent, errors };
}

export async function POST(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	try {
		const results: Record<string, { sent: number; errors: number }> = {};

		for (const dripDay of DRIP_DAYS) {
			const result = await sendDripForDay(dripDay);
			results[`day${dripDay}`] = result;
		}

		const totalSent = Object.values(results).reduce((sum, r) => sum + r.sent, 0);
		const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

		logger.info("Drip email cron completed", { results, totalSent, totalErrors });

		return NextResponse.json({
			success: true,
			results,
			totalSent,
			totalErrors,
		});
	} catch (error) {
		logger.error("Drip email cron failed", { error });
		return NextResponse.json({ error: "drip_cron_failed" }, { status: 500 });
	}
}
