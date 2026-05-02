import { ORPCError } from "@orpc/client";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../../search/lib/access";

export const cancelReindex = protectedProcedure
	.route({
		method: "POST",
		path: "/indexing/reindex/{jobId}/cancel",
		tags: ["Indexing"],
		summary: "Cancel a running or pending reindex job",
		description:
			"Marks a reindex job as failed with 'Cancelled by user' status. " +
			"Only pending or running jobs can be cancelled.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			jobId: z.string(),
		}),
	)
	.output(
		z.object({
			cancelled: z.boolean(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const { cancelReindexJob } = await import("@repo/database");

		const cancelled = await cancelReindexJob(input.jobId);
		if (!cancelled) {
			throw new ORPCError("NOT_FOUND", {
				message: "Reindex job not found or already completed",
			});
		}

		return { cancelled: true };
	});
