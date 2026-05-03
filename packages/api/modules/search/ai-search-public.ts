/**
 * Public AI Search endpoint for anonymous widget users.
 *
 * Auth: Bearer ss_search_* API key (same as public search)
 * Rate limiting: uses existing SearchRateLimitBucket
 *
 * Endpoints:
 *   POST /api/search/ai/answer  — zero-click AI answer above search results
 *   POST /api/search/ai/image   — image-to-vector search (GPT-4o-mini vision → embedding → Typesense)
 */

import { logger } from "@repo/logs";
import { getTypesenseClient, generateEmbedding, formatVectorQuery } from "@repo/search";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { quotaCheck } from "../entitlements/middleware/quota-check";
import { gatePublicSearchRequest } from "./lib/public-auth";

export const aiSearchPublicApp = new Hono()
	.use(
		"*",
		cors({
			origin: "*",
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["POST", "OPTIONS"],
			maxAge: 86400,
		}),
	)

	/**
	 * Zero-click AI Answer
	 * Body: { query, indexSlug, queryBy?, filterBy?, perPage? }
	 * Returns: { answer, sources: [{id, title, url}], found, searchTimeMs }
	 */
	.post("/search/ai/answer", async (c) => {
		const authResult = await gatePublicSearchRequest(c);
		if (authResult instanceof Response) return authResult;

		const organizationId = authResult.verified.organizationId;

		const quotaAllowed = await quotaCheck(c, organizationId, "search").catch(() => true);
		if (!quotaAllowed) {
			return c.json({ error: "quota_exceeded" }, 402);
		}

		const body = await c.req.json().catch(() => null);
		if (!body || typeof body.query !== "string" || !body.query.trim()) {
			return c.json({ error: "query required" }, 400);
		}

		const query: string = body.query.slice(0, 2000);
		const indexSlug: string = body.indexSlug ?? "products";
		const queryBy: string = body.queryBy ?? "title,description";
		const filterBy: string | undefined =
			typeof body.filterBy === "string" ? body.filterBy : undefined;
		const perPage: number = Math.min(Math.max(Number(body.perPage ?? 5), 1), 20);

		const client = getTypesenseClient();
		const searchStart = Date.now();

		try {
			const searchParams: Record<string, unknown> = {
				q: query,
				query_by: queryBy,
				per_page: perPage,
			};
			if (filterBy) searchParams.filter_by = filterBy;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const results = (await client
				.collections(indexSlug)
				.documents()
				.search(searchParams as any)) as any;
			const searchTimeMs = Date.now() - searchStart;

			const hits: any[] = results.hits ?? [];
			const sources = hits.map((hit: any) => ({
				id: hit.document?.id,
				title: hit.document?.title ?? hit.document?.name,
				url: hit.document?.url ?? hit.document?.product_url,
				imageUrl: hit.document?.image_url ?? hit.document?.imageUrl,
				price: hit.document?.price,
			}));

			// Build context for LLM — keep compact for fast inference
			const contextChunks = hits.slice(0, 5).map((hit: any, i: number) => {
				const d = hit.document as Record<string, unknown>;
				return `[${i + 1}] ${d.title ?? d.name ?? ""}: ${String(d.description ?? "").slice(0, 300)}`;
			});

			let answer = "";
			try {
				const OpenAI = await import("openai").then((m) => m.default);
				const openai = new OpenAI();
				const completion = await openai.chat.completions.create({
					model: "gpt-4o-mini",
					messages: [
						{
							role: "system",
							content:
								"You are a helpful product search assistant. Based on the provided product context, give a concise, helpful answer to the user's question in 1-3 sentences. If the context doesn't have enough information, say so briefly.",
						},
						{
							role: "user",
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							content:
								`Context:\n${contextChunks.join("\n")}\n\nQuestion: ${query}` as any,
						},
					],
					max_tokens: 300,
					temperature: 0.3,
				});
				answer = completion.choices[0]?.message?.content ?? "";
			} catch (llmErr) {
				logger.warn(
					{ llmErr, query, organizationId },
					"ai-search-public: LLM answer failed",
				);
			}

			return c.json({ answer, sources, found: results.found ?? 0, searchTimeMs });
		} catch (err) {
			logger.warn(
				{ err, query, indexSlug, organizationId },
				"ai-search-public: answer failed",
			);
			return c.json({ error: "search_failed" }, 500);
		}
	})

	/**
	 * Image Search
	 * Body: { imageUrl?, imageBase64?, indexSlug, field?, k?, filterBy? }
	 * Returns: { caption, hits: [{id, title, imageUrl, price, url, vectorDistance}], found, searchTimeMs }
	 */
	.post("/search/ai/image", async (c) => {
		const authResult = await gatePublicSearchRequest(c);
		if (authResult instanceof Response) return authResult;

		const organizationId = authResult.verified.organizationId;

		const quotaAllowed = await quotaCheck(c, organizationId, "search").catch(() => true);
		if (!quotaAllowed) {
			return c.json({ error: "quota_exceeded" }, 402);
		}

		const body = await c.req.json().catch(() => null);
		if (!body) return c.json({ error: "body required" }, 400);

		const {
			imageUrl,
			imageBase64,
			indexSlug = "products",
			field = "embedding",
			filterBy,
		} = body;

		if (!imageUrl && !imageBase64) {
			return c.json({ error: "imageUrl or imageBase64 required" }, 400);
		}

		const k: number = Math.min(Math.max(Number(body.k ?? 10), 1), 50);
		const searchStart = Date.now();

		try {
			// Phase 1: Generate a search-optimised caption via GPT-4o-mini vision
			const OpenAI = await import("openai").then((m) => m.default);
			const openai = new OpenAI();

			const imgSrc: string = imageUrl ?? `data:image/jpeg;base64,${imageBase64}`;

			const visionResponse = await openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [
					{
						role: "user",
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						content: [
							{
								type: "text",
								text: "Describe this product image for search purposes. Focus on product type, style, color, material, and visible details. Be concise.",
							},
							{ type: "image_url", image_url: { url: imgSrc } },
						] as any,
					},
				],
				max_tokens: 150,
			});

			const caption = visionResponse.choices[0]?.message?.content ?? "";
			if (!caption) {
				return c.json({ error: "could_not_describe_image" }, 422);
			}

			// Phase 2: Embed the caption
			const embeddingResult = await generateEmbedding(caption);
			const vectorQuery = formatVectorQuery(embeddingResult.vector, field, k);

			// Phase 3: Vector search in Typesense
			const client = getTypesenseClient();
			const searchParams: Record<string, unknown> = {
				q: "*",
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				vector_query: vectorQuery as any,
				per_page: k,
			};
			if (typeof filterBy === "string") searchParams.filter_by = filterBy;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const results = (await client
				.collections(indexSlug)
				.documents()
				.search(searchParams as any)) as any;
			const searchTimeMs = Date.now() - searchStart;

			const hits: any[] = results.hits ?? [];
			return c.json({
				caption,
				hits: hits.map((hit: any) => ({
					id: hit.document?.id,
					title: hit.document?.title ?? hit.document?.name,
					imageUrl: hit.document?.image_url ?? hit.document?.imageUrl,
					price: hit.document?.price,
					brand: hit.document?.brand,
					url: hit.document?.url ?? hit.document?.product_url,
					vectorDistance: hit.vector_distance,
				})),
				found: results.found ?? 0,
				searchTimeMs,
			});
		} catch (err) {
			logger.warn(
				{ err, indexSlug, organizationId },
				"ai-search-public: image search failed",
			);
			return c.json({ error: "image_search_failed" }, 500);
		}
	});
