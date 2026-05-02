import { getIndexingHealthStats } from "@repo/database";
import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";
import { indexingHealthStatsSchema } from "../types";

export const healthStats = protectedProcedure
	.route({
		method: "GET",
		path: "/indexing/health",
		tags: ["Indexing"],
		summary: "Get indexing health and statistics",
		description:
			"Returns indexing pipeline health stats: active jobs, completion rates, and Typesense cluster health.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		indexingHealthStatsSchema.extend({
			typesenseOk: z.boolean(),
			typesenseVersion: z.string().optional(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const [stats, typesenseHealth] = await Promise.all([
			getIndexingHealthStats(input.organizationId),
			getTypesenseClusterHealth(),
		]);

		return {
			...stats,
			typesenseOk: typesenseHealth.ok,
			typesenseVersion: typesenseHealth.version,
		};
	});

async function getTypesenseClusterHealth(): Promise<{
	ok: boolean;
	version?: string;
}> {
	const client = getTypesenseClient();
	try {
		const health = (await (client as any).health.retrieve()) as any;
		const metrics = (await (client as any).metrics.retrieve()) as any;
		return {
			ok: health?.ok ?? false,
			version: metrics?.version as string,
		};
	} catch {
		return { ok: false };
	}
}
