import { ORPCError } from "@orpc/client";
import { getReindexJobById } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";
import { reindexJobViewSchema } from "../types";

export const reindexStatus = protectedProcedure
	.route({
		method: "GET",
		path: "/indexing/reindex-status",
		tags: ["Indexing"],
		summary: "Get the status of a specific reindex job",
	})
	.input(
		z.object({
			organizationId: z.string(),
			jobId: z.string(),
		}),
	)
	.output(reindexJobViewSchema.nullable())
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const job = await getReindexJobById(input.jobId);
		if (!job) {
			throw new ORPCError("NOT_FOUND", {
				message: "Reindex job not found",
			});
		}

		return job;
	});
