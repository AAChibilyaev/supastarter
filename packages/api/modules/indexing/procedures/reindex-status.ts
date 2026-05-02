import { ORPCError } from "@orpc/client";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../../search/lib/access";

export const reindexStatus = protectedProcedure
	.route({
		method: "GET",
		path: "/indexing/reindex/{jobId}/status",
		tags: ["Indexing"],
		summary: "Get reindex job status",
		description: "Returns the current status and progress of a reindex job.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			jobId: z.string(),
		}),
	)
	.output(
		z.object({
			id: z.string(),
			indexId: z.string(),
			slug: z.string(),
			status: z.enum(["pending", "running", "completed", "failed"]),
			processed: z.number().int(),
			total: z.number().int(),
			startedAt: z.string(),
			finishedAt: z.string().nullable(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const { getReindexJobById } = await import("@repo/database");

		const job = await getReindexJobById(input.jobId);
		if (!job || job.organizationId !== input.organizationId) {
			throw new ORPCError("NOT_FOUND", { message: "Reindex job not found" });
		}

		return job;
	});
