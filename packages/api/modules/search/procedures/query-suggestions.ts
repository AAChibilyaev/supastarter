import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const querySuggestions = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/suggestions",
		tags: ["Search"],
		summary: "Get query suggestions/autocomplete",
		description:
			"Returns suggested search queries based on analytics data. Useful for autocomplete and typeahead.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			prefix: z.string().min(1).max(200),
			limit: z.number().int().min(1).max(20).default(5),
		}),
	)
	.output(
		z.object({
			suggestions: z.array(
				z.object({
					query: z.string(),
					count: z.number(),
				}),
			),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);
		await requireSearchIndex(input.organizationId, input.slug);

		const client = getTypesenseClient();
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const analytics = (await (client as any).analytics.rules().retrieve()) as any;
			const rules = analytics?.rules ?? [];

			const matching = rules
				.filter(
					(r: any) =>
						r.type === "popular_queries" &&
						(r.query ?? "").toLowerCase().includes(input.prefix.toLowerCase()),
				)
				.slice(0, input.limit);

			return {
				suggestions: matching.map((r: any) => ({
					query: r.query as string,
					count: (r.count as number) ?? 0,
				})),
			};
		} catch {
			// Fallback: return empty suggestions if analytics not configured
			return { suggestions: [] };
		}
	});
