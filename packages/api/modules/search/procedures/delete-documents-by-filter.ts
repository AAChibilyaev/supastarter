import { aliasName, deleteByQuery } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const deleteDocumentsByFilter = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/documents/delete-by-filter",
		tags: ["Search"],
		summary: "Delete documents by filter expression",
		description:
			"Deletes all documents matching a filter expression. Requires a non-empty filter for safety — accidental full-collection deletion is prevented.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			filterBy: z
				.string()
				.min(1, "Filter expression cannot be empty — prevents accidental full-collection deletion"),
		}),
	)
	.output(
		z.object({
			deleted: z.number(),
		}),
	)
	.handler(async ({ input: { organizationId, slug, filterBy }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);
		await requireSearchIndex(organizationId, slug);

		const alias = aliasName(organizationId, slug);

		const result = await deleteByQuery(alias, filterBy);

		return {
			deleted: result.num_deleted ?? 0,
		};
	});
