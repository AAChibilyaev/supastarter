import { listPersonalSearchIndexes } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const listIndexes = protectedProcedure
	.route({
		method: "GET",
		path: "/my-search/indexes",
		tags: ["My Search"],
		summary: "List personal search indexes",
		description: "Lists all personal search indexes for the user's organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.array(
			z.object({
				id: z.string(),
				slug: z.string(),
				displayName: z.string(),
				version: z.number(),
				createdAt: z.date(),
				updatedAt: z.date(),
			}),
		),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAccess(input.organizationId, user.id);

		const indexes = await listPersonalSearchIndexes(input.organizationId);
		return indexes.map((idx) => ({
			id: idx.id,
			slug: idx.slug,
			displayName: idx.displayName,
			version: idx.version,
			createdAt: idx.createdAt,
			updatedAt: idx.updatedAt,
		}));
	});
