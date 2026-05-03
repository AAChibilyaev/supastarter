import { ORPCError } from "@orpc/client";
import { getOrganizationMembership, getPurchasesByOrganizationId, getPurchasesByUserId } from "@repo/database";
import { logger } from "@repo/logs";
import { listCustomerInvoices } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

const InvoiceSchema = z.object({
	id: z.string(),
	date: z.number().nullable(),
	amountPaid: z.number(),
	currency: z.string(),
	status: z.string().nullable(),
	invoicePdf: z.string().nullable(),
	hostedInvoiceUrl: z.string().nullable(),
	number: z.string().nullable(),
});

export const listInvoices = protectedProcedure
	.route({
		method: "GET",
		path: "/payments/invoices",
		tags: ["Payments"],
		summary: "List invoices",
		description: "List Stripe invoices for the current user or organization",
	})
	.input(
		z.object({
			organizationId: z.string().optional(),
			limit: z.number().min(1).max(100).optional().default(10),
			startingAfter: z.string().optional(),
		}),
	)
	.output(
		z.object({
			invoices: z.array(InvoiceSchema),
			hasMore: z.boolean(),
		}),
	)
	.handler(async ({ input: { organizationId, limit, startingAfter }, context: { user } }) => {
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
			return { invoices: [], hasMore: false };
		}

		try {
			return await listCustomerInvoices({ customerId, limit, startingAfter });
		} catch (e) {
			logger.error("Failed to list Stripe invoices", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
