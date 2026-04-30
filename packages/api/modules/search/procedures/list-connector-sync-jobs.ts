import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";
import { listSyncJobs } from "../lib/sync-jobs";

export const listConnectorSyncJobs = protectedProcedure
	.route({
		method: "GET",
		path: "/search/connector-sync-jobs",
		tags: ["Search"],
		summary: "List connector sync jobs",
		description: "Returns recent connector sync jobs (full/delta) tracked in-memory.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);
		return listSyncJobs(organizationId);
	});
