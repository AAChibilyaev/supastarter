/**
 * Wallet Webhook Dispatcher
 *
 * Sends wallet event webhooks (wallet.balance_low, wallet.recharged, wallet.overage_reached)
 * to all configured webhook URLs for the organization.
 *
 * Designed to be fire-and-forget (async, not awaited in request path).
 * Uses built-in fetch() — no external dependencies.
 */

import { db } from "@repo/database";
import { logger } from "@repo/logs";

import type { WalletWebhookEvent } from "../procedures/wallet-webhooks";

interface WalletWebhookConfig {
	id: string;
	url: string;
	events: WalletWebhookEvent[];
	active: boolean;
	createdAt: string;
}

interface OrgMetadata {
	walletWebhooks?: WalletWebhookConfig[];
}

function parseOrgMetadata(raw: string | null | undefined): OrgMetadata {
	if (!raw) return {};
	try {
		return JSON.parse(raw) as OrgMetadata;
	} catch {
		return {};
	}
}

export async function dispatchWalletWebhook(params: {
	organizationId: string;
	event: WalletWebhookEvent;
	payload: Record<string, unknown>;
}): Promise<void> {
	const { organizationId, event, payload } = params;

	try {
		const org = await db.organization.findUnique({
			where: { id: organizationId },
			select: { metadata: true },
		});

		if (!org) return;

		const meta = parseOrgMetadata(org.metadata);
		const webhooks = (meta.walletWebhooks ?? []).filter(
			(wh) => wh.active && wh.events.includes(event),
		);

		if (webhooks.length === 0) return;

		const body = JSON.stringify({
			event,
			timestamp: new Date().toISOString(),
			organizationId,
			...payload,
		});

		await Promise.allSettled(
			webhooks.map((wh) =>
				sendWebhook(wh.url, event, body).catch((err: unknown) =>
					logger.error("dispatchWalletWebhook: send failed", {
						webhookId: wh.id,
						url: wh.url,
						event,
						error: err instanceof Error ? err.message : String(err),
					}),
				),
			),
		);
	} catch (error) {
		logger.error("dispatchWalletWebhook failed", {
			error: error instanceof Error ? error.message : String(error),
			organizationId,
			event,
		});
	}
}

async function sendWebhook(url: string, event: string, body: string): Promise<void> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Wallet-Event": event,
				"User-Agent": "AACsearch-Wallet-Webhook/1.0",
			},
			body,
			signal: controller.signal,
		});

		if (!response.ok) {
			logger.warn("Wallet webhook returned non-2xx", {
				url,
				event,
				status: response.status,
				statusText: response.statusText,
			});
		}
	} finally {
		clearTimeout(timeout);
	}
}
