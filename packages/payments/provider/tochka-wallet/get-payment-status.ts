import type { WalletProvider } from "../../wallet-types";

import { tochkaRequest } from "./client";
import type { TochkaGetStatusResponse } from "./types";

const STATUS_MAP: Record<string, "pending" | "paid" | "failed" | "cancelled" | "expired"> = {
	PENDING: "pending",
	PAID: "paid",
	FAILED: "failed",
	CANCELLED: "cancelled",
	EXPIRED: "expired",
};

export const getPaymentStatus: WalletProvider["getPaymentStatus"] = async (input) => {
	const response = await tochkaRequest<TochkaGetStatusResponse>({
		method: "GET",
		path: `/v1/payments/${encodeURIComponent(input.providerPaymentId)}`,
	});

	return {
		status: STATUS_MAP[response.status] ?? "pending",
		providerOperationId: response.operationId,
		paidAt: response.paidAt ? new Date(response.paidAt) : undefined,
		rawProviderResponse: response,
	};
};
