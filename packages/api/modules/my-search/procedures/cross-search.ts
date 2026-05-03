import { listPersonalSearchIndexes } from "@repo/database";
import { aliasName, multiSearchDocuments } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const crossSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/my-search/search",
		tags: ["My Search"],
		summary: "Search across all personal search indexes",
		description:
			"Performs a federated search across all personal search indexes belonging to the user's organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
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

		const indexes = await listPersonalSearchIndexes(input.organizationId);

		if (indexes.length === 0) {
			return { hits: [], found: 0, page: 1, perPage: input.perPage, searchTimeMs: 0 };
		}

		const entries = indexes.map((idx) => {
			const chunkAlias = `${aliasName(input.organizationId, idx.slug)}_chunks`;
			const indexFilter = `index_id:=${idx.slug}`;
			const combinedFilter = input.fileTypeFilter
				? `${indexFilter} && file_type:=${input.fileTypeFilter}`
				: indexFilter;

			return {
				alias: chunkAlias,
				q: input.q,
				queryBy: "content",
				highlightFields: "content",
				filterBy: combinedFilter,
				tenantId: input.organizationId,
				perPage: input.perPage,
				page: input.page,
			};
		});

		const results = await multiSearchDocuments(entries);

		// Merge results from all collections
		let totalFound = 0;
		const mergedHits: unknown[] = [];
		let maxSearchTimeMs = 0;

		for (const result of results) {
			totalFound += result.found;
			mergedHits.push(...result.hits);
			if (result.searchTimeMs > maxSearchTimeMs) {
				maxSearchTimeMs = result.searchTimeMs;
			}
		}

		// Sort merged hits by text_match score descending (Typesense ranks per-collection)
		mergedHits.sort((a: unknown, b: unknown) => {
			const aScore = ((a as Record<string, unknown>).text_match as number) ?? 0;
			const bScore = ((b as Record<string, unknown>).text_match as number) ?? 0;
			return bScore - aScore;
		});

		// Paginate merged results
		const totalPages = Math.ceil(totalFound / input.perPage);
		const page = Math.min(input.page, totalPages || 1);
		const startIndex = (page - 1) * input.perPage;
		const paginatedHits = mergedHits.slice(startIndex, startIndex + input.perPage);

		return {
			hits: paginatedHits,
			found: totalFound,
			page,
			perPage: input.perPage,
			searchTimeMs: maxSearchTimeMs,
		};
	});
