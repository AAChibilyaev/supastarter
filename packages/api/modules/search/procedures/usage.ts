import { aggregateSearchUsage } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

const DAY_MS = 24 * 60 * 60 * 1000;

export const usage = protectedProcedure
	.route({
		method: "GET",
		path: "/search/usage",
		tags: ["Search"],
		summary: "Get search usage",
	})
	.input(
		z.object({
			organizationId: z.string(),
			windowDays: z.number().int().min(1).max(365).optional(),
		}),
	)
	.output(
		z.object({
			since: z.string(),
			rows: z.array(z.any()),
		}),
	)
	.handler(async ({ input: { organizationId, windowDays }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);
		const since = new Date(Date.now() - (windowDays ?? 30) * DAY_MS);
		const rows = await aggregateSearchUsage(organizationId, since);
		return { since: since.toISOString(), rows };
	});
