/**
 * Shopify Webhook HMAC-SHA256 signature verification.
 *
 * Each Shopify webhook request includes an X-Shopify-Hmac-Sha256 header
 * containing a Base64-encoded HMAC-SHA256 signature of the raw request body,
 * signed with the app's SHOPIFY_API_SECRET.
 *
 * This must be verified BEFORE processing any webhook payload.
 *
 * Docs: https://shopify.dev/docs/apps/webhooks/configuration/https#step-5-verify-the-webhook
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { logger } from "@repo/logs";

/**
 * Verify the HMAC-SHA256 signature of a Shopify webhook request.
 *
 * @param body - The raw request body as a Buffer or string
 * @param hmacHeader - The value of the X-Shopify-Hmac-Sha256 header
 * @returns true if the signature is valid, false otherwise
 */
export function verifyWebhookHmac(body: string | Buffer, hmacHeader: string): boolean {
	const secret = process.env.SHOPIFY_API_SECRET;
	if (!secret) {
		logger.error("Missing SHOPIFY_API_SECRET — cannot verify webhook signature");
		return false;
	}

	try {
		const computedHmac = createHmac("sha256", secret).update(body).digest("base64");
		const providedHmac = Buffer.from(hmacHeader, "utf-8");
		const computedHmacBuf = Buffer.from(computedHmac, "utf-8");

		// Use timing-safe comparison to prevent timing attacks
		if (computedHmacBuf.length !== providedHmac.length) {
			return false;
		}
		return timingSafeEqual(computedHmacBuf, providedHmac);
	} catch (error) {
		logger.error("Webhook HMAC verification failed", { error });
		return false;
	}
}
