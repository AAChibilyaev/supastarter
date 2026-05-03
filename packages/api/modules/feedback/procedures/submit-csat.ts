import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const submitCsat = protectedProcedure
	.route({
		method: "POST",
		path: "/feedback/csat",
		tags: ["Feedback"],
		summary: "Submit CSAT survey response",
		description: "Submits a Customer Satisfaction (CSAT) score on a 1-5 scale.",
	})
	.input(
		z.object({
			score: z.number().int().min(1).max(5),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		logger.info(
			{
				userId: user.id,
				score: input.score,
			},
			"CSAT survey submitted",
		);

		return { success: true };
	});
