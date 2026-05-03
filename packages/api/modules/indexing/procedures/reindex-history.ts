import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../../search/lib/access";

const reindexJobSchema = z.object({
	id: z.string(),
	indexId: z.string(),
	organizationId: z.string(),
	slug: z.string(),
	status: z.enum(["pending", "running", "completed", "failed"]),
	processed: z.number().int(),
	total: z.number().int(),
	startedAt: z.string(),
	finishedAt: z.string().nullable(),
});

export const reindexHistory = protectedProcedure
	.route({
		method: "GET",
		path: "/indexing/reindex/history",
		tags: ["Indexing"],
		summary: "List reindex job history",
		description:
			"Returns paginated history of reindex jobs for an organization, " +
			"ordered by most recent first.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			limit: z.number().int().min(1).max(100).optional().default(20),
			offset: z.number().int().min(0).optional().default(0),
		}),
	)
	.output(
		z.object({
			jobs: z.array(reindexJobSchema),
			total: z.number().int(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const { listReindexJobHistory } = await import("@repo/database");

		return listReindexJobHistory(input.organizationId, input.limit, input.offset);
	});
