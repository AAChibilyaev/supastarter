import { ORPCError } from "@orpc/client";
import { getPersonalSearchIndexById } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const getIndex = protectedProcedure
	.route({
		method: "GET",
		path: "/my-search/indexes/{id}",
		tags: ["My Search"],
		summary: "Get personal search index",
		description: "Gets a single personal search index by ID.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.string(),
		}),
	)
	.output(
		z.object({
			id: z.string(),
			slug: z.string(),
			displayName: z.string(),
			version: z.number(),
			createdAt: z.date(),
			updatedAt: z.date(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAccess(input.organizationId, user.id);

		const index = await getPersonalSearchIndexById(input.organizationId, input.id);
		if (!index) {
			throw new ORPCError("NOT_FOUND", { message: "Search index not found" });
		}

		return {
			id: index.id,
			slug: index.slug,
			displayName: index.displayName,
			version: index.version,
			createdAt: index.createdAt,
			updatedAt: index.updatedAt,
		};
	});
