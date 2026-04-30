export interface WalletProvider {
	id: "tochka" | "manual";

	createPaymentLink(input: {
		orderId: string;
		amountKopecks: bigint;
		currency: "RUB";
		successUrl: string;
		failureUrl: string;
		customerEmail?: string;
		description: string;
	}): Promise<{
		paymentLinkUrl: string;
		providerPaymentId: string;
		providerCustomerId?: string;
		expiresAt?: Date;
	}>;

	getPaymentStatus(input: { providerPaymentId: string }): Promise<{
		status: "pending" | "paid" | "failed" | "cancelled" | "expired";
		providerOperationId?: string;
		paidAt?: Date;
		rawProviderResponse: unknown;
	}>;

	verifyWebhook(input: { headers: Headers; rawBody: string }): Promise<{
		valid: boolean;
		eventType: string;
		providerEventId?: string;
		providerOperationId?: string;
		providerPaymentId?: string;
		amountKopecks?: bigint;
		status?: "pending" | "paid" | "failed" | "cancelled" | "expired";
		rawPayload: unknown;
	}>;

	refundPayment?(input: {
		providerPaymentId: string;
		amountKopecks: bigint;
		reason: string;
	}): Promise<{ refundId: string }>;
}
