import { ORPCError } from "@orpc/client";
import { getCreditUsageForecast } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { creditForecastDtoSchema } from "../types";

export const getCreditForecast = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/credits/forecast",
		tags: ["Credits Analytics"],
		summary: "Get projected credit consumption forecast",
		description:
			"Projects consumption for the current billing period based on historical daily average. Returns overage risk rating, remaining days, and monthly limit comparison.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(creditForecastDtoSchema)
	.handler(async ({ input }) => {
		const forecast = await getCreditUsageForecast(input.organizationId);
		if (!forecast) throw new ORPCError("NOT_FOUND", { message: "Wallet not found" });

		return forecast;
	});
