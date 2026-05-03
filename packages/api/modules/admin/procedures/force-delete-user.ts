import {
	exportUserData,
	anonymizeUserData,
	anonymizeUserReferences,
	getOrphanOrganizations,
	completeDeletionRequest,
} from "@repo/database";
import { z } from "zod";

import { logger } from "../../../lib/scrubbed-logger";
import { adminProcedure } from "../../../orpc/procedures";

export const forceDeleteUser = adminProcedure
	.route({
		method: "POST",
		path: "/admin/users/force-delete",
		tags: ["Admin", "GDPR"],
		summary: "Force-delete a user account (admin only)",
		description:
			"Immediately initiates the GDPR deletion pipeline for a user without a grace period. Exports user data, anonymizes personal data, and anonymizes references. For admin-initiated deletions only.",
	})
	.input(
		z.object({
			userId: z.string(),
			reason: z.string(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			message: z.string(),
			dataExported: z.boolean(),
		}),
	)
	.handler(async ({ input: { userId, reason } }) => {
		// Export user data before anonymization
		const exported = await exportUserData(userId);
		const dataExported = exported !== null;

		// Anonymize references
		await anonymizeUserReferences(userId);

		// Anonymize personal data
		await anonymizeUserData(userId);

		const orphanOrgs = await getOrphanOrganizations(userId);

		logger.warn("User force-deleted by admin", {
			adminUserId: userId,
			reason,
			dataExported,
			orphanOrgCount: orphanOrgs.length,
		});

		return {
			success: true,
			message: `User ${userId} has been anonymized and deletion pipeline initiated.${orphanOrgs.length > 0 ? ` Note: user was last member of ${orphanOrgs.length} organization(s).` : ""}`,
			dataExported,
		};
	});
