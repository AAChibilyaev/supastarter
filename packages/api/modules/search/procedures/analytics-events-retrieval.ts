/**
 * Analytics Events Retrieval — query SearchUsageEvent data.
 *
 * Provides oRPC procedures to list/filter analytics events stored in
 * the search_usage_event table, supporting the full Typesense v30
 * analytics event model: search, click, conversion, visit.
 *
 * Events can be filtered by type, index, date range, and associated
 * with a specific query_id from a search response.
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
		await requireOrganizationMember(input.organizationId, context.user);

		const where: Record<string, unknown> = {
			organizationId: input.organizationId,
		};

		if (input.indexId) {
			where.indexId = input.indexId;
		}

		if (input.type) {
			where.type = input.type;
		}

		if (input.since || input.until) {
			const createdAt: Record<string, Date> = {};
			if (input.since) {
				createdAt.gte = new Date(input.since);
			}
			if (input.until) {
				createdAt.lte = new Date(input.until);
			}
			where.createdAt = createdAt;
		}

		const [events, total] = await Promise.all([
			db.searchUsageEvent.findMany({
				where: where as Parameters<typeof db.searchUsageEvent.findMany>[0]["where"],
				orderBy: { createdAt: "desc" },
				take: input.limit,
				skip: input.offset,
			}),
			db.searchUsageEvent.count({
				where: where as Parameters<typeof db.searchUsageEvent.count>[0]["where"],
			}),
		]);

		return {
			events: events.map((e) => ({
				id: e.id,
				indexId: e.indexId,
				type: e.type,
				count: e.count,
				metadata: e.metadata as Record<string, unknown> | null,
				createdAt: e.createdAt.toISOString(),
			})),
			total,
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
		await requireOrganizationMember(input.organizationId, context.user);

		const event = await db.searchUsageEvent.findFirst({
			where: {
				id: input.eventId,
				organizationId: input.organizationId,
			},
		});

		if (!event) return null;

		return {
			id: event.id,
			indexId: event.indexId,
			type: event.type,
			count: event.count,
			metadata: event.metadata as Record<string, unknown> | null,
			createdAt: event.createdAt.toISOString(),
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
		await requireOrganizationMember(input.organizationId, context.user);

		const indexFilter = input.indexId
			? `AND event.index_id = '${input.indexId}'`
			: "";
		const typeFilter = input.type
			? `AND event.type = '${input.type}'`
			: "";

		type EventsRow = {
			id: string;
			index_id: string;
			type: string;
			count: number;
			metadata: Record<string, unknown> | null;
			created_at: Date;
		};

		const events = await db.$queryRawUnsafe<EventsRow[]>(
			`SELECT
				event.id,
				event.index_id,
				event.type,
				event.count,
				event.metadata,
				event.created_at
			FROM search_usage_event event
			WHERE event.organization_id = $1
			  AND (event.metadata->>'query' = $2 OR event.metadata->>'q' = $2)
			  ${indexFilter}
			  ${typeFilter}
			ORDER BY event.created_at DESC
			LIMIT $3`,
			input.organizationId,
			input.queryText,
			input.limit,
		);

		type CountRow = { total: bigint };
		const [totalRow] = await db.$queryRawUnsafe<CountRow[]>(
			`SELECT COUNT(*)::bigint AS total
			FROM search_usage_event event
			WHERE event.organization_id = $1
			  AND (event.metadata->>'query' = $2 OR event.metadata->>'q' = $2)
			  ${indexFilter}
			  ${typeFilter}`,
			input.organizationId,
			input.queryText,
		);

		return {
			events: events.map((e) => ({
				id: e.id,
				indexId: e.index_id,
				type: e.type,
				count: Number(e.count),
				metadata: e.metadata as Record<string, unknown> | null,
				createdAt: e.created_at.toISOString(),
			})),
			total: Number(totalRow?.total ?? 0),
		};
	});
