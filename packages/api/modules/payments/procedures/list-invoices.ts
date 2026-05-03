import { ORPCError } from "@orpc/client";
import { getPurchaseById } from "@repo/database";
import { listInvoices as listInvoicesFn } from "@repo/payments";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const listInvoices = protectedProcedure
	.route({
		method: "GET",
		path: "/payments/invoices",
		tags: ["Payments"],
		summary: "List invoices",
		description: "Get all invoices for a purchase's subscription.",
	})
	.input(
		z.object({
			purchaseId: z.string(),
		}),
	)
	.output(
		z.array(
			z.object({
				id: z.string(),
				number: z.string(),
				amount: z.number(),
				currency: z.string(),
				status: z.string(),
				paidAt: z.string().nullable(),
				periodStart: z.string(),
				periodEnd: z.string(),
				pdfUrl: z.string().nullable(),
				hostedUrl: z.string().nullable(),
			}),
		),
	)
	.handler(async ({ input, context: { user } }) => {
		const purchase = await getPurchaseById(input.purchaseId);
		if (!purchase) {
			throw new ORPCError("NOT_FOUND", { message: "Purchase not found" });
		}

		// Verify ownership: user must own the purchase or be in the org
		if (purchase.userId && purchase.userId !== user.id) {
			throw new ORPCError("FORBIDDEN");
		}
		if (purchase.organizationId && !purchase.userId?.startsWith("org_")) {
			// Allow if user is in the organization
			const { getOrganizationMembership } = await import("@repo/database");
			const membership = await getOrganizationMembership(purchase.organizationId, user.id);
			if (!membership) {
				throw new ORPCError("FORBIDDEN");
			}
		}

		if (!purchase.subscriptionId) {
			return [];
		}

		try {
			const invoices = await listInvoicesFn(purchase.subscriptionId);
			return invoices.map((inv) => ({
				id: inv.id,
				number: inv.number ?? "",
				amount: inv.amount,
				currency: inv.currency,
				status: inv.status,
				paidAt: inv.paidAt,
				periodStart: inv.periodStart,
				periodEnd: inv.periodEnd,
				pdfUrl: inv.pdfUrl,
				hostedUrl: inv.hostedUrl,
			}));
		} catch (e) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to retrieve invoices",
			});
		}
	});
