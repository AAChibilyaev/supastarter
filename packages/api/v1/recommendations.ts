/**
 * V1 Recommendations endpoints.
 *
 *   POST /v1/recommendations  — get product recommendations
 */

import { Hono } from "hono";
import { z } from "zod";

import { requireScope } from "./auth";

const recommendationSchema = z.object({
	type: z.enum([
		"also_viewed",
		"frequently_bought_together",
		"personalized",
		"similar",
		"trending",
	]),
	userId: z.string().optional(),
	itemId: z.string().optional(),
	limit: z.number().int().min(1).max(100).optional().default(10),
});

export const recommendationsApp = new Hono().post("/recommendations", async (c) => {
	const gated = await requireScope("admin")(c);
	if (gated instanceof Response) return gated;

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json", message: "Request body must be valid JSON" }, 400);
	}

	const parsed = recommendationSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "invalid_input",
				message: "Invalid request body",
				details: parsed.error.flatten(),
			},
			400,
		);
	}

	const { type, userId, itemId, limit } = parsed.data;

	// Validate that required IDs are present based on type
	if (
		(type === "also_viewed" || type === "frequently_bought_together" || type === "similar") &&
		!itemId
	) {
		return c.json(
			{
				error: "invalid_input",
				message: `itemId is required for recommendation type '${type}'`,
			},
			400,
		);
	}

	if (type === "personalized" && !userId) {
		return c.json(
			{
				error: "invalid_input",
				message: "userId is required for 'personalized' recommendations",
			},
			400,
		);
	}

	// Delegate to the appropriate recommendation strategy
	try {
		const rows = await fetchRecommendations(type, itemId, userId, limit);
		return c.json(rows);
	} catch (error) {
		return c.json(
			{
				error: "recommendation_error",
				message: "Failed to fetch recommendations",
			},
			502,
		);
	}
});

interface Recommendation {
	id: string;
	title: string;
	score: number;
}

async function fetchRecommendations(
	type: string,
	itemId: string | undefined,
	userId: string | undefined,
	limit: number,
): Promise<Recommendation[]> {
	const { query: runQuery } = await import("@repo/recommendations");

	let cypherQuery: string;
	const params: Record<string, unknown> = { limit };

	switch (type) {
		case "also_viewed":
			cypherQuery = `
				MATCH (u:User)-[:VIEWED]->(:Product {id: $itemId})
				MATCH (u)-[:VIEWED]->(av:Product)
				WHERE av.id <> $itemId
				RETURN av.id AS id, av.title AS title, count(*) AS score
				ORDER BY score DESC
				LIMIT $limit
			`;
			params.itemId = itemId;
			break;

		case "frequently_bought_together":
			cypherQuery = `
				MATCH (u:User)-[:PURCHASED]->(:Product {id: $itemId})
				MATCH (u)-[:PURCHASED]->(fbt:Product)
				WHERE fbt.id <> $itemId
				RETURN fbt.id AS id, fbt.title AS title, count(*) AS score
				ORDER BY score DESC
				LIMIT $limit
			`;
			params.itemId = itemId;
			break;

		case "personalized":
			cypherQuery = `
				MATCH (u:User {id: $userId})-[:VIEWED|PURCHASED]->(p:Product)
				MATCH (p)-[:SIMILAR_TO]->(rec:Product)
				WHERE NOT EXISTS {
					MATCH (u)-[:VIEWED|PURCHASED]->(rec)
				}
				RETURN rec.id AS id, rec.title AS title, avg(coalesce(p.score, 1.0)) AS score, count(*) AS reasonCount
				ORDER BY score DESC, reasonCount DESC
				LIMIT $limit
			`;
			params.userId = userId;
			break;

		case "similar":
			cypherQuery = `
				MATCH (p:Product {id: $itemId})-[r:SIMILAR_TO]->(similar:Product)
				WHERE similar.id <> $itemId
				RETURN similar.id AS id, similar.title AS title, r.score AS score
				ORDER BY r.score DESC
				LIMIT $limit
			`;
			params.itemId = itemId;
			break;

		case "trending":
			cypherQuery = `
				MATCH (u:User)-[r:VIEWED|PURCHASED]->(p:Product)
				WHERE r.timestamp >= datetime() - duration("P7D")
				RETURN p.id AS id, p.title AS title, count(*) AS score
				ORDER BY score DESC
				LIMIT $limit
			`;
			break;

		default:
			throw new Error(`Unknown recommendation type: ${type}`);
	}

	const result = await runQuery(cypherQuery, params);
	return result.records.map((r) => ({
		id: r.get("id") as string,
		title: r.get("title") as string,
		score: Number(r.get("score")),
	}));
}
