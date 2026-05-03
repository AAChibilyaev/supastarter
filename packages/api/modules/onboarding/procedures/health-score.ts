import { ORPCError } from "@orpc/client";
import { getActivationEvents } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

// ─── Weight configuration ─────────────────────────────────────

const HEALTH_WEIGHTS: Record<string, number> = {
	EMAIL_VERIFIED: 10,
	FIRST_COLLECTION: 15,
	FIRST_DOCUMENT: 20,
	FIRST_SEARCH: 15,
	WIDGET_EMBEDDED: 15,
	FIRST_TEAM_MEMBER: 10,
	FIRST_INTEGRATION: 5,
	FIRST_PAYMENT: 5,
};

const TOTAL_WEIGHT = Object.values(HEALTH_WEIGHTS).reduce((sum, w) => sum + w, 0); // 95 — scale up to 100

// ─── Procedure ────────────────────────────────────────────────

export const healthScore = protectedProcedure
	.route({
		method: "GET",
		path: "/onboarding/health-score",
		tags: ["Onboarding", "Health"],
		summary: "Get workspace health score",
		description:
			"Returns a health score (0-100) for an organization based on activation milestone completions, " +
			"with a breakdown per milestone.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		const events = await getActivationEvents(organizationId);

		const completedSet = new Set(events.map((e) => e.eventType));

		// Calculate individual milestone scores
		const milestones = Object.entries(HEALTH_WEIGHTS).map(([eventType, weight]) => {
			const completed = completedSet.has(eventType);
			return {
				eventType,
				weight,
				completed,
				score: completed ? Math.round((weight / TOTAL_WEIGHT) * 100) : 0,
			};
		});

		// Total score is sum of milestone scores (normalized to 0-100)
		const totalScore = milestones.reduce((sum, m) => sum + m.score, 0);

		return {
			score: Math.min(totalScore, 100),
			totalPossible: 100,
			milestones,
			completedCount: completedSet.size,
			totalCount: Object.keys(HEALTH_WEIGHTS).length,
		};
	});
