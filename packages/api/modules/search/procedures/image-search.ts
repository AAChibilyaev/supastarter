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
	.use(creditGate("embedding", BigInt(200)))
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
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);
		const { creditReservationId } = context as unknown as CreditGateContext;

		// Phase 1: describe the image via OpenAI Vision
		const imageUrl = input.imageUrl
			? input.imageUrl
			: `data:image/jpeg;base64,${input.imageBase64}`;

		let caption = "";
		try {
			const OpenAI = await import("openai").then((m) => m.default);
			const openai = new OpenAI();
			const visionResponse = await openai.chat.completions.create({
				model: input.visionModel,
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: "Describe this image in detail, as if for a search query. Focus on objects, people, colors, actions, and setting.",
							},
							{
								type: "image_url",
								image_url: { url: imageUrl },
							},
						],
					},
				],
				max_tokens: 300,
			});
			caption = visionResponse.choices[0]?.message?.content ?? "";
		} catch {
			caption = "Image description unavailable.";
		}

		if (!caption) {
			// Release reservation — no work was done
			await releaseCreditReservation(creditReservationId, "cancelled");
			return {
				found: 0,
				hits: [],
				searchTimeMs: 0,
				caption: "",
				embedding: { model: input.embeddingModel, dimensions: 0, tokens: 0 },
			};
		}

		// Phase 2: embed the caption and vector-search
		let embedding;
		try {
			embedding = await generateEmbedding(caption, input.embeddingModel);
		} catch {
			await releaseCreditReservation(creditReservationId, "error");
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to generate image embedding.",
			});
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

		// Commit flat-fee usage on success
		await commitFlatFeeUsage({
			reservationId: creditReservationId,
			operation: "embedding",
			provider: "aacsearch",
			model: "image",
			flatFeeKopecks: BigInt(200),
		});

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
