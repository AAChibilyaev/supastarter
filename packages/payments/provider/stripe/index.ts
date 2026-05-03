import { applyTopupCredit, notifyTopupFailed, notifyTopupPaid } from "@repo/billing-wallet";
import {
	createPurchase,
	db,
	deletePurchaseBySubscriptionId,
	getPurchaseBySubscriptionId,
	updatePurchase,
} from "@repo/database";
import { logger } from "@repo/logs";
import { sendEmail } from "@repo/mail";
import { createNotification } from "@repo/notifications";
import Stripe from "stripe";

import { setCustomerIdToEntity } from "../../lib/customer";
import { getPlanIdByProviderPriceId } from "../../lib/provider-price-ids";
import type {
	CancelSubscription,
	CreateCheckoutLink,
	CreateCustomerPortalLink,
	CreateUpgradeSession,
	GetProrationPreview,
	PauseSubscription,
	ResumeSubscription,
	SetSubscriptionSeats,
	UpgradeSubscription,
	WebhookHandler,
} from "../../types";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
	if (stripeClient) {
		return stripeClient;
	}

	const stripeSecretKey = process.env.STRIPE_SECRET_KEY as string;

	if (!stripeSecretKey) {
		throw new Error("Missing env variable STRIPE_SECRET_KEY");
	}

	stripeClient = new Stripe(stripeSecretKey);

	return stripeClient;
}

export const createCheckoutLink: CreateCheckoutLink = async (options) => {
	const stripeClient = getStripeClient();
	const {
		type,
		priceId,
		redirectUrl,
		customerId,
		organizationId,
		userId,
		trialPeriodDays,
		seats,
		email,
	} = options;

	const metadata = {
		organization_id: organizationId || null,
		user_id: userId || null,
	};

	const response = await stripeClient.checkout.sessions.create({
		mode: type === "subscription" ? "subscription" : "payment",
		success_url: redirectUrl ?? "",
		line_items: [
			{
				quantity: seats ?? 1,
				price: priceId,
			},
		],
		...(customerId ? { customer: customerId } : { customer_email: email }),
		...(type === "one-time"
			? {
					payment_intent_data: {
						metadata,
					},
					customer_creation: "always",
				}
			: {
					subscription_data: {
						metadata,
						trial_period_days: trialPeriodDays,
					},
				}),
		metadata,
	});

	return response.url;
};

export const createCustomerPortalLink: CreateCustomerPortalLink = async ({
	customerId,
	redirectUrl,
}) => {
	const stripeClient = getStripeClient();

	const response = await stripeClient.billingPortal.sessions.create({
		customer: customerId,
		return_url: redirectUrl ?? "",
	});

	return response.url;
};

export const setSubscriptionSeats: SetSubscriptionSeats = async ({ id, seats }) => {
	const stripeClient = getStripeClient();

	const subscription = await stripeClient.subscriptions.retrieve(id);

	if (!subscription) {
		throw new Error("Subscription not found.");
	}

	await stripeClient.subscriptions.update(id, {
		items: [
			{
				id: subscription.items.data[0].id,
				quantity: seats,
			},
		],
	});
};

export const cancelSubscription: CancelSubscription = async (id, options) => {
	const stripeClient = getStripeClient();
	const mode = options?.mode ?? "immediate";

	if (mode === "immediate") {
		await stripeClient.subscriptions.cancel(id);
	} else {
		await stripeClient.subscriptions.update(id, { cancel_at_period_end: true });
	}
};

export const pauseSubscription: PauseSubscription = async (id, options) => {
	const stripeClient = getStripeClient();
	const behavior = options?.behavior ?? "keep_as_draft";

	await stripeClient.subscriptions.update(id, {
		pause_collection: { behavior },
	});
};

export const resumeSubscription: ResumeSubscription = async (id) => {
	const stripeClient = getStripeClient();

	await stripeClient.subscriptions.update(id, {
		pause_collection: "",
	});
};

export interface StripePaymentMethod {
	id: string;
	brand: string | null;
	last4: string | null;
	expMonth: number | null;
	expYear: number | null;
	isDefault: boolean;
}

export const listPaymentMethods = async (customerId: string): Promise<StripePaymentMethod[]> => {
	const stripe = getStripeClient();

	const customer = await stripe.customers.retrieve(customerId);
	const defaultPmId =
		!customer.deleted &&
		typeof customer === "object" &&
		customer.invoice_settings?.default_payment_method
			? (customer.invoice_settings.default_payment_method as string)
			: null;

	const response = await stripe.paymentMethods.list({
		customer: customerId,
		type: "card",
	});

	return response.data.map((pm) => ({
		id: pm.id,
		brand: pm.card?.brand ?? null,
		last4: pm.card?.last4 ?? null,
		expMonth: pm.card?.exp_month ?? null,
		expYear: pm.card?.exp_year ?? null,
		isDefault: pm.id === defaultPmId,
	}));
};

export const detachPaymentMethod = async (paymentMethodId: string): Promise<void> => {
	const stripe = getStripeClient();
	await stripe.paymentMethods.detach(paymentMethodId);
};

export const setDefaultPaymentMethod = async (
	customerId: string,
	paymentMethodId: string,
): Promise<void> => {
	const stripe = getStripeClient();
	await stripe.customers.update(customerId, {
		invoice_settings: { default_payment_method: paymentMethodId },
	});
};

export const createSetupIntent = async (
	customerId: string,
	redirectUrl?: string,
): Promise<{ clientSecret: string }> => {
	const stripe = getStripeClient();

	const setupIntent = await stripe.setupIntents.create({
		customer: customerId,
		usage: "off_session",
		...(redirectUrl ? { return_url: redirectUrl } : {}),
	});

	return { clientSecret: setupIntent.client_secret! };
};

export interface ProrationPreviewResult {
	prorationDate: number;
	immediateAmount: number;
	currency: string;
	nextInvoiceAmount: number | null;
	creditAmount: number;
}

export const getProrationPreview: GetProrationPreview = async ({ subscriptionId, newPriceId }) => {
	const stripe = getStripeClient();

	// Retrieve the subscription to get the current item
	const subscription = await stripe.subscriptions.retrieve(subscriptionId);
	const subscriptionItemId = subscription.items.data[0]?.id;

	if (!subscriptionItemId) {
		throw new Error("No subscription items found");
	}

	// Create a proration preview by creating an upcoming invoice
	const upcoming = await stripe.invoices.retrieveUpcoming({
		subscription: subscriptionId,
		subscription_items: [
			{
				id: subscriptionItemId,
				price: newPriceId,
				clear_usage: false,
			},
		],
		subscription_proration_date: Math.floor(Date.now() / 1000),
	});

	const lines = upcoming.lines.data || [];
	let immediateAmount = 0;
	let nextInvoiceAmount = 0;

	for (const line of lines) {
		if (line.period) {
			// Line is in the current period — proration
			if (line.proration) {
				immediateAmount += line.amount;
			} else {
				nextInvoiceAmount += line.amount;
			}
		}
	}

	// Calculate credit from existing balance
	const creditAmount = Math.max(0, -(upcoming.starting_balance ?? 0));

	return {
		prorationDate: upcoming.created,
		immediateAmount,
		currency: upcoming.currency,
		nextInvoiceAmount,
		creditAmount,
	};
};

export const upgradeSubscription: UpgradeSubscription = async ({
	subscriptionId,
	newPriceId,
	prorationBehavior = "create_prorations",
}) => {
	const stripe = getStripeClient();

	const subscription = await stripe.subscriptions.retrieve(subscriptionId);
	const subscriptionItemId = subscription.items.data[0]?.id;

	if (!subscriptionItemId) {
		throw new Error("No subscription items found");
	}

	await stripe.subscriptions.update(subscriptionId, {
		items: [
			{
				id: subscriptionItemId,
				price: newPriceId,
			},
		],
		proration_behavior: prorationBehavior,
	});
};

export interface UpgradeSessionResult {
	type: "checkout" | "direct_update";
	url?: string | null;
	success?: boolean;
	immediateAmount: number;
	currency: string;
	creditAmount: number;
	nextInvoiceAmount: number | null;
}

export const createUpgradeSession: CreateUpgradeSession = async ({
	subscriptionId,
	newPriceId,
	customerId,
	returnUrl,
}) => {
	const stripe = getStripeClient();

	// Check if immediate payment is needed via proration preview
	const subscription = await stripe.subscriptions.retrieve(subscriptionId);
	const subscriptionItemId = subscription.items.data[0]?.id;

	if (!subscriptionItemId) {
		throw new Error("No subscription items found");
	}

	// Preview the upcoming invoice to see if there's an immediate charge
	const upcoming = await stripe.invoices.retrieveUpcoming({
		customer: customerId,
		subscription: subscriptionId,
		subscription_items: [
			{
				id: subscriptionItemId,
				price: newPriceId,
				clear_usage: false,
			},
		],
		subscription_proration_date: Math.floor(Date.now() / 1000),
	});

	const lines = upcoming.lines.data || [];
	let immediateAmount = 0;
	let nextInvoiceAmount = 0;

	for (const line of lines) {
		if (line.proration) {
			immediateAmount += line.amount;
		} else if (line.period) {
			nextInvoiceAmount += line.amount;
		}
	}

	const creditAmount = Math.max(0, -(upcoming.starting_balance ?? 0));

	// If there's no immediate charge, update the subscription directly
	if (immediateAmount <= 0) {
		await stripe.subscriptions.update(subscriptionId, {
			items: [
				{
					id: subscriptionItemId,
					price: newPriceId,
				},
			],
			proration_behavior: "create_prorations",
		});

		return {
			type: "direct_update",
			success: true,
			immediateAmount,
			currency: upcoming.currency,
			creditAmount,
			nextInvoiceAmount,
		};
	}

	// Otherwise, create a checkout session for the immediate payment
	const session = await stripe.checkout.sessions.create({
		mode: "setup",
		customer: customerId,
		success_url: returnUrl,
		cancel_url: returnUrl,
		setup_intent_data: {
			metadata: {
				subscription_id: subscriptionId,
			},
		},
		...(subscription
			? { subscription_data: { items: [{ id: subscriptionItemId, price: newPriceId }] } }
			: {}),
	});

	return {
		type: "checkout",
		url: session.url,
		immediateAmount,
		currency: upcoming.currency,
		creditAmount,
		nextInvoiceAmount,
	};
};

export interface StripeInvoice {
	id: string;
	date: number | null;
	amountPaid: number;
	currency: string;
	status: string | null;
	invoicePdf: string | null;
	hostedInvoiceUrl: string | null;
	number: string | null;
}

export const listCustomerInvoices = async ({
	customerId,
	limit = 10,
	startingAfter,
}: {
	customerId: string;
	limit?: number;
	startingAfter?: string;
}): Promise<{ invoices: StripeInvoice[]; hasMore: boolean }> => {
	const stripe = getStripeClient();

	const response = await stripe.invoices.list({
		customer: customerId,
		limit,
		...(startingAfter ? { starting_after: startingAfter } : {}),
	});

	const invoices: StripeInvoice[] = response.data.map((invoice: Stripe.Invoice) => ({
		id: invoice.id,
		date: invoice.created,
		amountPaid: invoice.amount_paid,
		currency: invoice.currency,
		status: invoice.status ?? null,
		invoicePdf: invoice.invoice_pdf ?? null,
		hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
		number: invoice.number ?? null,
	}));

	return { invoices, hasMore: response.has_more };
};

/**
 * Get the user IDs who should receive invoice-related notifications.
 */
async function getInvoiceRecipients(purchase: {
	userId: string | null;
	organizationId: string | null;
}): Promise<string[]> {
	if (purchase.userId) {
		return [purchase.userId];
	}
	if (purchase.organizationId) {
		const members = await db.member.findMany({
			where: {
				organizationId: purchase.organizationId,
				role: { in: ["owner", "admin"] },
			},
			select: { userId: true },
		});
		return members.map((m) => m.userId);
	}
	return [];
}

/**
 * Get user email and locale for sending invoice email.
 */
async function getRecipientUser(
	userId: string,
): Promise<{ email: string; locale: string | null } | null> {
	try {
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { email: true, locale: true },
		});
		if (!user) return null;
		return { email: user.email, locale: user.locale };
	} catch {
		return null;
	}
}

export const webhookHandler: WebhookHandler = async (req) => {
	const stripeClient = getStripeClient();

	if (!req.body) {
		return new Response("Invalid request.", {
			status: 400,
		});
	}

	let event: Stripe.Event | undefined;

	try {
		event = await stripeClient.webhooks.constructEventAsync(
			await req.text(),
			req.headers.get("stripe-signature") as string,
			process.env.STRIPE_WEBHOOK_SECRET as string,
		);
	} catch (e) {
		logger.error(e);

		return new Response("Invalid request.", {
			status: 400,
		});
	}

	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const { mode, metadata, customer, id } = event.data.object;

				if (mode === "subscription") {
					break;
				}

				const checkoutSession = await stripeClient.checkout.sessions.retrieve(id, {
					expand: ["line_items"],
				});

				const priceId = checkoutSession.line_items?.data[0].price?.id;
				const planId = priceId ? getPlanIdByProviderPriceId(priceId) : null;

				if (!planId || !priceId) {
					return new Response("Missing plan or price ID.", {
						status: 400,
					});
				}

				await createPurchase({
					organizationId: metadata?.organization_id || null,
					userId: metadata?.user_id || null,
					customerId: customer as string,
					type: "ONE_TIME",
					priceId,
				});

				await setCustomerIdToEntity(customer as string, {
					organizationId: metadata?.organization_id,
					userId: metadata?.user_id,
				});

				break;
			}
			case "customer.subscription.created": {
				const { metadata, customer, items, id } = event.data.object;

				const priceId = items?.data[0].price?.id;
				const planId = priceId ? getPlanIdByProviderPriceId(priceId) : null;

				if (!planId || !priceId) {
					return new Response("Missing plan or price ID.", {
						status: 400,
					});
				}

				await createPurchase({
					subscriptionId: id,
					organizationId: metadata?.organization_id || null,
					userId: metadata?.user_id || null,
					customerId: customer as string,
					type: "SUBSCRIPTION",
					priceId,
					status: event.data.object.status,
				});

				await setCustomerIdToEntity(customer as string, {
					organizationId: metadata?.organization_id,
					userId: metadata?.user_id,
				});

				break;
			}
			case "customer.subscription.updated": {
				const subscriptionId = event.data.object.id;

				const existingPurchase = await getPurchaseBySubscriptionId(subscriptionId);

				if (existingPurchase) {
					const priceId = event.data.object.items?.data[0].price?.id;

					await updatePurchase({
						id: existingPurchase.id,
						status: event.data.object.status,
						...(priceId ? { priceId } : {}),
					});
				}

				break;
			}
			case "customer.subscription.deleted": {
				await deletePurchaseBySubscriptionId(event.data.object.id);

				break;
			}
			case "invoice.paid": {
				const invoice = event.data.object;
				const subscriptionId =
					typeof invoice.parent?.subscription_details?.subscription === "string"
						? invoice.parent.subscription_details.subscription
						: null;

				if (!subscriptionId) break;

				const purchase = await getPurchaseBySubscriptionId(subscriptionId);
				if (!purchase) break;

				await updatePurchase({ id: purchase.id, status: "active" });
				logger.info("invoice.paid: purchase status set to active", {
					purchaseId: purchase.id,
				});

				// Send invoice paid notification + email with dedicated template
				const recipients = await getInvoiceRecipients(purchase);
				const invoiceData = invoice as unknown as Record<string, unknown>;
				const invoicePdf = invoiceData.invoice_pdf as string | null;
				const invoiceUrl = invoiceData.hosted_invoice_url as string | null;

				// Get org name for the email context
				const purchaseWithOrg = await db.purchase.findUnique({
					where: { id: purchase.id },
					include: { organization: true },
				});
				const orgName = purchaseWithOrg?.organization?.name ?? "AACsearch";

				// Get plan name from the plan config
				let planName = purchase.priceId;
				try {
					const { getPlanIdByProviderPriceId } =
						await import("../../lib/provider-price-ids");
					const planId = getPlanIdByProviderPriceId(purchase.priceId);
					if (planId) {
						planName = String(planId);
					}
				} catch {
					// fallback to priceId
				}

				const amount = (invoice.amount_paid / 100).toFixed(2);
				const currency = (invoice.currency ?? "USD").toUpperCase();
				const date = new Date(invoice.created * 1000).toLocaleDateString("en-US", {
					year: "numeric",
					month: "short",
					day: "numeric",
				});
				const manageBillingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.aacsearch.app"}/settings/billing`;

				await Promise.all([
					...recipients.map((userId) =>
						createNotification({
							userId,
							type: "WELCOME",
							data: {
								headline: "Invoice paid",
								message: `Your invoice of ${amount} ${currency} has been paid.`,
							},
							link: invoiceUrl,
						}).catch((err: unknown) =>
							logger.error("invoice.paid: notification failed", { userId, err }),
						),
					),
					// Send dedicated invoice paid email with proper template
					...recipients.map(async (userId) => {
						const user = await getRecipientUser(userId);
						if (user?.email) {
							await sendEmail({
								to: user.email,
								locale: (user.locale as "en" | "de" | "es" | "fr" | "ru") ?? "en",
								templateId: "invoicePaid",
								context: {
									orgName,
									planName,
									amount: `${currency} ${amount}`,
									currency,
									date,
									invoiceUrl: invoiceUrl ?? invoicePdf ?? manageBillingUrl,
									manageBillingUrl,
								},
							}).catch((err: unknown) =>
								logger.error("invoice.paid: email send failed", { userId, err }),
							);
						}
					}),
				]);

				break;
			}

			// ── Auto-Recharge PaymentIntents ──────────────────────────
			case "payment_intent.succeeded": {
				const pi = event.data.object as Stripe.PaymentIntent;
				const isAutoRecharge = pi.metadata?.auto_recharge_order_id != null;
				if (isAutoRecharge) {
					const orderId = pi.metadata.auto_recharge_order_id;
					const walletId = pi.metadata.wallet_id;
					const amountKopecks = BigInt(pi.amount_received ?? pi.amount) * BigInt(100);

					try {
						const result = await applyTopupCredit({
							providerOperationId: pi.id,
							providerPaymentId: pi.id,
							amountKopecks,
							eventId: `webhook_pi:${pi.id}`,
						});

						if (result.applied) {
							await db.walletTopupOrder.update({
								where: { id: orderId },
								data: { status: "paid", paidAt: new Date() },
							});
							if (walletId) {
								await notifyTopupPaid({ walletId, amountKopecks, orderId });
							}
						}

						logger.info("stripe.webhook: auto-recharge paid", {
							orderId,
							piId: pi.id,
							amountKopecks: Number(amountKopecks),
						});
					} catch (err) {
						logger.error("stripe.webhook: auto-recharge applyTopupCredit failed", {
							orderId,
							piId: pi.id,
							error: String(err),
						});
					}
				}
				break;
			}

			case "payment_intent.payment_failed": {
				const pi = event.data.object as Stripe.PaymentIntent;
				const isAutoRecharge = pi.metadata?.auto_recharge_order_id != null;
				if (isAutoRecharge) {
					const orderId = pi.metadata.auto_recharge_order_id;
					const walletId = pi.metadata.wallet_id;

					await db.walletTopupOrder.update({
						where: { id: orderId },
						data: {
							status: "failed",
							metadata: {
								failureReason: pi.last_payment_error?.message ?? "unknown",
								failedAt: new Date().toISOString(),
								stripeStatus: pi.status,
							},
						},
					});

					if (walletId) {
						await notifyTopupFailed({
							walletId,
							orderId,
							reason: pi.last_payment_error?.message ?? "Payment failed",
						});
					}

					logger.error("stripe.webhook: auto-recharge payment failed", {
						orderId,
						piId: pi.id,
						error: pi.last_payment_error?.message,
					});
				}
				break;
			}

			default:
				return new Response("Unhandled event type.", {
					status: 200,
				});
		}

		return new Response(null, { status: 204 });
	} catch (error) {
		return new Response(`Webhook error: ${error instanceof Error ? error.message : ""}`, {
			status: 400,
		});
	}
};
