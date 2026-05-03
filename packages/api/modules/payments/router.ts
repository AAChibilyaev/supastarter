import { cancelSubscription } from "./procedures/cancel-subscription";
import { createCheckoutLink } from "./procedures/create-checkout-link";
import { createCustomerPortalLink } from "./procedures/create-customer-portal-link";
import { createSetupIntent } from "./procedures/create-setup-intent";
import { createUpgradeSession } from "./procedures/create-upgrade-session";
import { detachPaymentMethod } from "./procedures/detach-payment-method";
import { getProrationPreview } from "./procedures/get-proration-preview";
import { listInvoices } from "./procedures/list-invoices";
import { listPaymentMethods } from "./procedures/list-payment-methods";
import { listPurchases } from "./procedures/list-purchases";
import { setDefaultPaymentMethod } from "./procedures/set-default-payment-method";
import { upgradeSubscription } from "./procedures/upgrade-subscription";

export const paymentsRouter = {
	cancelSubscription,
	createCheckoutLink,
	createCustomerPortalLink,
	createSetupIntent,
	createUpgradeSession,
	detachPaymentMethod,
	getProrationPreview,
	listInvoices,
	listPaymentMethods,
	listPurchases,
	setDefaultPaymentMethod,
	upgradeSubscription,
};
