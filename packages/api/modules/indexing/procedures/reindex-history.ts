import { listReindexJobHistory } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";
import { reindexJobViewSchema } from "../types";

export const reindexHistory = protectedProcedure
	.route({
		method: "GET",
		path: "/indexing/reindex-history",
		tags: ["Indexing"],
		summary: "List reindex job history for an organization",
	})
	.input(
		z.object({
			organizationId: z.string(),
			limit: z.number().min(1).max(100).default(20),
			offset: z.number().min(0).default(0),
		}),
	)
	.output(
		z.object({
			jobs: z.array(reindexJobViewSchema),
			total: z.number(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		return listReindexJobHistory(input.organizationId, input.limit, input.offset);
	});
