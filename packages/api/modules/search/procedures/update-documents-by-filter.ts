import { ORPCError } from "@orpc/client";
import { aliasName, updateDocumentsByFilter } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const updateDocumentsByFilterProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/documents/update-by-filter",
		tags: ["Search"],
		summary: "Update documents by filter expression",
		description:
			"Updates all documents matching a filter expression with the provided partial document fields.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			filterBy: z
				.string()
				.min(
					1,
					"Filter expression cannot be empty — prevents accidental full-collection update",
				),
			updates: z.record(z.string(), z.unknown()),
		}),
	)
	.output(
		z.object({
			updated: z.number(),
		}),
	)
	.handler(async ({ input: { organizationId, slug, filterBy, updates }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);
		await requireSearchIndex(organizationId, slug);

		const alias = aliasName(organizationId, slug);

		const result = await updateDocumentsByFilter(alias, updates, filterBy);

		return {
			updated: result.num_updated ?? 0,
		};
	});
