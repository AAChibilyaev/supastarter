import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const geoSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/geo-search",
		tags: ["Search"],
		summary: "Geo-location search",
		description:
			"Search documents with location-based filtering using Typesense's built-in geo support.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(1).max(1000),
			queryBy: z.string().optional(),
			lat: z.number().min(-90).max(90),
			lng: z.number().min(-180).max(180),
			radiusKm: z.number().min(0.1).max(40_075).default(50),
			geoField: z.string().default("location"),
			perPage: z.number().int().min(1).max(250).default(20),
			filterBy: z.string().optional(),
			sortBy: z.string().optional(),
		}),
	)
	.output(
		z.object({
			found: z.number(),
			hits: z.array(
				z.object({
					document: z.record(z.string(), z.unknown()),
					geoDistanceMeters: z.number().optional(),
				}),
			),
			searchTimeMs: z.number(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const geoFilter = `${input.geoField}:(${input.lat}, ${input.lng}, ${input.radiusKm} km)`;
		const combinedFilter = input.filterBy ? `${input.filterBy} && ${geoFilter}` : geoFilter;

		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const results = (await client
			.collections(index.slug)
			.documents()
			.search({
				q: input.query,
				query_by: input.queryBy ?? "title,description",
				filter_by: combinedFilter,
				per_page: input.perPage,
				sort_by: input.sortBy
					? `${input.geoField}(${input.lat}, ${input.lng}):asc,${input.sortBy}`
					: `${input.geoField}(${input.lat}, ${input.lng}):asc`,
			} as any)) as any;

		return {
			found: results.found ?? 0,
			hits: ((results.hits ?? []) as any[]).map((hit: any) => ({
				document: hit.document as Record<string, unknown>,
				geoDistanceMeters: hit.geo_distance_meters as number | undefined,
			})),
			searchTimeMs: results.search_time_ms ?? 0,
		};
	});
