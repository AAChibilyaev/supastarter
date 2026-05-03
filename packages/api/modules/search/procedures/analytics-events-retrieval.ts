/**
 * Analytics Events Retrieval — query SearchUsageEvent data.
 *
 * Provides oRPC procedures to list/filter analytics events stored in
 * the search_usage_event table, supporting the full Typesense v30
 * analytics event model: search, click, conversion, visit.
 *
 * Events can be filtered by type, index, date range, and associated
 * with a specific query text from a search response.
 */

import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

const eventTypeSchema = z.enum([
	"search_query",
	"zero_results",
	"result_click",
	"widget_open",
	"filter_used",
	"conversion",
	"visit",
	"search",
	"click",
]);

const listEventsInputSchema = z.object({
	organizationId: z.string(),
	indexId: z.string().optional(),
	type: eventTypeSchema.optional(),
	limit: z.number().int().min(1).max(500).optional().default(100),
	offset: z.number().int().min(0).optional().default(0),
	since: z.string().optional().describe("ISO date string for lower bound"),
	until: z.string().optional().describe("ISO date string for upper bound"),
});

const eventOutputSchema = z.object({
	id: z.string(),
	indexId: z.string(),
	type: z.string(),
	count: z.number(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	createdAt: z.string(),
});

const DAY_MS = 24 * 60 * 60 * 1000;

export const listAnalyticsEvents = protectedProcedure
	.route({
		method: "GET",
		path: "/search/analytics/events",
		tags: ["Search"],
		summary: "List analytics events",
		description:
			"Returns analytics events (search, click, conversion, visit) " +
			"from the event store, filterable by type, index, and date range.",
	})
	.input(listEventsInputSchema)
	.output(
		z.object({
			events: z.array(eventOutputSchema),
			total: z.number(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);

		// Build WHERE clause as raw SQL parts to avoid type issues with Prisma dynamic where
		const conditions: string[] = ["event.organization_id = $1"];
		const params: unknown[] = [input.organizationId];
		let paramIndex = 2;

		if (input.indexId) {
			conditions.push(`event.index_id = $${paramIndex}`);
			params.push(input.indexId);
			paramIndex++;
		}

		if (input.type) {
			conditions.push(`event.type = $${paramIndex}`);
			params.push(input.type);
			paramIndex++;
		}

		if (input.since) {
			conditions.push(`event.created_at >= $${paramIndex}`);
			params.push(new Date(input.since));
			paramIndex++;
		}

		if (input.until) {
			conditions.push(`event.created_at <= $${paramIndex}`);
			params.push(new Date(input.until));
			paramIndex++;
		}

		const whereClause = conditions.join(" AND ");

		type EventRow = {
			id: string;
			index_id: string;
			type: string;
			count: number;
			metadata: Record<string, unknown> | null;
			created_at: Date;
		};

		const [events, totalRow] = await Promise.all([
			db.$queryRawUnsafe<EventRow[]>(
				`SELECT
					event.id,
					event.index_id,
					event.type,
					event.count,
					event.metadata,
					event.created_at
				FROM search_usage_event event
				WHERE ${whereClause}
				ORDER BY event.created_at DESC
				LIMIT $${paramIndex}
				OFFSET $${paramIndex + 1}`,
				...params,
				input.limit,
				input.offset,
			),
			db.$queryRawUnsafe<[{ total: bigint }]>(
				`SELECT COUNT(*)::bigint AS total
				FROM search_usage_event event
				WHERE ${whereClause}`,
				...params,
			),
		]);

		return {
			events: events.map((e) => ({
				id: e.id,
				indexId: e.index_id,
				type: e.type,
				count: Number(e.count),
				metadata: e.metadata as Record<string, unknown> | null,
				createdAt: e.created_at.toISOString(),
			})),
			total: Number(totalRow[0]?.total ?? 0),
		};
	});

const getEventInputSchema = z.object({
	organizationId: z.string(),
	eventId: z.string(),
});

export const getAnalyticsEvent = protectedProcedure
	.route({
		method: "GET",
		path: "/search/analytics/events/{eventId}",
		tags: ["Search"],
		summary: "Get analytics event by ID",
		description: "Returns a single analytics event by its database ID.",
	})
	.input(getEventInputSchema)
	.output(eventOutputSchema.nullable())
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);

		type EventRow = {
			id: string;
			index_id: string;
			type: string;
			count: number;
			metadata: Record<string, unknown> | null;
			created_at: Date;
		};

		const [event] = await db.$queryRawUnsafe<EventRow[]>(
			`SELECT
				event.id,
				event.index_id,
				event.type,
				event.count,
				event.metadata,
				event.created_at
			FROM search_usage_event event
			WHERE event.id = $1
			  AND event.organization_id = $2
			LIMIT 1`,
			input.eventId,
			input.organizationId,
		);

		if (!event) return null;

		return {
			id: event.id,
			indexId: event.index_id,
			type: event.type,
			count: Number(event.count),
			metadata: event.metadata as Record<string, unknown> | null,
			createdAt: event.created_at.toISOString(),
		};
	});

const getEventsByQueryInputSchema = z.object({
	organizationId: z.string(),
	queryText: z.string().min(1).max(512),
	indexId: z.string().optional(),
	type: eventTypeSchema.optional(),
	limit: z.number().int().min(1).max(100).optional().default(50),
});

/**
 * Retrieve analytics events associated with a specific search query text.
 * Useful for investigating user behavior for a particular query.
 */
export const getAnalyticsEventsByQuery = protectedProcedure
	.route({
		method: "GET",
		path: "/search/analytics/events/by-query",
		tags: ["Search"],
		summary: "Get analytics events by query text",
		description:
			"Returns analytics events that match a specific search query " +
			"text, extracted from event metadata.",
	})
	.input(getEventsByQueryInputSchema)
	.output(
		z.object({
			events: z.array(eventOutputSchema),
			total: z.number(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);

		const conditions = [
			"event.organization_id = $1",
			"(event.metadata->>'query' = $2 OR event.metadata->>'q' = $2)",
		];
		const params: unknown[] = [input.organizationId, input.queryText];
		let paramIndex = 3;

		if (input.indexId) {
			conditions.push(`event.index_id = $${paramIndex}`);
			params.push(input.indexId);
			paramIndex++;
		}

		if (input.type) {
			conditions.push(`event.type = $${paramIndex}`);
			params.push(input.type);
			paramIndex++;
		}

		const whereClause = conditions.join(" AND ");

		type EventRow = {
			id: string;
			index_id: string;
			type: string;
			count: number;
			metadata: Record<string, unknown> | null;
			created_at: Date;
		};
		type CountRow = { total: bigint };

		const [events, totalRow] = await Promise.all([
			db.$queryRawUnsafe<EventRow[]>(
				`SELECT
					event.id,
					event.index_id,
					event.type,
					event.count,
					event.metadata,
					event.created_at
				FROM search_usage_event event
				WHERE ${whereClause}
				ORDER BY event.created_at DESC
				LIMIT $${paramIndex}`,
				...params,
				input.limit,
			),
			db.$queryRawUnsafe<CountRow[]>(
				`SELECT COUNT(*)::bigint AS total
				FROM search_usage_event event
				WHERE ${whereClause}`,
				...params,
			),
		]);

		return {
			events: events.map((e) => ({
				id: e.id,
				indexId: e.index_id,
				type: e.type,
				count: Number(e.count),
				metadata: e.metadata as Record<string, unknown> | null,
				createdAt: e.created_at.toISOString(),
			})),
			total: Number(totalRow[0]?.total ?? 0),
		};
	});
