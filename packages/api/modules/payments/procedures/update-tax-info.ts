import { ORPCError } from "@orpc/client";
import { db, getOrganizationById } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

const TaxInfoInputSchema = z.object({
	taxIdType: z.enum(["vat", "ein", "inn"]).optional(),
	taxId: z.string().optional(),
	legalName: z.string().optional(),
	address: z.string().optional(),
	invoiceEmail: z.string().optional(),
});

export const updateTaxInfo = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/tax-info",
		tags: ["Payments"],
		summary: "Update tax/invoice info",
		description: "Save or update tax and invoice settings for an organization",
	})
	.input(
		z.object({
			organizationId: z.string(),
			taxInfo: TaxInfoInputSchema,
		}),
	)
	.output(
		z.object({
			updated: z.literal(true),
		}),
	)
	.handler(async ({ input: { organizationId, taxInfo }, context: { user } }) => {
		const organization = await getOrganizationById(organizationId);

		if (!organization) {
			throw new ORPCError("NOT_FOUND");
		}

		const isMember = organization.members.some((m) => m.userId === user.id);
		if (!isMember) {
			throw new ORPCError("FORBIDDEN");
		}

		const existingMetadata = organization.metadata
			? (JSON.parse(organization.metadata) as Record<string, unknown>)
			: {};

		const newMetadata = {
			...existingMetadata,
			invoice: {
				...(typeof existingMetadata.invoice === "object" &&
				existingMetadata.invoice !== null
					? (existingMetadata.invoice as Record<string, unknown>)
					: {}),
				...taxInfo,
			},
		};

		try {
			await db.organization.update({
				where: { id: organizationId },
				data: { metadata: JSON.stringify(newMetadata) },
			});

			return { updated: true as const };
		} catch (e) {
			logger.error("Could not update tax info", e);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
