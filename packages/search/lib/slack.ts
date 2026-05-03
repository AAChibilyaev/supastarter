import "server-only";
import { logger } from "@repo/logs";

/**
 * POST a Slack webhook message payload to a Slack incoming webhook URL.
 * Returns true if the message was delivered successfully (HTTP 2xx).
 */
export async function sendSlackWebhook(
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
			const body = await response.text().catch(() => "no body");
			logger.error("sendSlackWebhook: Slack responded with error", {
				status: response.status,
				body: body.slice(0, 500),
			});
			return false;
		}

		return true;
	} catch (error) {
		logger.error("sendSlackWebhook: network error posting to Slack", {
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}
