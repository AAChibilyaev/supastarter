import { recordActivationEvent, type ActivationEventKind } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../../search/lib/access";

/** All valid activation event types. */
const ACTIVATION_EVENT_TYPES = [
	"EMAIL_VERIFIED",
	"FIRST_COLLECTION",
	"FIRST_DOCUMENT",
	"FIRST_SEARCH",
	"WIDGET_EMBEDDED",
	"FIRST_TEAM_MEMBER",
	"FIRST_INTEGRATION",
	"FIRST_PAYMENT",
	"RELEVANCE_CONFIGURED",
] as const;

export const recordEvent = protectedProcedure
	.route({
		method: "POST",
		path: "/onboarding/events",
		tags: ["Onboarding"],
		summary: "Record an activation milestone event",
		description:
			"Records that an organization has completed an activation milestone. Idempotent — re-recording the same event is a no-op.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			eventType: z.enum(ACTIVATION_EVENT_TYPES),
			metadata: z.record(z.string(), z.unknown()).optional(),
		}),
	)
	.output(
		z.object({
			id: z.string(),
			eventType: z.string(),
			completedAt: z.date(),
		}),
	)
	.handler(async ({ input: { organizationId, eventType, metadata }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const event = await recordActivationEvent(
			organizationId,
			eventType as ActivationEventKind,
			metadata,
		);

		return {
			id: event.id,
			eventType: event.eventType,
			completedAt: event.completedAt,
		};
	});
