import { ORPCError } from "@orpc/client";
import { getTypesenseClient, generateEmbedding, formatVectorQuery } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const hitSchema = z.object({
	document: z.record(z.string(), z.unknown()),
	vectorDistance: z.number().optional(),
});

export const imageSearch = protectedProcedure
	.use(creditGate("image_search", BigInt(300)))
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/image-search",
		tags: ["Search"],
		summary: "Image-to-text / image vector search",
		description:
			"Accepts an image URL or base64, extracts a descriptive caption via OpenAI Vision, then performs vector search against the index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			imageUrl: z.string().url().optional(),
			imageBase64: z.string().optional(),
			field: z.string().default("embedding"),
			k: z.number().int().min(1).max(250).default(10),
			filterBy: z.string().optional(),
			visionModel: z.string().default("gpt-4o-mini"),
			embeddingModel: z.string().default("text-embedding-3-small"),
		}),
	)
	.output(
		z.object({
			found: z.number(),
			hits: z.array(hitSchema),
			searchTimeMs: z.number(),
			caption: z.string(),
			embedding: z.object({
				model: z.string(),
				dimensions: z.number(),
				tokens: z.number(),
			}),
		}),
	)
	.handler(async ({ input, context, ...rest }) => {
		const { creditReservationId } = rest as unknown as CreditGateContext;
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);
		const { creditReservationId } = context as unknown as CreditGateContext;

		try {
			if (!input.imageUrl && !input.imageBase64) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Either imageUrl or imageBase64 is required",
				});
			}

			// Phase 1: Generate a caption using OpenAI Vision (if imageUrl) or use base64 directly
			const startTime = Date.now();
			let caption: string;

			const OpenAI = await import("openai").then((m) => m.default);
			const openai = new OpenAI();

			if (input.imageUrl) {
				const visionResponse = await openai.chat.completions.create({
					model: input.visionModel,
					messages: [
						{
							role: "user",
							content: [
								{
									type: "text",
									text: "Describe this image in detail for search purposes. Focus on objects, colors, style, visible text, and composition.",
								},
								{ type: "image_url", image_url: { url: input.imageUrl } },
							] as any,
						},
					],
					max_tokens: 200,
				});
				caption = visionResponse.choices[0]?.message?.content ?? "";
			} else {
				// If base64, convert to data URL and use vision
				const mimeType = "image/jpeg";
				const dataUri = `data:${mimeType};base64,${input.imageBase64}`;
				const visionResponse = await openai.chat.completions.create({
					model: input.visionModel,
					messages: [
						{
							role: "user",
							content: [
								{
									type: "text",
									text: "Describe this image in detail for search purposes. Focus on objects, colors, style, visible text, and composition.",
								},
								{ type: "image_url", image_url: { url: dataUri } },
							] as any,
						},
					],
					max_tokens: 200,
				});
				caption = visionResponse.choices[0]?.message?.content ?? "";
			}

			if (!caption) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Could not generate a caption from the image.",
				});
			}

			// Phase 2: Generate embedding from the caption
			const embeddingResult = await generateEmbedding(caption, input.embeddingModel);

			// Phase 3: Vector search using the caption embedding
			const vectorQuery = formatVectorQuery(embeddingResult.vector);

			const client = getTypesenseClient();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const results = (await client
				.collections(index.slug)
				.documents()
				.search({
					q: "*",
					vector_query: `${input.field}:(${vectorQuery})`,
					per_page: input.k,
					...(input.filterBy ? { filter_by: input.filterBy } : {}),
				} as any)) as any;

			const searchTimeMs = Date.now() - startTime;

			// Commit flat-fee usage on success
			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "embedding",
				provider: "openai",
				model: input.visionModel,
				flatFeeKopecks: CREDIT_RATES.embedding,
			});

		if (!caption) {
			await releaseCreditReservation(context, creditReservationId);
			return {
				found: results.found ?? 0,
				hits: ((results.hits ?? []) as any[]).map((hit: any) => ({
					document: hit.document as Record<string, unknown>,
					vectorDistance: hit.vector_distance as number | undefined,
				})),
				searchTimeMs,
				caption,
				embedding: {
					model: input.embeddingModel,
					dimensions: embeddingResult.dimensions,
					tokens: embeddingResult.tokens,
				},
			};
		} catch (err) {
			// Release reservation on any error
			await releaseCreditReservation(creditReservationId);
			throw err;
		}

		// Phase 2: embed the caption and vector-search
		let embedding: Awaited<ReturnType<typeof generateEmbedding>>;
		try {
			embedding = await generateEmbedding(caption, input.embeddingModel);
		} catch (err) {
			await releaseCreditReservation(context, creditReservationId);
			throw err;
		}
		const vectorQuery = formatVectorQuery(embedding.vector, input.field, input.k);

		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const results = (await client
			.collections(index.slug)
			.documents()
			.search({
				q: "*",
				vector_query: vectorQuery,
				filter_by: input.filterBy ?? undefined,
				per_page: input.k,
			} as any)) as any;

		await commitFlatFeeUsage(context, creditReservationId, BigInt(300));

		return {
			found: results.found ?? 0,
			hits: ((results.hits ?? []) as any[]).map((hit: any) => ({
				document: hit.document as Record<string, unknown>,
				vectorDistance: hit.vector_distance as number | undefined,
			})),
			searchTimeMs: results.search_time_ms ?? 0,
			caption,
			embedding: {
				model: embedding.model,
				dimensions: embedding.dimensions,
				tokens: embedding.tokens,
			},
		};
	});
