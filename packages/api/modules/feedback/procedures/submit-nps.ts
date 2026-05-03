import { trackEvent } from "@repo/analytics";
import { createNpsResponse } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const submitNps = protectedProcedure
	.route({
		method: "POST",
		path: "/feedback/nps",
		tags: ["Feedback"],
		summary: "Submit NPS survey response",
		description:
			"Submits a Net Promoter Score (NPS) on a 0-10 scale with optional follow-up feedback.",
	})
	.input(
		z.object({
			score: z.number().int().min(0).max(10),
			feedback: z.string().max(2000).optional(),
			organizationId: z.string().optional(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
		}),
	)
	.handler(async ({ input: { score, feedback, organizationId }, context: { user } }) => {
		// Create the NPS response record
		await createNpsResponse({
			userId: user.id,
			organizationId,
			score,
			feedback,
			source: "in_app",
		});

		// Track the event via PostHog
		trackEvent("aac_nps_submitted", user.id, {
			score,
			source: "in_app",
			...(organizationId ? { organization_id: organizationId } : {}),
		});

		logger.info(
			{
				userId: user.id,
				score,
				hasFeedback: !!feedback,
			},
			"NPS survey submitted",
		);

		return { success: true };
	});
