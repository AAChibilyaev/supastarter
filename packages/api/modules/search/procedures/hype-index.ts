import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/client";
import { Prisma, enqueueManySearchIngest, getSearchIndexBySlug } from "@repo/database";
import { logger } from "@repo/logs";
import { generateEmbeddings } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireOrganizationMember } from "../lib/access";
import { buildHyPEInput, generateHypotheticalQuestions } from "../lib/hype-questions";
import { searchIndexSlugSchema } from "../types";

/**
 * HyPE (Hypothetical Prompt Embeddings) indexer.
 *
 * Generates dense vector embeddings for document content using the HyPE
 * strategy: for each document, hypothetical search queries are generated
 * via LLM and combined with the original content for embedding. This
 * yields ~3.4x retrieval accuracy improvement by bridging the vocabulary
 * gap between user queries and document content.
 *
 * Documents are enqueued for bulk indexing into the search collection.
 */
export const hypeIndex = protectedProcedure
	.use(creditGate("hype_index", CREDIT_RATES.hype_index))
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/hype-index",
		tags: ["Search"],
		summary: "HyPE Index documents for hyper-personalized search",
		description:
			"Generates dense vector embeddings for document content using the HyPE strategy. " +
			"When generateQuestions is enabled (default), hypothetical search queries are generated " +
			"via LLM for each document and combined with the original content for embedding. " +
			"This yields ~3.4x retrieval accuracy improvement. " +
			"Charges 3 credits (300 kopecks) per document. Supports batch indexing for " +
			"hyper-personalized vector search.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			documents: z
				.array(
					z.object({
						id: z.string().optional(),
						title: z.string(),
						description: z.string(),
						content: z.string(),
						metadata: z.record(z.string(), z.unknown()).optional(),
					}),
				)
				.min(1)
				.max(100)
				.describe("Documents to index (1–100 per call)"),
			embeddingModel: z.string().optional(),
			/**
			 * Enable HyPE hypothetical question generation.
			 * When true (default), the LLM generates search-like questions
			 * that are combined with the original content for richer embeddings.
			 */
			generateQuestions: z.boolean().default(true),
			/**
			 * Number of hypothetical questions to generate per document.
			 * Only used when generateQuestions is true. Default: 5.
			 */
			questionsCount: z.number().int().min(1).max(10).default(5),
		}),
	)
	.output(
		z.object({
			indexed: z.number(),
			errors: z.number(),
			errorDetails: z.array(z.string()).optional(),
			/** Number of documents where HyPE questions were generated */
			hypeEnhanced: z.number().optional(),
		}),
	)
	.handler(async ({ input, context: { ...rest } }) => {
		const user = (rest as Record<string, unknown>).user as { id: string };
		const { creditReservationId } = rest as unknown as CreditGateContext;

		// Verify org membership
		await requireOrganizationMember(input.organizationId, user.id);

		// Verify the search index exists
		const searchIndex = await getSearchIndexBySlug(input.organizationId, input.slug);
		if (!searchIndex) {
			throw new ORPCError("NOT_FOUND", { message: "Search index not found" });
		}

		let indexed = 0;
		let errors = 0;
		let hypeEnhanced = 0;
		const errorDetails: string[] = [];

		try {
			// Process each document — generate embeddings and enqueue for indexing
			for (const doc of input.documents) {
				try {
					const rawText = `${doc.title}\n${doc.description}\n${doc.content}`.slice(
						0,
						8000,
					);

					let embeddingInput = rawText;
					let generatedQuestions: string[] = [];

					// Phase 1: Generate hypothetical questions (HyPE enhancement)
					if (input.generateQuestions) {
						generatedQuestions = await generateHypotheticalQuestions(
							rawText,
							input.questionsCount,
						);
						if (generatedQuestions.length > 0) {
							embeddingInput = buildHyPEInput(rawText, generatedQuestions);
							hypeEnhanced++;
						}
					}

					// Phase 2: Generate embedding from (enhanced) text
					const result = await generateEmbeddings(
						[embeddingInput],
						input.embeddingModel ?? "text-embedding-3-small",
					);

					const docId = doc.id ?? randomUUID();

					// Phase 3: Enqueue for indexing, storing questions in metadata
					await enqueueManySearchIngest(searchIndex.id, input.organizationId, "upsert", [
						{
							id: docId,
							title: doc.title,
							description: doc.description,
							content: doc.content.slice(0, 100_000),
							embedding: result[0]?.vector ?? [],
							...(doc.metadata ?? {}),
							...(generatedQuestions.length > 0
								? { hypeQuestions: generatedQuestions }
								: {}),
						},
					] as Prisma.InputJsonValue[]);

					indexed++;
				} catch (docError) {
					errors++;
					errorDetails.push(
						`Document "${doc.title.slice(0, 50)}": ${(docError as Error).message}`,
					);
					logger.error(
						{ error: docError, title: doc.title },
						"hypeIndex: document failed",
					);
				}
			}

			// Commit flat-fee usage on success
			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "hype_index",
				provider: "aacsearch",
				model: "hype",
				flatFeeKopecks: CREDIT_RATES.hype_index,
			});

			logger.info(
				{
					indexed,
					errors,
					hypeEnhanced,
					slug: input.slug,
				},
				"hypeIndex: done",
			);

			return {
				indexed,
				errors,
				errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
				hypeEnhanced: hypeEnhanced > 0 ? hypeEnhanced : undefined,
			};
		} catch (err) {
			await releaseCreditReservation(creditReservationId);
			throw err;
		}
	});
