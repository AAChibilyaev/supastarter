/**
 * Trial Expiry Cron — checks for organizations with expiring/expired trials
 * and sends notifications or auto-downgrades.
 *
 * Scheduled: daily (or configurable interval via cron trigger)
 *
 * Auth: Bearer token via TRIAL_CRON_SECRET env var (or falls back to SEARCH_CRON_SECRET)
 */

import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { sendEmail } from "@repo/mail";
import { createNotification } from "@repo/notifications";
import type { Locale } from "@repo/i18n";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const expected = process.env.TRIAL_CRON_SECRET || process.env.SEARCH_CRON_SECRET;
	if (!expected) {
		logger.warn("TRIAL_CRON_SECRET is not set — trial-expiry cron will always reject requests");
		return false;
	}

	const auth = request.headers.get("authorization");
	if (auth === `Bearer ${expected}`) {
		return true;
	}

	const headerSecret = request.headers.get("x-cron-secret");
	return headerSecret === expected;
}

interface CronResult {
	orgsWithActiveTrials: number;
	expiringSoonNotified: number;
	expiredTodayDowngraded: number;
	errors: string[];
}

export async function POST(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const result: CronResult = {
		orgsWithActiveTrials: 0,
		expiringSoonNotified: 0,
		expiredTodayDowngraded: 0,
		errors: [],
	};

	try {
		const now = new Date();
		const in3Days = new Date(now.getTime() + 3 * 86400_000);
		const in1Day = new Date(now.getTime() + 1 * 86400_000);
		const yesterday = new Date(now.getTime() - 1 * 86400_000);

		// Find all orgs with active trials (trialEndsAt is in the future or just expired)
		const orgs = await db.organization.findMany({
			where: {
				trialEndsAt: { not: null },
			},
			select: {
				id: true,
				name: true,
				trialEndsAt: true,
				members: {
					where: { role: { in: ["owner", "admin"] } },
					select: {
						user: {
							select: { id: true, email: true, locale: true, name: true },
						},
					},
				},
			},
		});

		result.orgsWithActiveTrials = orgs.length;

		for (const org of orgs) {
			try {
				if (!org.trialEndsAt) continue;

				const trialEnd = new Date(org.trialEndsAt);
				const daysUntilExpiry = Math.ceil(
					(trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
				);

				// Recipients: org owners and admins
				const recipients = org.members.map((m) => m.user);

				// Case 1: Trial expired (trialEndsAt is before now)
				if (trialEnd <= now) {
					// Auto-downgrade: clear trialEndsAt — entitlement system will fall back to Free
					await db.organization.update({
						where: { id: org.id },
						data: { trialEndsAt: null },
					});

					// Send notification about downgrade
					const appUrl = process.env.NEXT_PUBLIC_SAAS_URL ?? "https://aacsearch.io";
					for (const user of recipients) {
						await createNotification({
							userId: user.id,
							type: "WELCOME",
							data: {
								headline: "Your free trial has ended",
								message:
									"Your 14-day Pro trial has ended. Your account has been downgraded to the Free plan. Your data is preserved — upgrade anytime to regain Pro features.",
							},
							link: `${appUrl}/settings/billing`,
						}).catch((err: unknown) =>
							logger.error("Failed to send trial expiry notification", {
								userId: user.id,
								err,
							}),
						);

						// Also send email
						await sendEmail({
							to: user.email,
							locale: user.locale as Locale | undefined,
							templateId: "trialExpired",
							context: {
								orgName: org.name,
								billingUrl: `${appUrl}/settings/billing`,
							},
						}).catch((err: unknown) =>
							logger.error("Failed to send trial expiry email", {
								userId: user.id,
								err,
							}),
						);
					}

					result.expiredTodayDowngraded++;
					logger.info("Trial expired — auto-downgraded to Free", {
						orgId: org.id,
						orgName: org.name,
						trialEndedAt: trialEnd.toISOString(),
					});
					continue;
				}

				// Case 2: Trial expiring in 3 days
				if (daysUntilExpiry === 3) {
					for (const user of recipients) {
						await createNotification({
							userId: user.id,
							type: "WELCOME",
							data: {
								headline: "Your free trial ends in 3 days",
								message:
									"Your 14-day Pro trial is almost over. Upgrade to keep your Pro features and avoid service interruption.",
							},
							link: "/settings/billing",
						}).catch((err: unknown) =>
							logger.error("Failed to send trial expiring notification", {
								userId: user.id,
								err,
							}),
						);
					}
					result.expiringSoonNotified++;
				}

				// Case 3: Trial expiring in 1 day
				if (daysUntilExpiry === 1) {
					for (const user of recipients) {
						await createNotification({
							userId: user.id,
							type: "WELCOME",
							data: {
								headline: "Your free trial ends tomorrow",
								message:
									"Your Pro trial ends tomorrow. Upgrade now to keep your Pro features, or your account will be downgraded to Free with data preserved.",
							},
							link: "/settings/billing",
						}).catch((err: unknown) =>
							logger.error("Failed to send trial expiring soon notification", {
								userId: user.id,
								err,
							}),
						);
					}
					result.expiringSoonNotified++;
				}
			} catch (orgError) {
				const errorMsg =
					orgError instanceof Error ? orgError.message : "Unknown error processing org";
				result.errors.push(`org ${org.id}: ${errorMsg}`);
				logger.error("trial-expiry cron: org processing failed", {
					orgId: org.id,
					error: orgError,
				});
			}
		}

		logger.info("Trial expiry cron completed", {
			orgsWithActiveTrials: result.orgsWithActiveTrials,
			expiringSoonNotified: result.expiringSoonNotified,
			expiredTodayDowngraded: result.expiredTodayDowngraded,
			errors: result.errors.length,
		});

		return NextResponse.json(result);
	} catch (error) {
		logger.error("Trial expiry cron failed", { error });
		return NextResponse.json({ error: "trial_expiry_cron_failed", ...result }, { status: 500 });
	}
}
