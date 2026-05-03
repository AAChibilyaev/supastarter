import { cancelDeletionRequest, getUserDeletionRequest, updateUser } from "@repo/database";
import { z } from "zod";

import { logger } from "../../../lib/scrubbed-logger";
import { protectedProcedure } from "../../../orpc/procedures";

export const cancelDeletion = protectedProcedure
	.route({
		method: "POST",
		path: "/users/cancel-deletion",
		tags: ["Users", "GDPR"],
		summary: "Cancel a pending deletion request",
		description:
			"Cancels a pending deletion request using the cancellation token received when deletion was requested. Restores user login access and profile.",
	})
	.input(
		z.object({
			cancellationToken: z.string(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			message: z.string(),
		}),
	)
	.handler(async ({ input: { cancellationToken }, context: { user } }) => {
		const existingRequest = await getUserDeletionRequest(user.id);

		if (!existingRequest) {
			return {
				success: false,
				message: "No pending deletion request found.",
			};
		}

		if (existingRequest.cancellationToken !== cancellationToken) {
			return {
				success: false,
				message: "Invalid cancellation token.",
			};
		}

		if (existingRequest.status !== "pending") {
			return {
				success: false,
				message: `Deletion request is already ${existingRequest.status}. Cannot cancel.`,
			};
		}

		// Cancel the deletion request
		await cancelDeletionRequest(cancellationToken);

		// Remove anonymized flag so user can use the account again
		await updateUser({
			id: user.id,
			anonymized: false,
		});

		logger.info("User deletion cancelled", {
			userId: user.id,
			deletionRequestId: existingRequest.id,
		});

		return {
			success: true,
			message:
				"Deletion request cancelled. Your account has been restored. You may update your profile information.",
		};
	});
