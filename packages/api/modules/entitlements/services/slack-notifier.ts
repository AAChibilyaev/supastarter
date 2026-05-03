/**
 * Slack webhook notifier for usage quota alerts.
 * Sends a structured message to a Slack channel via Incoming Webhook.
 *
 * The webhook URL is expected to be stored in org metadata as:
 *   metadata.slackWebhookUrl
 */
import { logger } from "@repo/logs";

interface SlackMessage {
	text?: string;
	attachments?: Array<{
		fallback: string;
		color?: string;
		title?: string;
		text?: string;
		fields?: Array<{
			title: string;
			value: string;
			short?: boolean;
		}>;
		footer?: string;
		ts?: number;
	}>;
}

/**
 * Send a Slack message via incoming webhook.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendSlackAlert(webhookUrl: string, payload: SlackMessage): Promise<boolean> {
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

/**
 * Build a Slack message for a quota alert.
 */
export function buildQuotaAlertMessage(params: {
	orgName: string;
	resource: "search" | "ingest";
	percentUsed: number;
	threshold: number; // 80 or 100
	current: number;
	limit: number;
	planName: string;
	dashboardUrl: string;
}): SlackMessage {
	const resourceLabel = params.resource === "search" ? "Search queries" : "Indexed documents";
	const emoji = params.threshold >= 100 ? ":rotating_light:" : ":warning:";
	const color = params.threshold >= 100 ? "danger" : "warning";

	const percentLabel =
		params.threshold >= 100 ? "100% (limit reached)" : "80% (warning threshold)";

	return {
		text: `${emoji} *Quota Alert — ${params.orgName}*`,
		attachments: [
			{
				fallback: `Quota alert: ${resourceLabel} at ${params.percentUsed.toFixed(0)}%`,
				color,
				title: `${resourceLabel}: ${percentLabel}`,
				text: `${resourceLabel} have reached ${params.percentUsed.toFixed(0)}% of the monthly limit.`,
				fields: [
					{ title: "Resource", value: resourceLabel, short: true },
					{
						title: "Usage",
						value: `${params.current.toLocaleString()} / ${params.limit === -1 ? "Unlimited" : params.limit.toLocaleString()}`,
						short: true,
					},
					{
						title: "Percent Used",
						value: `${params.percentUsed.toFixed(1)}%`,
						short: true,
					},
					{ title: "Plan", value: params.planName, short: true },
				],
				footer: "AACsearch Usage Alerts",
				ts: Math.floor(Date.now() / 1000),
			},
		],
	};
}
