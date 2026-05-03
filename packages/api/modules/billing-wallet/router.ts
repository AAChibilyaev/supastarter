import { adminAdjust } from "./procedures/admin-adjust";
import { chargeSubscriptionProcedure } from "./procedures/charge-subscription";
import { checkBalance } from "./procedures/check-balance";
import { createTopup } from "./procedures/create-topup";
import { createTopupLink } from "./procedures/create-topup-link";
import { getCreditForecast } from "./procedures/get-credit-forecast";
import { getCreditUsageStats } from "./procedures/get-credit-usage-stats";
import { getTopupStatus } from "./procedures/get-topup-status";
import { getWallet } from "./procedures/get-wallet";
import { listPricingRules } from "./procedures/list-pricing-rules";
import { listTransactions } from "./procedures/list-transactions";
import { listUsageEvents } from "./procedures/list-usage-events";
import { setupAutorecharge } from "./procedures/setup-autorecharge";

export const billingWalletRouter = {
	getWallet,
	listTransactions,
	listUsageEvents,
	createTopup,
	createTopupLink,
	getTopupStatus,
	adminAdjust,
	setupAutorecharge,
	checkBalance,
	chargeSubscription: chargeSubscriptionProcedure,
	getCreditUsageStats,
	listPricingRules,
	getCreditForecast,
};

export { chargeAiUsage } from "./services/charge-ai-usage";
export type { ChargeAiUsageInput, ChargeAiUsageResult } from "./services/charge-ai-usage";
