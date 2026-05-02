import { ORPCError } from "@orpc/client";
import { deleteSearchIndex } from "@repo/database";
import { logger } from "@repo/logs";
import { deleteSearchIndexCollections } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const deleteIndex = protectedProcedure
	.route({
		method: "DELETE",
		path: "/search/indexes/{slug}",
		tags: ["Search"],
		summary: "Delete search index",
		description:
			"Deletes the search index record, alias, versioned Typesense collections, and related documents.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(
		z.object({
			deleted: z.literal(true),
			id: z.string(),
			slug: z.string(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		try {
			await deleteSearchIndexCollections(input.organizationId, input.slug);
			await deleteSearchIndex(index.id);
		} catch (error) {
			logger.error("Failed to delete search index", {
				error,
				organizationId: input.organizationId,
				slug: input.slug,
				indexId: index.id,
			});
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "delete_index_failed",
			});
		}

		return {
			deleted: true,
			id: index.id,
			slug: index.slug,
		};
	});
