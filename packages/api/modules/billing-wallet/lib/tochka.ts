/**
 * Tochka Acquiring API v1.0 client.
 *
 * Production-ready HTTP client for the Tochka Internet Acquiring API. Used by
 * billing-wallet oRPC procedures to create payment links, subscription
 * links, and charge recurring subscriptions.
 *
 * Features:
 *   - Request ID per call for log correlation
 *   - Retry with exponential backoff (3 retries on 5xx)
 *   - Idempotency keys for safe retries
 *   - Structured error typing
 *   - Logger integration
 *
 * Environment variables:
 *   TOCHKA_API_BASE_URL   — base URL (sandbox or production)
 *   TOCHKA_JWT_TOKEN      — JWT Bearer token for API auth
 *   TOCHKA_CUSTOMER_CODE  — customer code / client ID in Tochka system
 *   TOCHKA_MERCHANT_ID    — merchant ID for the payment point
 */

import { randomUUID } from "node:crypto";

import { logger } from "@repo/logs";

// ─── Configuration ────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_RETRY_MS = 500;
const RETRY_STATUS_CODES = new Set([502, 503, 504]);

interface TochkaRequestOptions {
	method: "GET" | "POST" | "PUT" | "DELETE";
	path: string;
	body?: unknown;
	idempotencyKey?: string;
}

function getBaseUrl(): string {
	return process.env.TOCHKA_API_BASE_URL ?? "https://enter.tochka.com/sandbox";
}

function getJwtToken(): string {
	const token = process.env.TOCHKA_JWT_TOKEN;
	if (!token) throw new Error("TOCHKA_JWT_TOKEN is not configured");
	return token;
}

function getCustomerCode(): string {
	const code = process.env.TOCHKA_CUSTOMER_CODE;
	if (!code) throw new Error("TOCHKA_CUSTOMER_CODE is not configured");
	return code;
}

export function getMerchantId(): string {
	const id = process.env.TOCHKA_MERCHANT_ID;
	if (!id) throw new Error("TOCHKA_MERCHANT_ID is not configured");
	return id;
}

// ─── Retry helper ─────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core request function ───────────────────────────────────────

async function fetchAttempt<T>(
	opts: TochkaRequestOptions,
	requestId: string,
	attempt: number,
): Promise<T> {
	const baseUrl = getBaseUrl();
	const token = getJwtToken();
	const url = `${baseUrl}${opts.path}`;

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
		"X-Customer-Code": getCustomerCode(),
		"X-Request-Id": requestId,
	};
	if (opts.idempotencyKey) {
		headers["Idempotency-Key"] = opts.idempotencyKey;
	}

	const response = await fetch(url, {
		method: opts.method,
		headers,
		body: opts.body ? JSON.stringify(opts.body) : undefined,
	});

	const text = await response.text();

	if (!response.ok) {
		const isRetryable = RETRY_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES;

		logger.warn("tochka_request_failed", {
			requestId,
			method: opts.method,
			path: opts.path,
			status: response.status,
			attempt,
			retrying: isRetryable,
		});

		if (isRetryable) {
			const delay = BASE_RETRY_MS * 2 ** (attempt - 1);
			await sleep(delay);
			return fetchAttempt<T>(opts, requestId, attempt + 1);
		}

		throw new Error(
			`Tochka API ${opts.method} ${opts.path} failed: ${response.status} ${text.slice(0, 500)}`,
		);
	}

	logger.info("tochka_request_ok", {
		requestId,
		method: opts.method,
		path: opts.path,
		status: response.status,
		attempt,
	});

	try {
		return JSON.parse(text) as T;
	} catch {
		throw new Error(`Tochka API ${opts.path} returned non-JSON: ${text.slice(0, 200)}`);
	}
}

async function tochkaRequest<T>(opts: TochkaRequestOptions): Promise<T> {
	const requestId = randomUUID().slice(0, 12);
	return fetchAttempt<T>(opts, requestId, 1);
}

// ─── Response types (tolerant parsing) ───────────────────────────

interface TochkaCreatePaymentResponse {
	paymentLink?: string;
	paymentLinkUrl?: string;
	operationId?: string;
}

interface TochkaCreateSubscriptionResponse {
	paymentLink?: string;
	paymentLinkUrl?: string;
	operationId?: string;
}

interface TochkaChargeResponse {
	status?: string;
	operationId?: string;
	amount?: number | string;
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Create a one-time payment link.
 */
export async function createPaymentLink(
	amountMinor: bigint,
	purpose: string,
	externalRef: string,
): Promise<{ paymentUrl: string; operationId?: string }> {
	const merchantId = getMerchantId();

	const body = {
		merchantId,
		customerCode: getCustomerCode(),
		amount: amountMinor.toString(),
		currency: "RUB",
		purpose,
		externalRef,
	};

	const response = await tochkaRequest<TochkaCreatePaymentResponse>({
		method: "POST",
		path: "/acquiring/v1.0/payments",
		idempotencyKey: externalRef,
		body,
	});

	const paymentUrl = response.paymentLink ?? response.paymentLinkUrl ?? "";
	if (!paymentUrl) {
		throw new Error("Tochka createPaymentLink returned no payment URL");
	}

	return {
		paymentUrl,
		operationId: response.operationId,
	};
}

/**
 * Create a subscription payment link (recurring).
 */
export async function createSubscriptionLink(
	amountMinor: bigint,
	purpose: string,
	externalRef: string,
): Promise<{ paymentUrl: string; operationId?: string }> {
	const merchantId = getMerchantId();

	const body = {
		merchantId,
		customerCode: getCustomerCode(),
		amount: amountMinor.toString(),
		currency: "RUB",
		purpose,
		externalRef,
	};

	const response = await tochkaRequest<TochkaCreateSubscriptionResponse>({
		method: "POST",
		path: "/acquiring/v1.0/subscriptions",
		idempotencyKey: externalRef,
		body,
	});

	const paymentUrl = response.paymentLink ?? response.paymentLinkUrl ?? "";
	if (!paymentUrl) {
		throw new Error("Tochka createSubscriptionLink returned no payment URL");
	}

	return {
		paymentUrl,
		operationId: response.operationId,
	};
}

/**
 * Charge an existing subscription (recurring payment).
 */
export async function chargeSubscription(
	operationId: string,
	amountMinor: bigint,
): Promise<{ status?: string; operationId?: string }> {
	const body = {
		merchantId: getMerchantId(),
		amount: amountMinor.toString(),
		currency: "RUB",
	};

	const response = await tochkaRequest<TochkaChargeResponse>({
		method: "POST",
		path: `/acquiring/v1.0/subscriptions/${encodeURIComponent(operationId)}/charge`,
		idempotencyKey: `charge:${operationId}:${amountMinor.toString()}`,
		body,
	});

	return {
		status: response.status,
		operationId: response.operationId,
	};
}
