import { getActivationEvents, ALL_ACTIVATION_EVENTS } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../../search/lib/access";

export const listEvents = protectedProcedure
	.route({
		method: "GET",
		path: "/onboarding/events",
		tags: ["Onboarding"],
		summary: "List activation milestones for an organization",
		description: "Returns all completed activation events for the given organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			events: z.array(
				z.object({
					eventType: z.string(),
					completedAt: z.date(),
				}),
			),
			completedCount: z.number(),
			totalSteps: z.number(),
			allCompleted: z.boolean(),
			nextStep: z.string().nullable(),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const events = await getActivationEvents(organizationId);
		const completedTypes = new Set(events.map((e) => e.eventType));

		const completedCount = completedTypes.size;
		const totalSteps = ALL_ACTIVATION_EVENTS.length;
		const allCompleted = completedCount >= totalSteps;

		const nextStep = ALL_ACTIVATION_EVENTS.find((t) => !completedTypes.has(t)) ?? null;

		return {
			events: events.map((e) => ({
				eventType: e.eventType,
				completedAt: e.completedAt,
			})),
			completedCount,
			totalSteps,
			allCompleted,
			nextStep,
		};
	});
