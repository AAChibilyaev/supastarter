import type { WalletProvider } from "../../wallet-types";

import { createPaymentLink } from "./create-payment-link";
import { getPaymentStatus } from "./get-payment-status";
import { verifyWebhook } from "./verify-webhook";

export const tochkaWalletProvider: WalletProvider = {
	id: "tochka",
	createPaymentLink,
	getPaymentStatus,
	verifyWebhook,
};
