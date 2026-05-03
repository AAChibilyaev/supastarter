import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { sendEmail } from "@repo/mail";
import {
	checkIndexHealth,
	detectAnomalies,
	shouldSendAlert,
	markAlertSent,
	autoPauseIndexing,
	buildAnomalyAlertSlackMessage,
} from "@repo/search";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const expected = process.env.INDEX_HEALTH_CRON_SECRET;
	if (!expected) {
		logger.warn(
			"INDEX_HEALTH_CRON_SECRET is not set — index-health cron will always reject requests",
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

interface CronResult {
	organizationsChecked: number;
	anomaliesFound: number;
	alertsSent: number;
	indexesPaused: number;
	errors: string[];
}

export async function POST(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const result: CronResult = {
		organizationsChecked: 0,
		anomaliesFound: 0,
		alertsSent: 0,
		indexesPaused: 0,
		errors: [],
	};

	try {
		// Get all organizations that have search indexes
		const orgs = await db.organization.findMany({
			where: {
				searchIndexes: {
					some: { enabled: true },
				},
			},
			select: {
				id: true,
				name: true,
				metadata: true,
			},
		});

		for (const org of orgs) {
			try {
				const health = await checkIndexHealth(org.id);
				result.organizationsChecked++;

				if (!health.overallHealthy) {
					const anomalies = detectAnomalies(health);
					result.anomaliesFound += anomalies.length;

					for (const event of anomalies) {
						const alertKey = `${event.type}_${event.severity}`;

						if (shouldSendAlert(org.metadata, alertKey)) {
							result.alertsSent++;

							// Send Slack alert if webhook is configured
							const metadata = parseOrgMetadata(org.metadata);
							const slackWebhookUrl = metadata.slackWebhookUrl;

							if (slackWebhookUrl) {
								const slackMsg = buildAnomalyAlertSlackMessage(
									[event],
									org.name,
									`${process.env.NEXT_PUBLIC_SAAS_URL ?? "http://localhost:3000"}/org/${org.id}/overview`,
								);
								await sendSlackAlert(slackWebhookUrl, slackMsg).catch(
									(err: unknown) =>
										logger.error("index-health cron: Slack send failed", {
											error: err,
											orgId: org.id,
										}),
								);
							}

							// Send email alert to org owners/admins
							await sendAnomalyEmailAlert(org.id, event).catch((err: unknown) =>
								logger.error("index-health cron: email alert failed", {
									error: err,
									orgId: org.id,
									eventType: event.type,
								}),
							);

							await markAlertSent(org.id, alertKey);
						}

						// Auto-pause for critical anomalies
						if (
							event.severity === "critical" &&
							(event.type === "drift" || event.type === "doc_drop")
						) {
							const indexId = (event.details as Record<string, unknown>).indexId as
								| string
								| undefined;
							if (indexId) {
								const paused = await autoPauseIndexing(indexId, event.message);
								if (paused) {
									result.indexesPaused++;
								}
							}
						}
					}
				}
			} catch (orgError) {
				const errorMessage =
					orgError instanceof Error
						? orgError.message
						: "Unknown error checking org health";
				result.errors.push(`org ${org.id}: ${errorMessage}`);
				logger.error("index-health cron: org check failed", {
					orgId: org.id,
					error: orgError,
				});
			}
		}

		// Report to Sentry if anomalies found
		if (result.anomaliesFound > 0) {
			Sentry.captureEvent({
				message: `index-health: ${result.anomaliesFound} anomalies across ${result.organizationsChecked} orgs`,
				level: result.anomaliesFound > 10 ? "error" : "warning",
				tags: {
					"cron.job": "index-health",
					"cron.orgsChecked": String(result.organizationsChecked),
					"cron.anomaliesFound": String(result.anomaliesFound),
					"cron.alertsSent": String(result.alertsSent),
					"cron.indexesPaused": String(result.indexesPaused),
				},
			});
		}

		return NextResponse.json(result);
	} catch (error) {
		logger.error("index-health cron failed", { error });
		Sentry.captureException(error, {
			tags: { "cron.job": "index-health" },
		});
		return NextResponse.json(
			{ error: "index_health_check_failed", ...result },
			{ status: 500 },
		);
	}
}

// ─── Helpers ─────────────────────────────────────────────────────

interface OrgMetadata {
  indexHealthAlerts?: Record<string, number>;
  slackWebhookUrl?: string;
}

function parseOrgMetadata(raw: string | null): OrgMetadata {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as OrgMetadata;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Send a Slack message via incoming webhook.
 * Lightweight inline version of the function in the entitlements module
 * — kept here to avoid cross-package dependency.
 */
async function sendSlackAlert(
  webhookUrl: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.error("Slack webhook returned error", {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Failed to send Slack alert", { error });
    return false;
  }
}

async function sendAnomalyEmailAlert(
	organizationId: string,
	event: {
		type: string;
		severity: string;
		message: string;
	},
): Promise<void> {
	const members = await db.member.findMany({
		where: {
			organizationId,
			role: { in: ["owner", "admin"] },
		},
		select: {
			userId: true,
			user: {
				select: { email: true, locale: true },
			},
		},
	});

	await Promise.all(
		members.map((m) => {
			if (!m.user.email) return Promise.resolve();

			return sendEmail({
				to: m.user.email,
				locale: (m.user.locale ?? "en") as "en" | "de" | "es" | "fr" | "ru",
				templateId: "indexHealthAlert",
				context: {
					alertType: event.type,
					severity: event.severity,
					message: event.message,
					dashboardUrl: `${process.env.NEXT_PUBLIC_SAAS_URL ?? "http://localhost:3000"}/org/${organizationId}/overview`,
				},
			}).catch((err: unknown) =>
				logger.error("sendAnomalyEmailAlert: email failed", {
					error: err,
					userId: m.userId,
					organizationId,
				}),
			);
		}),
	);
}
