import { aliasName, deleteByQuery } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const bulkDeleteDocuments = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/documents/bulk-delete",
		tags: ["Search"],
		summary: "Bulk delete documents by IDs",
		description:
			"Deletes multiple documents from a search index by their document IDs. Uses Typesense filter expression for efficient batch deletion.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			ids: z.array(z.string()).min(1).max(1000),
		}),
	)
	.output(
		z.object({
			deleted: z.number(),
		}),
	)
	.handler(async ({ input: { organizationId, slug, ids }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);
		await requireSearchIndex(organizationId, slug);

		const alias = aliasName(organizationId, slug);

		// Build filter expression: id:=[id1,id2,id3]
		const filterBy = `id:=${ids.map((id) => `[${id}]`).join(",")}`;

		const result = await deleteByQuery(alias, filterBy);

		return {
			deleted: result.num_deleted ?? 0,
		};
	});
