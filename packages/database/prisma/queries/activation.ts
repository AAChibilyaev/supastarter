import { db } from "../client";
import { Prisma } from "../generated/client";

/**
 * Activation event types that track onboarding funnel progress.
 */
export type ActivationEventKind =
	| "EMAIL_VERIFIED"
	| "FIRST_COLLECTION"
	| "FIRST_DOCUMENT"
	| "FIRST_SEARCH"
	| "WIDGET_EMBEDDED"
	| "FIRST_TEAM_MEMBER"
	| "FIRST_INTEGRATION"
	| "FIRST_PAYMENT";

/** All known activation event types in order. */
export const ALL_ACTIVATION_EVENTS: ActivationEventKind[] = [
	"EMAIL_VERIFIED",
	"FIRST_COLLECTION",
	"FIRST_DOCUMENT",
	"FIRST_SEARCH",
	"WIDGET_EMBEDDED",
	"FIRST_TEAM_MEMBER",
	"FIRST_INTEGRATION",
	"FIRST_PAYMENT",
];

/**
 * Record an activation event for an organization.
 * Uses upsert so it's idempotent — re-recording the same event is a no-op.
 */
export async function recordActivationEvent(
	organizationId: string,
	eventType: ActivationEventType,
	metadata?: Record<string, unknown>,
) {
	return db.activationEvent.upsert({
		where: {
			organizationId_eventType: { organizationId, eventType },
		},
		create: {
			organizationId,
			eventType,
			metadata: metadata as unknown as Prisma.InputJsonValue ?? Prisma.JsonNull,
		},
		update: {},
	});
}

/**
 * Get all activation events for an organization.
 */
export async function getActivationEvents(organizationId: string) {
	return db.activationEvent.findMany({
		where: { organizationId },
		orderBy: { completedAt: "asc" },
	});
}

/**
 * Check if a specific activation event has been completed.
 */
export async function hasActivationEvent(
	organizationId: string,
	eventType: ActivationEventType,
): Promise<boolean> {
	const event = await db.activationEvent.findUnique({
		where: {
			organizationId_eventType: { organizationId, eventType },
		},
		select: { id: true },
	});
	return event !== null;
}

/**
 * Get the completion rate for activation events across all organizations.
 * Returns a map of eventType → { completed, total } counts.
 */
export async function getCompletionRates() {
	const [totalOrgs, allEvents] = await Promise.all([
		db.organization.count(),
		db.activationEvent.groupBy({
			by: ["eventType"],
			_count: { organizationId: true },
		}),
	]);

	const rates: Record<string, { completed: number; total: number }> = {};
	for (const eventType of ALL_ACTIVATION_EVENTS) {
		const found = allEvents.find((e) => e.eventType === eventType);
		rates[eventType] = {
			completed: found?._count.organizationId ?? 0,
			total: totalOrgs,
		};
	}
	return rates;
}
