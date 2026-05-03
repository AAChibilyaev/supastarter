import { ORPCError } from "@orpc/client";
import { getPersonalSearchIndexById } from "@repo/database";
import { aliasName, searchDocuments } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const searchIndex = protectedProcedure
	.route({
		method: "POST",
		path: "/my-search/indexes/{id}/search",
		tags: ["My Search"],
		summary: "Search within a personal search index",
		description: "Searches across all document chunks indexed in a personal search index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.string(),
			q: z.string().min(1),
			page: z.number().int().min(1).optional().default(1),
			perPage: z.number().int().min(1).max(100).optional().default(20),
			fileTypeFilter: z.string().optional(),
		}),
	)
	.output(
		z.object({
			hits: z.array(z.unknown()),
			found: z.number(),
			page: z.number(),
			perPage: z.number(),
			searchTimeMs: z.number(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAccess(input.organizationId, user.id);

		const index = await getPersonalSearchIndexById(input.organizationId, input.id);
		if (!index) {
			throw new ORPCError("NOT_FOUND", {
				message: "Search index not found",
			});
		}

		const chunkAlias = `${aliasName(input.organizationId, index.slug)}_chunks`;

		const fileTypeFilter = input.fileTypeFilter
			? `file_type:=${input.fileTypeFilter}`
			: undefined;
		const indexFilter = `index_id:=${index.slug}`;
		const combinedFilter = fileTypeFilter ? `${indexFilter} && ${fileTypeFilter}` : indexFilter;

		const results = await searchDocuments({
			alias: chunkAlias,
			tenantId: input.organizationId,
			q: input.q,
			queryBy: "content",
			highlightFields: "content",
			filterBy: combinedFilter,
			perPage: input.perPage,
			page: input.page,
		});

		return {
			hits: results.hits,
			found: results.found,
			page: results.page,
			perPage: results.perPage,
			searchTimeMs: results.searchTimeMs,
		};
	});
