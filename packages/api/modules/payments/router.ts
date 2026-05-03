import { createCheckoutLink } from "./procedures/create-checkout-link";
import { createCustomerPortalLink } from "./procedures/create-customer-portal-link";
import { listInvoices } from "./procedures/list-invoices";
import { listPurchases } from "./procedures/list-purchases";

export const paymentsRouter = {
	createCheckoutLink,
	createCustomerPortalLink,
	listInvoices,
	listPurchases,
};
