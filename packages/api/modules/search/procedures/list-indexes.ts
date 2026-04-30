import { listSearchIndexes } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

export const listIndexes = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes",
		tags: ["Search"],
		summary: "List search indexes",
		description: "Lists all search indexes for the given organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);
		const indexes = await listSearchIndexes(organizationId);
		return indexes.map((index) => ({
			id: index.id,
			organizationId: index.organizationId,
			slug: index.slug,
			displayName: index.displayName,
			version: index.version,
			enabled: index.enabled,
			createdAt: index.createdAt,
			updatedAt: index.updatedAt,
			apiKeysCount: index._count.apiKeys,
		}));
	});
