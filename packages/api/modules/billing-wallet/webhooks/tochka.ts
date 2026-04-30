/**
 * Tochka webhook handler — POST /api/webhooks/tochka
 *
 * Receives JWT-signed webhook events from Tochka Acquiring API v1.0.
 * On APPROVED status, credits the associated AiWallet.
 *
 * JWT verification uses TOCHKA_WEBHOOK_PUBLIC_KEY (RS256).
 * Idempotency is enforced via PaymentProviderEvent dedup.
 */

import { createHash, verify } from "node:crypto";

import { applyTopupCredit, notifyTopupPaid } from "@repo/billing-wallet";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import type { Context } from "hono";
import { Hono } from "hono";

// ─── JWT verification ─────────────────────────────────────────────

function base64UrlDecode(str: string): string {
	const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
	const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
	return Buffer.from(base64 + padding, "base64").toString("utf-8");
}

function verifyJwtSignature(
	token: string,
	publicKey: string,
): { header: unknown; payload: unknown } | null {
	const parts = token.split(".");
	if (parts.length !== 3) return null;

	const [headerB64, payloadB64, signatureB64] = parts;

	try {
		const signature = Buffer.from(signatureB64.replace(/-/g, "+").replace(/_/g, "/"), "base64");
		const data = Buffer.from(`${headerB64}.${payloadB64}`, "utf-8");

		const isValid = verify(
			"sha256",
			data,
			publicKey.startsWith("-----BEGIN")
				? publicKey
				: `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`,
			signature,
		);

		if (!isValid) return null;

		return {
			header: JSON.parse(base64UrlDecode(headerB64)),
			payload: JSON.parse(base64UrlDecode(payloadB64)),
		};
	} catch {
		return null;
	}
}

// ─── Webhook handler ──────────────────────────────────────────────

interface TochkaWebhookPayload {
	operationId?: string;
	paymentId?: string;
	status?: string;
	amount?: string | number;
	merchantId?: string;
	customerCode?: string;
	purpose?: string;
	externalRef?: string;
	[key: string]: unknown;
}

async function handleTochkaWebhook(c: Context): Promise<Response> {
	const rawBody = await c.req.text();

	// Parse JSON body
	let payload: TochkaWebhookPayload;
	try {
		payload = JSON.parse(rawBody) as TochkaWebhookPayload;
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}

	// JWT verification
	const publicKey = process.env.TOCHKA_WEBHOOK_PUBLIC_KEY;
	if (!publicKey) {
		logger.error("TOCHKA_WEBHOOK_PUBLIC_KEY is not configured");
		return c.json({ error: "webhook_not_configured" }, 500);
	}

	// Try to extract JWT from Authorization header or payload.jwt / payload.token
	const authHeader = c.req.header("Authorization");
	let jwtToken: string | undefined;

	if (authHeader?.startsWith("Bearer ")) {
		jwtToken = authHeader.slice(7).trim();
	} else if (typeof payload.jwt === "string") {
		jwtToken = payload.jwt;
	} else if (typeof payload.token === "string") {
		jwtToken = payload.token;
	}

	let verified = false;
	if (jwtToken) {
		const result = verifyJwtSignature(jwtToken, publicKey);
		if (result && typeof result.payload === "object" && result.payload !== null) {
			verified = true;
			// Merge JWT claims into payload for downstream use
			const jwtPayload = result.payload as Record<string, unknown>;
			payload = { ...payload, ...jwtPayload };
		}
	}

	// Build idempotency key
	const eventKey =
		payload.operationId ?? createHash("sha256").update(rawBody).digest("hex").slice(0, 32);
	const idempotencyKey = `tochka:${eventKey}`;

	// Upsert the event for dedup / audit trail
	const event = await db.paymentProviderEvent.upsert({
		where: { idempotencyKey },
		create: {
			provider: "tochka",
			eventType: `payment.${payload.status?.toLowerCase() ?? "unknown"}`,
			providerEventId: payload.operationId,
			signatureValid: verified,
			rawPayload: payload as object,
			idempotencyKey,
		},
		update: {},
	});

	if (!verified) {
		logger.warn("Tochka webhook signature invalid", {
			idempotencyKey,
			status: payload.status,
		});
		return c.json({ error: "invalid_signature" }, 401);
	}

	// Process APPROVED payments
	const normalizedStatus = payload.status?.toUpperCase();
	if (normalizedStatus === "APPROVED" && payload.operationId) {
		const amountKopecks = parseAmountKopecks(payload.amount);

		if (amountKopecks == null) {
			logger.error("Tochka webhook missing amount", { idempotencyKey, payload });
			return c.json({ error: "missing_amount" }, 400);
		}

		const providerPaymentId = payload.paymentId ?? payload.operationId;

		try {
			const result = await applyTopupCredit({
				providerOperationId: payload.operationId,
				providerPaymentId,
				amountKopecks,
				eventId: event.id,
			});

			await db.paymentProviderEvent.update({
				where: { id: event.id },
				data: { processedAt: new Date() },
			});

			if (result.applied) {
				const order = await db.walletTopupOrder.findUnique({
					where: { id: result.orderId },
					select: { walletId: true, amountKopecks: true },
				});

				if (order) {
					await notifyTopupPaid({
						walletId: order.walletId,
						amountKopecks: order.amountKopecks,
						orderId: result.orderId,
					}).catch((notifyErr) => logger.error("notifyTopupPaid failed", { notifyErr }));
				}
			}
		} catch (err) {
			const message = (err as Error)?.message ?? String(err);
			await db.paymentProviderEvent.update({
				where: { id: event.id },
				data: { processingError: message },
			});
			logger.error("apply_topup_credit failed", { eventId: event.id, message });
			return c.json({ error: "processing_failed" }, 500);
		}
	}

	return c.json({ status: "ok" });
}

// ─── Amount parsing helpers ───────────────────────────────────────

function parseAmountKopecks(amount: string | number | undefined): bigint | undefined {
	if (amount == null) return undefined;
	if (typeof amount === "number") return BigInt(Math.round(amount * 100));
	const str = amount.trim();
	if (/^\d+$/.test(str)) {
		return BigInt(str);
	}
	if (/^\d+\.\d{1,2}$/.test(str)) {
		const [whole, frac = ""] = str.split(".");
		const fracPadded = (frac + "00").slice(0, 2);
		return BigInt(whole) * BigInt(100) + BigInt(fracPadded);
	}
	return undefined;
}

// ─── Hono app ─────────────────────────────────────────────────────

export const tochkaWebhookApp = new Hono().post("/webhooks/tochka", handleTochkaWebhook);
