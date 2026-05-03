import { randomUUID } from "node:crypto";

import { db } from "@repo/database";
import { logger } from "@repo/logs";

import { type EscalationService } from "../tools/escalate-to-operator";

export interface EscalationChannelConfig {
	webhookUrl?: string;
	/** Email recipient for escalation alerts — used for logging/routing; no direct email sent here. */
	emailTo?: string;
	workingHoursStart?: number;
	workingHoursEnd?: number;
}

async function sendWebhookEscalation(
	webhookUrl: string,
	payload: Record<string, unknown>,
): Promise<void> {
	const secret = process.env.ASSISTANT_WEBHOOK_SECRET ?? "";
	const body = JSON.stringify(payload);

	let signature = "";
	if (secret) {
		const { createHmac } = await import("node:crypto");
		signature = createHmac("sha256", secret).update(body).digest("hex");
	}

	await fetch(webhookUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(signature ? { "X-Webhook-Signature": `sha256=${signature}` } : {}),
		},
		body,
		signal: AbortSignal.timeout(5000),
	}).catch((err) => {
		logger.warn({ err, webhookUrl }, "Escalation webhook delivery failed");
	});
}

function isWithinWorkingHours(start = 9, end = 21): boolean {
	const hour = new Date().getUTCHours() + 3; // MSK = UTC+3
	return hour >= start && hour < end;
}

export function createEscalationService(channelConfig: EscalationChannelConfig): EscalationService {
	return {
		async createTicket({ conversationId, reason, urgency, organizationId }) {
			const ticketId = randomUUID().slice(0, 8).toUpperCase();

			// Mark conversation as escalated in DB
			await db.assistantConversation.update({
				where: { id: conversationId },
				data: { status: "escalated", escalatedAt: new Date() },
			});

			const withinHours = isWithinWorkingHours(
				channelConfig.workingHoursStart,
				channelConfig.workingHoursEnd,
			);

			// Load conversation history for context
			const messages = await db.assistantMessage.findMany({
				where: { conversationId },
				orderBy: { createdAt: "asc" },
				take: 20,
				select: { role: true, content: true, createdAt: true },
			});

			const payload = {
				ticketId,
				conversationId,
				organizationId,
				reason,
				urgency,
				timestamp: new Date().toISOString(),
				messageCount: messages.length,
				lastMessages: messages.slice(-5),
			};

			// Send via webhook channel
			if (channelConfig.webhookUrl) {
				await sendWebhookEscalation(channelConfig.webhookUrl, payload);
			}

			// Log for email-based routing — external integrations pick this up via structured log sinks
			if (channelConfig.emailTo) {
				logger.info(
					{ ...payload, alertRecipient: channelConfig.emailTo },
					"Escalation alert — route to operator email",
				);
			}

			const estimatedWaitTime = withinHours
				? urgency === "high"
					? "5-10 минут"
					: "15-30 минут"
				: "следующий рабочий день";

			logger.info(
				{ ticketId, conversationId, organizationId, reason },
				"Conversation escalated to operator",
			);

			return { ticketId, estimatedWaitTime };
		},
	};
}
