import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const groupedSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/grouped-search",
		tags: ["Search"],
		summary: "Grouped search results",
		description:
			"Search with result grouping by a specified field. Each group returns the top N hits.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(1).max(1000),
			queryBy: z.string().optional(),
			groupBy: z.string().min(1),
			groupLimit: z.number().int().min(1).max(100).default(3),
			perPage: z.number().int().min(1).max(250).default(20),
			filterBy: z.string().optional(),
		}),
	)
	.output(
		z.object({
			found: z.number(),
			groups: z.array(
				z.object({
					groupKey: z.array(z.string()),
					found: z.number(),
					hits: z.array(
						z.object({
							document: z.record(z.string(), z.unknown()),
						}),
					),
				}),
			),
			searchTimeMs: z.number(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const results = (await client
			.collections(index.slug)
			.documents()
			.search({
				q: input.query,
				query_by: input.queryBy ?? "title,description",
				group_by: input.groupBy,
				group_limit: input.groupLimit,
				per_page: input.perPage,
				filter_by: input.filterBy ?? undefined,
			} as any)) as any;

		return {
			found: results.found ?? 0,
			groups: ((results.grouped_hits ?? []) as any[]).map((group: any) => ({
				groupKey: group.group_key as string[],
				found: group.found ?? 0,
				hits: (group.hits ?? []).map((hit: any) => ({
					document: hit.document as Record<string, unknown>,
				})),
			})),
			searchTimeMs: results.search_time_ms ?? 0,
		};
	});
