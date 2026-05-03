import {
	createDeletionRequest,
	anonymizeUserData,
	anonymizeUserReferences,
	getOrphanOrganizations,
} from "@repo/database";
import { z } from "zod";

import { logger } from "../../../lib/scrubbed-logger";
import { protectedProcedure } from "../../../orpc/procedures";

export const requestDeletion = protectedProcedure
	.route({
		method: "POST",
		path: "/users/request-deletion",
		tags: ["Users", "GDPR"],
		summary: "Request account deletion (GDPR Right to Erasure)",
		description:
			"Initiates the GDPR deletion pipeline: creates a 30-day grace period request, immediately anonymizes personal data, and returns a cancellation token. The user can cancel within 30 days using the token.",
	})
	.input(
		z.object({
			reason: z.string().optional(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			message: z.string(),
			deletionRequestId: z.string(),
			retentionUntil: z.string(),
			cancellationToken: z.string(),
		}),
	)
	.handler(async ({ input: { reason }, context: { user } }) => {
		// Check if user is last member of any org
		const orphanOrgs = await getOrphanOrganizations(user.id);

		// Create deletion request with 30-day grace period
		const request = await createDeletionRequest(user.id, reason);

		// Anonymize user references (audit logs, purchases, etc.)
		await anonymizeUserReferences(user.id);

		// Immediately anonymize personal data
		await anonymizeUserData(user.id);

		logger.info("User deletion requested", {
			userId: user.id,
			deletionRequestId: request.id,
			retentionUntil: request.retentionUntil.toISOString(),
			orphanOrgCount: orphanOrgs.length,
		});

		return {
			success: true,
			message:
				orphanOrgs.length > 0
					? `Deletion scheduled. Note: you are the last member of ${orphanOrgs.length} organization(s). They will be frozen after deletion.`
					: "Deletion scheduled. You have 30 days to cancel using your cancellation token.",
			deletionRequestId: request.id,
			retentionUntil: request.retentionUntil.toISOString(),
			cancellationToken: request.cancellationToken,
		};
	});
