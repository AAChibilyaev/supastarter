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
import { searchIndexSlugSchema } from "../types";

/**
 * HyPE (HyperPersonalized Embedding) indexer.
 *
 * Generates dense vector embeddings for document content and enqueues them
 * for bulk indexing into the search collection. Each batch of documents is
 * processed and stored as vector-searchable entries.
 */
export const hypeIndex = protectedProcedure
	.use(creditGate("hype_index", CREDIT_RATES.hype_index))
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/hype-index",
		tags: ["Search"],
		summary: "HyPE Index documents for hyper-personalized search",
		description:
			"Generates dense vector embeddings for document content and enqueues them for indexing. " +
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
		}),
	)
	.output(
		z.object({
			indexed: z.number(),
			errors: z.number(),
			errorDetails: z.array(z.string()).optional(),
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
		const errorDetails: string[] = [];

		try {
			// Process each document — generate embeddings and enqueue for indexing
			for (const doc of input.documents) {
				try {
					const embeddingText = `${doc.title}\n${doc.description}\n${doc.content}`.slice(
						0,
						8000,
					);
					const result = await generateEmbeddings(
						[embeddingText],
						input.embeddingModel ?? "text-embedding-3-small",
					);

					const docId = doc.id ?? randomUUID();

					await enqueueManySearchIngest(searchIndex.id, input.organizationId, "upsert", [
						{
							id: docId,
							title: doc.title,
							description: doc.description,
							content: doc.content.slice(0, 100_000),
							embedding: result[0]?.vector ?? [],
							...(doc.metadata ?? {}),
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

			logger.info(`hypeIndex: ${indexed} indexed, ${errors} errors for ${input.slug}`);

			return {
				indexed,
				errors,
				errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
			};
		} catch (err) {
			await releaseCreditReservation(creditReservationId);
			throw err;
		}
	});
