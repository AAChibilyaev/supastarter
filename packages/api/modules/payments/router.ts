import { cancelSubscription } from "./procedures/cancel-subscription";
import { createCheckoutLink } from "./procedures/create-checkout-link";
import { createCustomerPortalLink } from "./procedures/create-customer-portal-link";
import { detachPaymentMethod } from "./procedures/detach-payment-method";
import { listPaymentMethods } from "./procedures/list-payment-methods";
import { listPurchases } from "./procedures/list-purchases";
import { upgradeSubscription } from "./procedures/upgrade-subscription";

export const paymentsRouter = {
	cancelSubscription,
	createCheckoutLink,
	createCustomerPortalLink,
	detachPaymentMethod,
	listPaymentMethods,
	listPurchases,
	upgradeSubscription,
};
