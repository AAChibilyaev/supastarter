import type { WalletProvider } from "../../wallet-types";

/**
 * Manual wallet driver — no external provider, used for B2B invoices,
 * sandbox demo flows or when no live provider is configured.
 *
 * createPaymentLink and getPaymentStatus throw to make absent configuration
 * explicit. Webhooks are always invalid.
 */
export const manualWalletProvider: WalletProvider = {
	id: "manual",

	async createPaymentLink() {
		throw new Error("WALLET_PROVIDER_MANUAL: top-up requires admin invoice flow");
	},

	async getPaymentStatus() {
		return {
			status: "pending",
			rawProviderResponse: { provider: "manual" },
		};
	},

	async verifyWebhook({ rawBody }) {
		return {
			valid: false,
			eventType: "manual_provider_no_webhook",
			rawPayload: { raw: rawBody.slice(0, 200) },
		};
	},
};
