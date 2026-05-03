import { addPaymentMethodLink } from "./procedures/add-payment-method-link";
import { createCheckoutLink } from "./procedures/create-checkout-link";
import { createCustomerPortalLink } from "./procedures/create-customer-portal-link";
import { deletePaymentMethod } from "./procedures/delete-payment-method";
import { listPaymentMethods } from "./procedures/list-payment-methods";
import { listPurchases } from "./procedures/list-purchases";
import { setDefaultPaymentMethod } from "./procedures/set-default-payment-method";

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
	listPaymentMethods,
	deletePaymentMethod,
	setDefaultPaymentMethod,
	addPaymentMethodLink,
};
