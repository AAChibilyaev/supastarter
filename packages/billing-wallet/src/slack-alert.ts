import { env } from "process";

import { logger } from "@repo/logs";

const SLACK_WEBHOOK_URL_ENV = "SLACK_BILLING_WEBHOOK_URL";
const SLACK_TIMEOUT_MS = 5_000;

export interface SlackAlertPayload {
	text: string;
	fallback?: string;
	color?: string;
	fields?: Array<{ title: string; value: string; short?: boolean }>;
}

/**
 * Sends a Slack message via webhook. Silently fails if no webhook URL is configured.
 * Uses `SLACK_BILLING_WEBHOOK_URL` env var.
 */
export async function sendSlackAlert(payload: SlackAlertPayload): Promise<void> {
	const webhookUrl = env[SLACK_WEBHOOK_URL_ENV];
	if (!webhookUrl) return;

	const blocks: Array<Record<string, unknown>> = [
		{
			type: "section",
			text: { type: "mrkdwn", text: payload.text },
		},
	];

	if (payload.fields && payload.fields.length > 0) {
		blocks.push({
			type: "section",
			fields: payload.fields.map((f) => ({
				type: "mrkdwn",
				text: `*${f.title}:* ${f.value}`,
			})),
		});
	}

	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);

		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				text: payload.fallback ?? payload.text,
				attachments: payload.color ? [{ color: payload.color, blocks }] : undefined,
				blocks: payload.color ? undefined : blocks,
			}),
			signal: controller.signal,
		});

		clearTimeout(timer);

		if (!response.ok) {
			logger.warn(
				"Slack webhook returned non-200",
				response.status,
				await response.text().catch(() => ""),
			);
		}
	} catch (err) {
		logger.warn("Failed to send Slack alert", err);
	}
}
