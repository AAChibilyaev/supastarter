import { addPaymentMethodLink } from "./procedures/add-payment-method-link";
import { cancelSubscription } from "./procedures/cancel-subscription";
import { createCheckoutLink } from "./procedures/create-checkout-link";
import { createCustomerPortalLink } from "./procedures/create-customer-portal-link";
import { createSetupIntent } from "./procedures/create-setup-intent";
import { createUpgradeSession } from "./procedures/create-upgrade-session";
import { deletePaymentMethod } from "./procedures/delete-payment-method";
import { detachPaymentMethod } from "./procedures/detach-payment-method";
import { getProrationPreview } from "./procedures/get-proration-preview";
import { getTaxInfo } from "./procedures/get-tax-info";
import { listInvoices } from "./procedures/list-invoices";
import { listPaymentMethods } from "./procedures/list-payment-methods";
import { listPurchases } from "./procedures/list-purchases";
import { listReceipts } from "./procedures/list-receipts";
import { pauseSubscription } from "./procedures/pause-subscription";
import { getPreferredCurrency } from "./procedures/preferred-currency";
import { setPreferredCurrency } from "./procedures/preferred-currency";
import { resumeSubscription } from "./procedures/resume-subscription";
import { setDefaultPaymentMethod } from "./procedures/set-default-payment-method";
import { updateTaxInfo } from "./procedures/update-tax-info";
import { upgradeSubscription } from "./procedures/upgrade-subscription";

export const paymentsRouter = {
	addPaymentMethodLink,
	cancelSubscription,
	createCheckoutLink,
	createCustomerPortalLink,
	createSetupIntent,
	createUpgradeSession,
	deletePaymentMethod,
	detachPaymentMethod,
	getPreferredCurrency,
	getProrationPreview,
	getTaxInfo,
	listInvoices,
	listPaymentMethods,
	listPurchases,
	pauseSubscription,
	resumeSubscription,
	setDefaultPaymentMethod,
	setPreferredCurrency,
	updateTaxInfo,
	listReceipts,
	upgradeSubscription,
};
