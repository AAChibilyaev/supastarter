import { ORPCError } from "@orpc/client";
import { cancelReindexJob, getReindexJobById } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

export const cancelReindex = protectedProcedure
	.route({
		method: "POST",
		path: "/indexing/cancel-reindex",
		tags: ["Indexing"],
		summary: "Cancel a running or pending reindex job",
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

		const job = await getReindexJobById(input.jobId);
		if (!job) {
			throw new ORPCError("NOT_FOUND", {
				message: "Reindex job not found",
			});
		}

		if (job.status !== "pending" && job.status !== "running") {
			throw new ORPCError("BAD_REQUEST", {
				message: `Cannot cancel reindex job with status "${job.status}"`,
			});
		}

		const cancelled = await cancelReindexJob(input.jobId);

		logger.info("Reindex job cancelled", {
			jobId: input.jobId,
			organizationId: input.organizationId,
		});

		return { cancelled };
	});
