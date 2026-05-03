import { searchDocuments, aliasName } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const listDocuments = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/documents",
		tags: ["Search"],
		summary: "List documents in an index",
		description:
			"Returns paginated documents from Typesense for a given index. Uses an empty query to return all documents.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			page: z.number().int().min(1).optional().default(1),
			perPage: z.number().int().min(1).max(250).optional().default(20),
			searchQuery: z.string().optional(),
		}),
	)
	.handler(
		async ({ input: { organizationId, slug, page, perPage, searchQuery }, context: { user } }) => {
			await requireOrganizationMember(organizationId, user.id);
			const index = await requireSearchIndex(organizationId, slug);

			const alias = aliasName(organizationId, slug);

			const result = await searchDocuments({
				alias,
				tenantId: organizationId,
				q: searchQuery ?? "*",
				queryBy: "",
				perPage,
				page,
			});

			return {
				hits: result.hits,
				found: result.found,
				page: result.page,
				perPage: result.perPage,
				indexId: index.id,
				indexSlug: slug,
			};
		},
	);
