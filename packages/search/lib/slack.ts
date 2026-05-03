import "server-only";
import { logger } from "@repo/logs";

export interface SlackAlertPayload {
	title: string;
	message: string;
	severity: "warning" | "critical";
	fields?: Array<{ label: string; value: string }>;
}

/**
 * Sends an alert to the configured Slack webhook URL.
 * Silently no-ops when SLACK_WEBHOOK_URL is not set.
 */
export async function sendSlackAlert(payload: SlackAlertPayload): Promise<void> {
	const webhookUrl = process.env.SLACK_WEBHOOK_URL;
	if (!webhookUrl) {
		logger.warn("sendSlackAlert: SLACK_WEBHOOK_URL is not set — skipping Slack notification", {
			title: payload.title,
		});
		return;
	}

	const color = payload.severity === "critical" ? "#e53e3e" : "#dd6b20";
	const icon = payload.severity === "critical" ? ":red_circle:" : ":warning:";

	const fields = payload.fields?.map((f) => ({
		type: "mrkdwn",
		text: `*${f.label}*\n${f.value}`,
	}));

	const body = {
		attachments: [
			{
				color,
				blocks: [
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: `${icon} *${payload.title}*\n${payload.message}`,
						},
					},
					...(fields && fields.length > 0
						? [
								{
									type: "section",
									fields,
								},
							]
						: []),
					{
						type: "context",
						elements: [
							{
								type: "mrkdwn",
								text: `AACsearch Index Health Monitor • ${new Date().toISOString()}`,
							},
						],
					},
				],
			},
		],
	};

	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			logger.error("sendSlackAlert: Slack webhook returned non-OK status", {
				status: response.status,
				title: payload.title,
			});
		}
	} catch (error) {
		logger.error("sendSlackAlert: failed to send Slack notification", {
			error,
			title: payload.title,
		});
	}
}
