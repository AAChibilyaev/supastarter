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
import { invalidatePlanCache } from "../../lib/entitlements";
import { getPlanIdByProviderPriceId } from "../../lib/provider-price-ids";
import type { CreateUpgradeSession } from "../../types";
import type {
	CancelSubscription,
	CreateCheckoutLink,
	CreateCustomerPortalLink,
	GetProrationPreview,
	SetSubscriptionSeats,
	UpgradeSubscription,
	WebhookHandler,
} from "../../types";

let stripeClient: Stripe | null = null;

// In-memory cache of processed Stripe event IDs for idempotency.
// Best-effort guard within the same process lifetime (survives restarts only via Stripe's own retry idempotency).
const processedEventIds = new Set<string>();
const IDEMPOTENCY_CLEANUP_INTERVAL_MS = 3600_000; // 1 hour
let lastCleanup = Date.now();

/** Check if an event has already been processed. Logs a warning on duplicate. */
function isEventProcessed(eventId: string): boolean {
	if (processedEventIds.has(eventId)) {
		logger.warn("Duplicate Stripe event detected (skipping)", { eventId });
		return true;
	}
	processedEventIds.add(eventId);

	// Periodic cleanup to prevent memory leak
	const now = Date.now();
	if (now - lastCleanup > IDEMPOTENCY_CLEANUP_INTERVAL_MS) {
		processedEventIds.clear();
		lastCleanup = now;
	}
	return false;
}

/** Retry a Stripe API call with exponential backoff on transient errors. */
async function retryStripeCall<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
	let lastError: unknown;
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (error instanceof Stripe.errors.StripeError) {
				// Only retry on rate limits (429) and server errors (5xx)
				if (error.statusCode && error.statusCode >= 500 && error.statusCode < 600) {
					if (attempt < maxRetries) {
						const delay = Math.min(1000 * 2 ** attempt, 10_000);
						logger.warn("Stripe API error, retrying", {
							statusCode: error.statusCode,
							attempt: attempt + 1,
							delayMs: delay,
						});
						await new Promise((r) => setTimeout(r, delay));
						continue;
					}
				} else if (error.statusCode === 429) {
					if (attempt < maxRetries) {
						const delay = Math.min(2000 * 2 ** attempt, 15_000);
						logger.warn("Stripe rate limited, retrying", {
							attempt: attempt + 1,
							delayMs: delay,
						});
						await new Promise((r) => setTimeout(r, delay));
						continue;
					}
				}
			}
			// Non-retryable error or exhausted retries
			throw error;
		}
	}
	throw lastError;
}

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

	const automaticTaxEnabled = process.env.STRIPE_AUTOMATIC_TAX === "true";

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
						setup_future_usage: "off_session",
					},
					customer_creation: "always",
				}
			: {
					subscription_data: {
						metadata,
						trial_period_days: trialPeriodDays,
						...(automaticTaxEnabled
							? {
									default_settings: {
										card: {
											request_three_d_secure: "automatic",
										},
									},
								}
							: {}),
					},
				}),
		...(automaticTaxEnabled
			? {
					automatic_tax: { enabled: true },
					tax_id_collection: { enabled: true },
					billing_address_collection: "required",
					...(customerId ? { customer_update: { address: "auto", name: "auto" } } : {}),
				}
			: {}),
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

	if (options?.mode === "cancel_at_period_end") {
		await stripeClient.subscriptions.update(id, { cancel_at_period_end: true });
	} else {
		await stripeClient.subscriptions.cancel(id);
	}
};

export interface PaymentMethodInfo {
	id: string;
	brand: string | null;
	last4: string | null;
	expMonth: number | null;
	expYear: number | null;
}

export const listPaymentMethods = async (customerId: string): Promise<PaymentMethodInfo[]> => {
	const stripeClient = getStripeClient();
	const methods = await stripeClient.paymentMethods.list({
		customer: customerId,
		type: "card",
	});
	return methods.data.map((pm) => ({
		id: pm.id,
		brand: pm.card?.brand ?? null,
		last4: pm.card?.last4 ?? null,
		expMonth: pm.card?.exp_month ?? null,
		expYear: pm.card?.exp_year ?? null,
	}));
};

export const detachPaymentMethod = async (paymentMethodId: string): Promise<void> => {
	const stripeClient = getStripeClient();
	await stripeClient.paymentMethods.detach(paymentMethodId);
};

export const createUpgradeSession: CreateUpgradeSession = async (params) => {
	const stripeClient = getStripeClient();
	const { subscriptionId, newPriceId, customerId, organizationId, userId, returnUrl } = params;

	// Retrieve the current subscription to get the existing item
	const subscription = await retryStripeCall(() =>
		stripeClient.subscriptions.retrieve(subscriptionId),
	);

	if (!subscription) {
		throw new Error(`Subscription ${subscriptionId} not found`);
	}

	const currentItem = subscription.items?.data[0];
	if (!currentItem) {
		throw new Error(`No items found on subscription ${subscriptionId}`);
	}

	const currentPriceId = currentItem.price.id;
	if (currentPriceId === newPriceId) {
		return {
			type: "direct_update" as const,
			success: true,
			immediateAmount: 0,
			currency: (currentItem.price.currency ?? "usd").toUpperCase(),
			creditAmount: 0,
			nextInvoiceAmount: currentItem.price.unit_amount ?? null,
		};
	}

	// Get accurate proration via Stripe SDK v22 createPreview
	const upcomingInvoice = await retryStripeCall(() =>
		stripeClient.invoices.createPreview({
			customer: customerId,
			subscription: subscriptionId,
			subscription_details: {
				items: [{ id: currentItem.id, deleted: true }, { price: newPriceId }],
				proration_behavior: "create_prorations",
				billing_cycle_anchor: "unchanged",
			},
		}),
	);

	const currency = (upcomingInvoice.currency ?? "usd").toUpperCase();
	const amountDue = upcomingInvoice.amount_due;
	const amountPaid = upcomingInvoice.amount_paid;
	const immediateAmount = amountDue - amountPaid;

	// Credit = sum of negative proration line items for unused time
	const creditLines = upcomingInvoice.lines.data.filter(
		(line: {
			amount: number;
			parent?: {
				subscription_item_details?: { proration: boolean } | null;
				invoice_item_details?: { proration: boolean } | null;
			} | null;
		}) =>
			line.amount < 0 &&
			(line.parent?.subscription_item_details?.proration ??
				line.parent?.invoice_item_details?.proration ??
				false),
	);
	const creditAmount = Math.abs(creditLines.reduce((sum, line) => sum + line.amount, 0));

	// Next full invoice amount = new price (non-proration items)
	const nextInvoiceAmount = upcomingInvoice.lines.data
		.filter(
			(line: {
				amount: number;
				pricing?: {
					price_details?: {
						price: string | { id: string };
					} | null;
				} | null;
				parent?: {
					subscription_item_details?: { proration: boolean } | null;
					invoice_item_details?: { proration: boolean } | null;
				} | null;
			}) => {
				const linePriceId =
					typeof line.pricing?.price_details?.price === "object"
						? line.pricing.price_details.price.id
						: line.pricing?.price_details?.price;
				const isProration =
					line.parent?.subscription_item_details?.proration ??
					line.parent?.invoice_item_details?.proration ??
					false;
				return linePriceId === newPriceId && !isProration;
			},
		)
		.reduce((sum, line) => sum + line.amount, 0);

	// If payment is needed, create a Checkout session
	if (immediateAmount > 0) {
		const metadata: Record<string, string> = {
			upgrade_subscription: "true",
			current_subscription_id: subscriptionId,
			new_price_id: newPriceId,
		};
		if (organizationId) {
			metadata.organization_id = organizationId;
		}
		if (userId) {
			metadata.user_id = userId;
		}

		const session = await retryStripeCall(() =>
			stripeClient.checkout.sessions.create({
				mode: "payment",
				customer: customerId,
				line_items: [
					{
						price_data: {
							currency: upcomingInvoice.currency ?? "usd",
							product_data: {
								name: `Plan upgrade — prorated amount`,
							},
							unit_amount: immediateAmount,
						},
						quantity: 1,
					},
				],
				metadata,
				success_url: returnUrl,
				cancel_url: returnUrl,
			}),
		);

		logger.info("Upgrade Checkout session created", {
			subscriptionId,
			from: currentPriceId,
			to: newPriceId,
			immediateAmount,
			sessionId: session.id,
		});

		return {
			type: "checkout" as const,
			url: session.url,
			immediateAmount,
			currency,
			creditAmount,
			nextInvoiceAmount,
		};
	}

	// No payment needed — update subscription directly
	await retryStripeCall(() =>
		stripeClient.subscriptions.update(subscriptionId, {
			items: [
				{
					id: currentItem.id,
					deleted: true,
				},
				{
					price: newPriceId,
				},
			],
			proration_behavior: "create_prorations",
			billing_cycle_anchor: "unchanged",
			off_session: true,
		}),
	);

	logger.info("Subscription upgraded directly (no payment needed)", {
		subscriptionId,
		from: currentPriceId,
		to: newPriceId,
		immediateAmount,
	});

	return {
		type: "direct_update" as const,
		success: true,
		immediateAmount,
		currency,
		creditAmount,
		nextInvoiceAmount,
	};
};
export const upgradeSubscription: UpgradeSubscription = async ({
	subscriptionId,
	newPriceId,
	seats,
	prorationBehavior = "create_prorations",
}) => {
	const stripeClient = getStripeClient();

	// Retrieve the current subscription to get the existing item IDs
	const subscription = await retryStripeCall(() =>
		stripeClient.subscriptions.retrieve(subscriptionId),
	);

	if (!subscription) {
		throw new Error(`Subscription ${subscriptionId} not found`);
	}

	const currentItem = subscription.items?.data[0];
	if (!currentItem) {
		throw new Error(`No items found on subscription ${subscriptionId}`);
	}

	// Build the update: mark old item as deleted, add new item
	const items: Stripe.SubscriptionUpdateParams.Item[] = [
		{
			id: currentItem.id,
			deleted: true,
		},
		{
			price: newPriceId,
			...(seats ? { quantity: seats } : {}),
		},
	];

	await retryStripeCall(() =>
		stripeClient.subscriptions.update(subscriptionId, {
			items,
			proration_behavior: prorationBehavior,
			// Preserve the current billing cycle anchor
			billing_cycle_anchor: "unchanged",
			// Ensure subscription doesn't pause during update
			off_session: true,
		}),
	);

	logger.info("Subscription upgraded/downgraded", {
		subscriptionId,
		from: currentItem.price.id,
		to: newPriceId,
		prorationBehavior,
	});
};

/**
 * Preview prorated charges/credits for a plan change without applying it.
 * Calculates approximate proration from the current subscription period.
 */
export const getProrationPreview: GetProrationPreview = async ({
	subscriptionId,
	newPriceId,
	seats,
}) => {
	const stripeClient = getStripeClient();

	const subscription = await retryStripeCall(() =>
		stripeClient.subscriptions.retrieve(subscriptionId),
	);

	if (!subscription) {
		throw new Error(`Subscription ${subscriptionId} not found`);
	}

	const currentItem = subscription.items?.data[0];
	if (!currentItem) {
		throw new Error(`No items found on subscription ${subscriptionId}`);
	}

	// Get both price objects to compare amounts
	const oldPrice = currentItem.price;
	const newPriceObj = await retryStripeCall(() => stripeClient.prices.retrieve(newPriceId));

	if (!oldPrice || !newPriceObj) {
		throw new Error("Could not retrieve price information");
	}

	const oldAmount = oldPrice.unit_amount ?? 0;
	const newAmount = newPriceObj.unit_amount ?? 0;
	const currency = (oldPrice.currency ?? "usd").toUpperCase();

	// Calculate proration based on remaining days in the current period
	const now = Math.floor(Date.now() / 1000);
	const sub = subscription as unknown as {
		current_period_start: number;
		current_period_end: number;
	};
	const periodStart = sub.current_period_start;
	const periodEnd = sub.current_period_end;
	const totalPeriodDays = periodEnd - periodStart;
	const remainingDays = periodEnd - now;
	const fractionRemaining = totalPeriodDays > 0 ? remainingDays / totalPeriodDays : 0;

	// Credit for unused portion of old plan
	const creditAmount = Math.round(oldAmount * fractionRemaining);

	// Charge for new plan for remaining days
	const newPlanCharge = Math.round(newAmount * fractionRemaining);

	// Net immediate effect (positive = charge, negative = credit)
	const immediateAmount = newPlanCharge - creditAmount;

	// Next full invoice amount (new plan full price)
	const nextInvoiceAmount = newAmount;

	return {
		prorationDate: now,
		immediateAmount,
		currency,
		nextInvoiceAmount,
		creditAmount,
	};
};

async function getPaymentRecipients(purchase: {
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
		// Idempotency: skip already-processed Stripe events
		if (isEventProcessed(event.id)) {
			logger.info("Skipping already-processed Stripe event", {
				eventId: event.id,
				type: event.type,
			});
			return new Response(null, { status: 204 });
		}

		logger.info("Processing Stripe webhook event", {
			eventId: event.id,
			type: event.type,
		});

		switch (event.type) {
			case "checkout.session.completed": {
				const { mode, metadata, customer, id } = event.data.object;

				// Handle upgrade subscription checkout (payment for prorated upgrade amount)
				if (metadata?.upgrade_subscription === "true") {
					const currentSubscriptionId = metadata.current_subscription_id;
					const newPriceId = metadata.new_price_id;

					if (!currentSubscriptionId || !newPriceId) {
						return new Response("Missing upgrade metadata.", {
							status: 400,
						});
					}

					// Retrieve the current subscription to get the existing item IDs
					const subscription = await retryStripeCall(() =>
						stripeClient.subscriptions.retrieve(currentSubscriptionId),
					);

					if (!subscription) {
						return new Response("Subscription not found.", {
							status: 404,
						});
					}

					const currentItem = subscription.items?.data[0];
					if (!currentItem) {
						return new Response("No items found on subscription.", {
							status: 404,
						});
					}

					// Now update the subscription with the new price
					await retryStripeCall(() =>
						stripeClient.subscriptions.update(currentSubscriptionId, {
							items: [
								{
									id: currentItem.id,
									deleted: true,
								},
								{
									price: newPriceId,
								},
							],
							proration_behavior: "none",
							billing_cycle_anchor: "unchanged",
							off_session: true,
						}),
					);

					logger.info("Subscription upgraded via Checkout payment", {
						subscriptionId: currentSubscriptionId,
						to: newPriceId,
					});

					// Send plan upgrade welcome notification
					const planName = getPlanIdByProviderPriceId(newPriceId) || "new plan";
					const purchaseAfterUpgrade =
						await getPurchaseBySubscriptionId(currentSubscriptionId);
					if (purchaseAfterUpgrade) {
						const recipients = await getPaymentRecipients(purchaseAfterUpgrade);
						const orgSlug = purchaseAfterUpgrade.organizationId
							? (
									await db.organization.findUnique({
										where: { id: purchaseAfterUpgrade.organizationId },
										select: { slug: true },
									})
								)?.slug
							: null;
						const dashboardUrl = orgSlug
							? `/organizations/${orgSlug}/settings/billing`
							: "/settings/billing";

						await Promise.all(
							recipients.map((userId) =>
								createNotification({
									userId,
									type: "WELCOME",
									data: {
										headline: `Plan upgraded to ${planName}`,
										message:
											`Your plan has been successfully upgraded to ${planName}. ` +
											"You now have access to all the features and increased limits of your new plan.",
									},
									link: dashboardUrl,
								}).catch((err: unknown) =>
									logger.error("Failed to send upgrade notification", err),
								),
							),
						);

						// Invalidate plan cache so updated limits take effect immediately
						if (purchaseAfterUpgrade.organizationId) {
							invalidatePlanCache(purchaseAfterUpgrade.organizationId);
						}
						logger.info("Plan cache invalidated after checkout upgrade", {
							subscriptionId: currentSubscriptionId,
							organizationId: purchaseAfterUpgrade.organizationId,
						});
					}

					break;
				}

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
				const sub = event.data.object;
				const existingPurchase = await getPurchaseBySubscriptionId(sub.id);

				if (existingPurchase) {
					const priceId = sub.items?.data[0].price?.id;
					const status = sub.cancel_at_period_end ? "canceling" : sub.status;

					await updatePurchase({
						id: existingPurchase.id,
						status,
						...(priceId ? { priceId } : {}),
					});

					// Invalidate plan cache so updated limits take effect immediately
					if (existingPurchase.organizationId) {
						invalidatePlanCache(existingPurchase.organizationId);
					}
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

				break;
			}
			case "invoice.payment_failed": {
				const invoice = event.data.object;
				const subscriptionId =
					typeof invoice.parent?.subscription_details?.subscription === "string"
						? invoice.parent.subscription_details.subscription
						: null;

				if (!subscriptionId) break;

				const purchase = await getPurchaseBySubscriptionId(subscriptionId);
				if (!purchase) break;

				await updatePurchase({ id: purchase.id, status: "past_due" });

				const recipients = await getPaymentRecipients(purchase);
				const link = invoice.hosted_invoice_url ?? null;

				await Promise.all(
					recipients.map((userId) =>
						createNotification({
							userId,
							type: "PAYMENT_FAILED",
							data: {
								headline: "Subscription payment failed",
								message: "Your subscription payment could not be processed.",
								hosted_invoice_url: link,
							},
							link,
						}).catch((err: unknown) =>
							logger.error("invoice.payment_failed: createNotification failed", err),
						),
					),
				);

				break;
			}
			case "invoice.payment_action_required": {
				const invoice = event.data.object;
				const subscriptionId =
					typeof invoice.parent?.subscription_details?.subscription === "string"
						? invoice.parent.subscription_details.subscription
						: null;

				if (!subscriptionId) break;

				const purchase = await getPurchaseBySubscriptionId(subscriptionId);
				if (!purchase) break;

				await updatePurchase({ id: purchase.id, status: "past_due" });

				const recipients = await getPaymentRecipients(purchase);
				const hostedInvoiceUrl = invoice.hosted_invoice_url ?? null;

				await Promise.all(
					recipients.map((userId) =>
						createNotification({
							userId,
							type: "PAYMENT_FAILED",
							data: {
								headline: "Payment action required",
								message:
									"Your subscription payment requires additional action to complete.",
								hosted_invoice_url: hostedInvoiceUrl,
							},
							link: hostedInvoiceUrl,
						}).catch((err: unknown) =>
							logger.error(
								"invoice.payment_action_required: createNotification failed",
								err,
							),
						),
					),
				);

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
