import { ORPCError } from "@orpc/client";
import {
	getOrganizationMembership,
	getOrganizationPreferredCurrency,
	setOrganizationPreferredCurrency,
} from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

/**
 * Get the organization's preferred display currency for invoice amounts.
 * Returns null if not set (uses Stripe's native currency).
 */
export const getPreferredCurrency = protectedProcedure
	.route({
		method: "GET",
		path: "/payments/preferred-currency",
		tags: ["Payments"],
		summary: "Get preferred invoice currency",
		description: "Get the organization's preferred display currency for invoice amounts",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			preferredCurrency: z.string().nullable(),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		const membership = await getOrganizationMembership(organizationId, user.id);
		if (!membership) {
			throw new ORPCError("FORBIDDEN");
		}

		const preferredCurrency = await getOrganizationPreferredCurrency(organizationId);

		return { preferredCurrency };
	});

/**
 * Set the organization's preferred display currency for invoice amounts.
 * Pass null to clear the preference (use Stripe's native currency).
 */
export const setPreferredCurrency = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/preferred-currency",
		tags: ["Payments"],
		summary: "Set preferred invoice currency",
		description: "Set the organization's preferred display currency for invoice amounts",
	})
	.input(
		z.object({
			organizationId: z.string(),
			preferredCurrency: z.string().nullable(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
		}),
	)
	.handler(async ({ input: { organizationId, preferredCurrency }, context: { user } }) => {
		const membership = await getOrganizationMembership(organizationId, user.id);
		if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
			throw new ORPCError("FORBIDDEN");
		}

		// Validate currency code if provided
		if (preferredCurrency !== null) {
			const validCurrencies = [
				"USD",
				"EUR",
				"RUB",
				"GBP",
				"JPY",
				"CNY",
				"INR",
				"CAD",
				"AUD",
				"CHF",
				"SEK",
				"NOK",
				"DKK",
				"NZD",
				"SGD",
				"HKD",
				"KRW",
				"BRL",
				"MXN",
				"TRY",
				"ZAR",
			];
			const upper = preferredCurrency.toUpperCase();
			if (!validCurrencies.includes(upper)) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Unsupported currency: ${preferredCurrency}. Supported: ${validCurrencies.join(", ")}`,
				});
			}
		}

		await setOrganizationPreferredCurrency(
			organizationId,
			preferredCurrency?.toUpperCase() ?? null,
		);

		return { success: true };
	});
