import { ORPCError } from "@orpc/client";
import { getOrganizationById } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

const TaxInfoOutputSchema = z.object({
	taxIdType: z.string().nullable(),
	taxId: z.string().nullable(),
	legalName: z.string().nullable(),
	address: z.string().nullable(),
	invoiceEmail: z.string().nullable(),
});

export const getTaxInfo = protectedProcedure
	.route({
		method: "GET",
		path: "/payments/tax-info",
		tags: ["Payments"],
		summary: "Get tax/invoice info",
		description: "Read tax and invoice settings for an organization",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			taxInfo: TaxInfoOutputSchema,
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		const organization = await getOrganizationById(organizationId);

		if (!organization) {
			throw new ORPCError("NOT_FOUND");
		}

		const isMember = organization.members.some((m) => m.userId === user.id);
		if (!isMember) {
			throw new ORPCError("FORBIDDEN");
		}

		const metadata = organization.metadata
			? (JSON.parse(organization.metadata) as Record<string, unknown>)
			: {};

		const invoice = metadata.invoice as
			| {
					taxIdType?: string | null;
					taxId?: string | null;
					legalName?: string | null;
					address?: string | null;
					invoiceEmail?: string | null;
			  }
			| undefined;

		return {
			taxInfo: {
				taxIdType: invoice?.taxIdType ?? null,
				taxId: invoice?.taxId ?? null,
				legalName: invoice?.legalName ?? null,
				address: invoice?.address ?? null,
				invoiceEmail: invoice?.invoiceEmail ?? null,
			},
		};
	});
