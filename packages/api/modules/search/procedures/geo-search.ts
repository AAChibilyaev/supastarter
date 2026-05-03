import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const geoPolygonSchema = z.object({
	field: z.string().optional(),
	polygon: z.array(z.tuple([z.number(), z.number()])).min(3),
});

const geoBoundingBoxSchema = z.object({
	field: z.string().optional(),
	bounding_box: z.tuple([
		z.object({ lat: z.number(), lng: z.number() }),
		z.object({ lat: z.number(), lng: z.number() }),
	]),
});

export const geoSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/geo-search",
		tags: ["Search"],
		summary: "Geo-location search",
		description:
			"Search documents with location-based filtering. Supports radius, polygon, and bounding box. " +
			"Use radius for simple proximity, polygon for arbitrary shapes, or bounding box for rectangle areas.",
	})
	.input(
		z
			.object({
				organizationId: z.string(),
				slug: searchIndexSlugSchema,
				query: z.string().min(1).max(1000),
				queryBy: z.string().optional(),
				// ── Radius search (mutually exclusive with polygon/bbox) ──
				lat: z.number().min(-90).max(90).optional(),
				lng: z.number().min(-180).max(180).optional(),
				radiusKm: z.number().min(0.1).max(40_075).optional().default(50),
				geoField: z.string().default("location"),
				// ── Polygon search ──
				polygonFilter: geoPolygonSchema.optional(),
				// ── Bounding box search ──
				boundingBoxFilter: geoBoundingBoxSchema.optional(),
				perPage: z.number().int().min(1).max(250).default(20),
				filterBy: z.string().optional(),
				sortBy: z.string().optional(),
			})
			.refine(
				(data) => {
					const hasRadius = data.lat !== undefined || data.lng !== undefined;
					const hasPolygon = data.polygonFilter !== undefined;
					const hasBbox = data.boundingBoxFilter !== undefined;
					const modes = [hasRadius, hasPolygon, hasBbox].filter(Boolean).length;
					return modes === 1;
				},
				{
					message:
						"Exactly one geo mode required: radius (lat/lng), polygon, or bounding box",
				},
			),
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

		const client = getTypesenseClient();

		// Apply geo filter based on mode
		let geoFilter: string | undefined;
		if (input.lat !== undefined && input.lng !== undefined) {
			geoFilter = `${input.geoField}:(${input.lat}, ${input.lng}, ${input.radiusKm} km)`;
		} else if (input.polygonFilter) {
			const field = input.polygonFilter.field ?? "_geoloc";
			const vertices = input.polygonFilter.polygon
				.map(([lat, lng]) => `(${lat}, ${lng})`)
				.join(", ");
			geoFilter = `${field}:[${vertices}]`;
		} else if (input.boundingBoxFilter) {
			const field = input.boundingBoxFilter.field ?? "_geoloc";
			const { bounding_box } = input.boundingBoxFilter;
			geoFilter = `${field}:(${bounding_box[0].lat}, ${bounding_box[0].lng}, ${bounding_box[1].lat}, ${bounding_box[1].lng})`;
		}

		const combinedFilter =
			input.filterBy && geoFilter
				? `${input.filterBy} && ${geoFilter}`
				: (geoFilter ?? input.filterBy);

		// Build sort_by: geo sort for radius, preserve user sort for polygon/bbox
		let sortBy: string | undefined;
		if (input.lat !== undefined && input.lng !== undefined) {
			sortBy = input.sortBy
				? `${input.geoField}(${input.lat}, ${input.lng}):asc,${input.sortBy}`
				: `${input.geoField}(${input.lat}, ${input.lng}):asc`;
		} else {
			sortBy = input.sortBy;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const results = (await client
			.collections(index.slug)
			.documents()
			.search({
				q: input.query,
				query_by: input.queryBy ?? "title,description",
				filter_by: combinedFilter,
				per_page: input.perPage,
				sort_by: sortBy,
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
