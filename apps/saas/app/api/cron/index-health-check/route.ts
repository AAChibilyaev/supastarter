import { db } from "@repo/database";
import { logger } from "@repo/logs";
import {
	checkIndexHealth,
	detectAnomalies,
	autoPauseIndexing,
	shouldSendAlert,
	markAlertSent,
	buildAnomalyAlertSlackMessage,
	sendSlackWebhook,
} from "@repo/search";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const expected = process.env.SEARCH_CRON_SECRET;
	if (!expected) {
		logger.warn(
			"SEARCH_CRON_SECRET is not set — index-health-check cron will always reject requests",
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
		const result = await runIndexHealthCheck();

		if (result.errors > 0) {
			Sentry.captureEvent({
				message: `index-health-check: ${result.checkedOrgs} orgs checked, ${result.anomaliesFound} anomalies, ${result.alertsSent} alerts sent, ${result.autoPaused} indexes paused, ${result.errors} errors`,
				level: "warning",
				tags: {
					"cron.job": "index-health-check",
					"cron.checkedOrgs": String(result.checkedOrgs),
					"cron.anomalies": String(result.anomaliesFound),
					"cron.alertsSent": String(result.alertsSent),
					"cron.autoPaused": String(result.autoPaused),
					"cron.errors": String(result.errors),
				},
			});
		}

		if (result.alertsSent > 0 || result.autoPaused > 0) {
			logger.warn("index-health-check: anomalies detected and acted upon", {
				checkedOrgs: result.checkedOrgs,
				anomaliesFound: result.anomaliesFound,
				alertsSent: result.alertsSent,
				autoPaused: result.autoPaused,
				errors: result.errors,
			});
		}

		return NextResponse.json(result);
	} catch (error) {
		logger.error("index-health-check cron failed", { error });
		Sentry.captureException(error, {
			tags: { "cron.job": "index-health-check" },
		});
		return NextResponse.json({ error: "health_check_failed" }, { status: 500 });
	}
}

// ─── Orchestrator ─────────────────────────────────────────────────

interface HealthCheckResult {
	checkedOrgs: number;
	anomaliesFound: number;
	alertsSent: number;
	autoPaused: number;
	errors: number;
}

/**
 * Run index health check across ALL active organizations.
 * For each org:
 *   1. Run checkIndexHealth() — drift, lag, error rates
 *   2. detectAnomalies() — generate alert events
 *   3. For each anomaly: check cooldown, send Slack alert, mark sent
 *   4. For critical drift: auto-pause the affected index
 */
async function runIndexHealthCheck(): Promise<HealthCheckResult> {
	const result: HealthCheckResult = {
		checkedOrgs: 0,
		anomaliesFound: 0,
		alertsSent: 0,
		autoPaused: 0,
		errors: 0,
	};

	// Get all organizations that have at least one enabled search index
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

			if (health.overallHealthy) {
				result.checkedOrgs++;
				continue;
			}

			const anomalies = detectAnomalies(health);

			if (anomalies.length === 0) {
				result.checkedOrgs++;
				continue;
			}

			result.anomaliesFound += anomalies.length;

			// Parse metadata once for this org
			let metadata: Record<string, unknown> = {};
			try {
				metadata = org.metadata ? JSON.parse(org.metadata) : {};
			} catch {
				metadata = {};
			}

			const slackWebhookUrl = metadata.slackWebhookUrl as string | undefined;

			// Group anomalies by type+index for alert cooldown
			for (const anomaly of anomalies) {
				const alertKey = `${anomaly.type}_${anomaly.details?.indexId ?? anomaly.organizationId}`;

				if (!shouldSendAlert(org.metadata, alertKey)) {
					continue; // Still in cooldown
				}

				// Send Slack alert if webhook URL is configured
				if (slackWebhookUrl) {
					const dashboardUrl =
						process.env.NEXT_PUBLIC_APP_URL ??
						"https://app.aacsearch.com";

					const slackPayload = buildAnomalyAlertSlackMessage(
						[anomaly],
						org.name,
						`${dashboardUrl}/dashboard/${org.id}/monitoring`,
					);

					const delivered = await sendSlackWebhook(slackWebhookUrl, slackPayload);

					if (delivered) {
						result.alertsSent++;
						await markAlertSent(org.id, alertKey);
					}
				} else {
					// No Slack configured — mark as sent anyway to avoid loop
					// TODO: fall back to email notification when email dispatch is implemented
					await markAlertSent(org.id, alertKey);
				}

				// Auto-pause on critical drift
				if (
					anomaly.severity === "critical" &&
					anomaly.type === "drift" &&
					anomaly.details?.indexId
				) {
					const paused = await autoPauseIndexing(
						anomaly.details.indexId as string,
						anomaly.message,
					);
					if (paused) {
						result.autoPaused++;
					}
				}
			}

			result.checkedOrgs++;
		} catch (orgError) {
			logger.error("index-health-check: failed to check org", {
				orgId: org.id,
				orgName: org.name,
				error: orgError instanceof Error ? orgError.message : String(orgError),
			});
			result.errors++;
		}
	}

	return result;
}
