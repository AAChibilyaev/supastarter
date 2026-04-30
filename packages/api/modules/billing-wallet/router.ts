import { adminAdjust } from "./procedures/admin-adjust";
import { createTopup } from "./procedures/create-topup";
import { getTopupStatus } from "./procedures/get-topup-status";
import { getWallet } from "./procedures/get-wallet";
import { listTransactions } from "./procedures/list-transactions";
import { listUsageEvents } from "./procedures/list-usage-events";

export const billingWalletRouter = {
	getWallet,
	listTransactions,
	listUsageEvents,
	createTopup,
	getTopupStatus,
	adminAdjust,
};
