import { ORPCError } from "@orpc/client";
import {
	getOrganizationMembership,
	getOrganizationPreferredCurrency,
	getPurchasesByOrganizationId,
	getPurchasesByUserId,
} from "@repo/database";
import { logger } from "@repo/logs";
import { convertInvoiceAmount, listCustomerInvoices } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

const InvoiceLineSchema = z.object({
	id: z.string(),
	description: z.string(),
	amount: z.number(),
	currency: z.string(),
});

const ConvertedAmountSchema = z.object({
	amount: z.number(),
	currency: z.string(),
	rate: z.number().nullable(),
	convertedAt: z.string(),
});

const InvoiceSchema = z.object({
	id: z.string(),
	date: z.number().nullable(),
	amountPaid: z.number(),
	currency: z.string(),
	status: z.string().nullable(),
	invoicePdf: z.string().nullable(),
	hostedInvoiceUrl: z.string().nullable(),
	number: z.string().nullable(),
	convertedAmount: ConvertedAmountSchema.optional(),
});

export const listInvoices = protectedProcedure
	.route({
		method: "GET",
		path: "/payments/invoices",
		tags: ["Payments"],
		summary: "List invoices",
		description:
			"List Stripe invoices for the current user or organization, with optional multi-currency conversion via FxRate. Falls back to organization's preferred currency when not specified.",
	})
	.input(
		z.object({
			organizationId: z.string().optional(),
			limit: z.number().min(1).max(100).optional().default(10),
			startingAfter: z.string().optional(),
			preferredCurrency: z.string().optional(),
		}),
	)
	.output(
		z.object({
			invoices: z.array(InvoiceSchema),
			hasMore: z.boolean(),
			conversionApplied: z.boolean().optional(),
		}),
	)
	.handler(
		async ({
			input: { organizationId, limit, startingAfter, preferredCurrency },
			context: { user },
		}) => {
			if (organizationId) {
				const membership = await getOrganizationMembership(organizationId, user.id);
				if (!membership) {
					throw new ORPCError("FORBIDDEN");
				}
			}

			const purchases = organizationId
				? await getPurchasesByOrganizationId(organizationId)
				: await getPurchasesByUserId(user.id);

			const customerId = purchases.find((p) => p.customerId)?.customerId;

			if (!customerId) {
				return { invoices: [], hasMore: false, conversionApplied: false };
			}

			try {
				const result = await listCustomerInvoices({
					customerId,
					limit,
					startingAfter,
				});

				// Auto-apply organization's preferred currency if not explicitly provided
				let targetCurrency = preferredCurrency;
				if (!targetCurrency && organizationId) {
					const orgPreferred = await getOrganizationPreferredCurrency(organizationId);
					if (orgPreferred) {
						targetCurrency = orgPreferred;
					}
				}

				// Apply multi-currency conversion if a preferred currency is specified
				if (targetCurrency && result.invoices.length > 0) {
					const convertedInvoices = await Promise.all(
						result.invoices.map(async (invoice) => {
							const converted = await convertInvoiceAmount(
								invoice.amountPaid,
								invoice.currency,
								targetCurrency,
							);

							if (converted === null) {
								return invoice;
							}

							return {
								...invoice,
								convertedAmount: {
									amount: Math.round(converted),
									currency: targetCurrency.toUpperCase(),
									rate:
										invoice.amountPaid > 0
											? Math.round(
													(converted / invoice.amountPaid) * 1_000_000,
												) / 1_000_000
											: null,
									convertedAt: new Date().toISOString(),
								},
							};
						}),
					);

					return {
						invoices: convertedInvoices,
						hasMore: result.hasMore,
						conversionApplied: true,
					};
				}

				return {
					invoices: result.invoices,
					hasMore: result.hasMore,
					conversionApplied: false,
				};
			} catch (e) {
				logger.error("Failed to list Stripe invoices", e);
				throw new ORPCError("INTERNAL_SERVER_ERROR");
			}
		},
	);
