import { createHmac, timingSafeEqual } from "node:crypto";

import type { WalletProvider } from "../../wallet-types";
import type { TochkaWebhookPayload } from "./types";

const STATUS_MAP: Record<string, "pending" | "paid" | "failed" | "cancelled" | "expired"> = {
	PENDING: "pending",
	PAID: "paid",
	APPROVED: "paid",
	SUCCESS: "paid",
	FAILED: "failed",
	CANCELLED: "cancelled",
	EXPIRED: "expired",
};

/**
 * Verify Tochka webhook signature and normalize payload.
 *
 * MVP placeholder — replace with the exact signing scheme from Tochka docs:
 * the API may use HMAC-SHA256 over rawBody with shared secret, or JWT signed
 * with merchant's RSA key. Confirm against
 * https://developers.tochka.com/docs/tochka-api/ once sandbox is provisioned.
 */
export const verifyWebhook: WalletProvider["verifyWebhook"] = async ({ headers, rawBody }) => {
	let payload: TochkaWebhookPayload = {};
	try {
		payload = JSON.parse(rawBody) as TochkaWebhookPayload;
	} catch {
		return {
			valid: false,
			eventType: "invalid_json",
			rawPayload: { raw: rawBody.slice(0, 500) },
		};
	}

	const secret = process.env.TOCHKA_WEBHOOK_SECRET;
	if (!secret) {
		// Without configured secret — fail closed
		return {
			valid: false,
			eventType: "no_secret_configured",
			rawPayload: payload,
		};
	}

	const signatureHeader =
		headers.get("x-tochka-signature") ??
		headers.get("x-signature") ??
		headers.get("signature") ??
		"";

	const valid = verifyHmac(rawBody, signatureHeader, secret);

	const status = payload.status ? STATUS_MAP[payload.status.toUpperCase()] : undefined;
	const amountKopecks = parseAmountKopecks(payload.amount);

	return {
		valid,
		eventType: `payment.${status ?? "unknown"}`,
		providerEventId: payload.operationId,
		providerOperationId: payload.operationId,
		providerPaymentId: payload.paymentId,
		amountKopecks,
		status,
		rawPayload: payload,
	};
};

function verifyHmac(body: string, providedSig: string, secret: string): boolean {
	if (!providedSig) return false;
	const expected = createHmac("sha256", secret).update(body, "utf8").digest("hex");
	const provided = providedSig.toLowerCase();
	if (expected.length !== provided.length) return false;
	try {
		return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
	} catch {
		return false;
	}
}

function parseAmountKopecks(amount: string | number | undefined): bigint | undefined {
	if (amount == null) return undefined;
	if (typeof amount === "number") return BigInt(Math.round(amount * 100));
	const str = amount.trim();
	if (/^\d+$/.test(str)) {
		// pure integer — assume already kopecks
		return BigInt(str);
	}
	if (/^\d+\.\d{1,2}$/.test(str)) {
		const [whole, frac = ""] = str.split(".");
		const fracPadded = (frac + "00").slice(0, 2);
		return BigInt(whole) * BigInt(100) + BigInt(fracPadded);
	}
	return undefined;
}
