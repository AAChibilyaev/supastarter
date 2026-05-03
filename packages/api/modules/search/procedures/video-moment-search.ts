import { ORPCError } from "@orpc/client";
import { getTypesenseClient, generateEmbedding, formatVectorQuery } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const videoMomentHitSchema = z.object({
	document: z.record(z.string(), z.unknown()),
	vectorDistance: z.number().optional(),
	/** Timecode when this moment occurs in the video (e.g. "1:23") */
	timecode: z.string().optional(),
	/** Start time in seconds */
	startTime: z.number().optional(),
	/** End time in seconds */
	endTime: z.number().optional(),
});

export const videoMomentSearch = protectedProcedure
	.use(creditGate("video_search", CREDIT_RATES.video_search))
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/video-moment-search",
		tags: ["Search"],
		summary: "Video moment search — search within video transcripts with timecode results",
		description:
			"Searches across indexed video moment chunks. Accepts a text query, generates an embedding, " +
			"and returns matching moments with timecode information (e.g. 'result at 2:34'). " +
			"Video moments are created during ingestion when a video file is processed with scene detection.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(1).max(1000),
			field: z.string().default("embedding"),
			k: z.number().int().min(1).max(250).default(10),
			filterBy: z.string().optional(),
			embeddingModel: z.string().default("text-embedding-3-small"),
		}),
	)
	.output(
		z.object({
			found: z.number(),
			hits: z.array(videoMomentHitSchema),
			searchTimeMs: z.number(),
			embedding: z.object({
				model: z.string(),
				dimensions: z.number(),
				tokens: z.number(),
			}),
		}),
	)
	.handler(async ({ input, context }) => {
		const { creditReservationId } = context as unknown as CreditGateContext;
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		try {
			const startTime = Date.now();

			// Phase 1: Generate embedding from the search query
			const embeddingResult = await generateEmbedding(input.query, input.embeddingModel);

			// Phase 2: Vector search using the query embedding
			const vectorQuery = formatVectorQuery(embeddingResult.vector);

			const client = getTypesenseClient();
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
				operation: "video_search",
				provider: "openai",
				model: input.embeddingModel,
				flatFeeKopecks: CREDIT_RATES.video_search,
			});

			return {
				found: results.found ?? 0,
				hits: ((results.hits ?? []) as any[]).map((hit: any) => {
					const doc = hit.document as Record<string, unknown>;
					return {
						document: doc,
						vectorDistance: hit.vector_distance as number | undefined,
						timecode: doc.videoTimecode as string | undefined,
						startTime: doc.videoStartTime as number | undefined,
						endTime: doc.videoEndTime as number | undefined,
					};
				}),
				searchTimeMs,
				embedding: {
					model: input.embeddingModel,
					dimensions: embeddingResult.dimensions,
					tokens: embeddingResult.tokens,
				},
			};
		} catch (err) {
			await releaseCreditReservation(creditReservationId);
			throw err;
		}
	});
