/**
 * Tochka API contract — fill in once sandbox credentials and exact API
 * shape are confirmed against https://developers.tochka.com/docs/tochka-api/
 *
 * The shapes below are placeholders matching the most common Internet
 * Acquiring response structure. Replace before going to production.
 */

export interface TochkaWebhookPayload {
	operationId?: string;
	paymentId?: string;
	status?: string;
	amount?: string | number; // RUB as string with kopecks (e.g. "100.00") OR kopecks integer
	createdAt?: string;
	purpose?: string;
	[key: string]: unknown;
}

export interface TochkaCreatePaymentResponse {
	paymentId: string;
	paymentLinkUrl: string;
	customerId?: string;
	expiresAt?: string;
}

export interface TochkaGetStatusResponse {
	paymentId: string;
	operationId?: string;
	status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";
	paidAt?: string;
}
