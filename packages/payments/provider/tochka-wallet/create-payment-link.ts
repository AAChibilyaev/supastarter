import type { WalletProvider } from "../../wallet-types";

import { tochkaRequest } from "./client";
import type { TochkaCreatePaymentResponse } from "./types";

/**
 * Create a payment link for one-time wallet top-up.
 * MVP shape — adjust to actual Tochka Internet Acquiring contract.
 */
export const createPaymentLink: WalletProvider["createPaymentLink"] = async (input) => {
	const merchantId = process.env.TOCHKA_MERCHANT_ID;
	if (!merchantId) {
		throw new Error("TOCHKA_MERCHANT_ID is not configured");
	}

	const response = await tochkaRequest<TochkaCreatePaymentResponse>({
		method: "POST",
		path: "/v1/payments",
		idempotencyKey: input.orderId,
		body: {
			merchantId,
			orderId: input.orderId,
			// Tochka usually accepts amount in kopecks as integer
			amount: input.amountKopecks.toString(),
			currency: input.currency,
			description: input.description,
			customerEmail: input.customerEmail,
			redirectUrl: input.successUrl,
			failureUrl: input.failureUrl,
		},
	});

	return {
		paymentLinkUrl: response.paymentLinkUrl,
		providerPaymentId: response.paymentId,
		providerCustomerId: response.customerId,
		expiresAt: response.expiresAt ? new Date(response.expiresAt) : undefined,
	};
};
