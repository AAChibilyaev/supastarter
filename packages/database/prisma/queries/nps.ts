import { db } from "../client";
import { Prisma } from "../generated/client";

export type NpsSource = "in_app" | "email" | "support";

/**
 * Record an NPS survey response.
 * Returns the created record.
 */
export async function createNpsResponse(params: {
	userId: string;
	organizationId?: string | null;
	score: number;
	feedback?: string | null;
	source: NpsSource;
}) {
	return db.npsSurveyResponse.create({
		data: {
			userId: params.userId,
			organizationId: params.organizationId ?? null,
			score: params.score,
			feedback: params.feedback ?? null,
			source: params.source,
		},
	});
}

/**
 * Get the latest NPS response for a user.
 * Optionally scoped to an organization.
 */
export async function getLatestNpsResponse(userId: string, organizationId?: string | null) {
	return db.npsSurveyResponse.findFirst({
		where: {
			userId,
			...(organizationId ? { organizationId } : {}),
		},
		orderBy: { createdAt: "desc" },
	});
}

/**
 * Count NPS responses for trend analytics.
 */
export async function countNpsResponsesByOrganization(organizationId: string) {
	return db.npsSurveyResponse.count({
		where: { organizationId },
	});
}
