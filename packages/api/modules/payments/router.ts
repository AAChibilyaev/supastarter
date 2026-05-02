import { cancelSubscription } from "./procedures/cancel-subscription";
import { createCheckoutLink } from "./procedures/create-checkout-link";
import { createCustomerPortalLink } from "./procedures/create-customer-portal-link";
import { listPurchases } from "./procedures/list-purchases";

export const paymentsRouter = {
	cancelSubscription,
	createCheckoutLink,
	createCustomerPortalLink,
	listPurchases,
};
