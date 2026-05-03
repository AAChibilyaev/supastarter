import { ORPCError } from "@orpc/client";
import {
	createIngestionJob,
	getKnowledgeSpaceBySlug,
	listDataSources,
	replaceKnowledgeChunks,
	updateIngestionJob,
	upsertKnowledgeDocument,
} from "@repo/database";
import { processUrl } from "@repo/document-processor";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireKnowledgeOwnerAdmin } from "../lib/access";
import { chunkText, type ChunkStrategy } from "../lib/chunking";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

async function checksum(text: string): Promise<string> {
	const crypto = await import("node:crypto");
	return crypto.createHash("sha256").update(text).digest("hex");
}

const chunkStrategySchema = z.enum(["fixed", "semantic", "markdown", "code"]).optional();

export const ingestUrl = protectedProcedure
	.use(creditGate("chat", CREDIT_RATES.chat))
	.route({
		method: "POST",
		path: "/knowledge/ingest/url",
		tags: ["Knowledge"],
		summary: "Ingest content from a URL — fetches HTML, extracts text, chunks, and indexes",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
			url: z.string().url().min(1),
			language: z.string().max(12).optional(),
			chunkStrategy: chunkStrategySchema,
		}),
	)
	.handler(async ({ input, context: { ...rest } }) => {
		const user = (rest as Record<string, unknown>).user as { id: string };
		const { creditReservationId } = rest as unknown as CreditGateContext;

		try {
			await requireKnowledgeOwnerAdmin(
				{
					ownerType: input.ownerType,
					ownerId: input.ownerId,
				},
				user,
			);

			const scope = {
				ownerType: input.ownerType,
				organizationId: input.ownerType === "ORGANIZATION" ? input.ownerId : undefined,
				userId: input.ownerType === "USER" ? input.ownerId : undefined,
			};
			const space = await getKnowledgeSpaceBySlug(scope, input.spaceSlug);
			if (!space) {
				throw new ORPCError("NOT_FOUND", { message: "Knowledge space not found" });
			}

			// Check for HTTP_SITEMAP data source
			const existingSources = await listDataSources(space.id);
			const webSource = existingSources.find((s) => s.sourceType === "HTTP_SITEMAP");

			// Fetch and parse URL via document-processor (already includes chunking)
			const result = await processUrl({ url: input.url });
			if (!result.document.content) {
				throw new ORPCError("BAD_REQUEST", { message: "No content extracted from URL" });
			}

			// Apply knowledge chunking with selected strategy
			const chunkOptions = input.chunkStrategy
				? { strategy: input.chunkStrategy as ChunkStrategy }
				: undefined;
			const chunks = chunkText(result.document.content, chunkOptions);
			if (chunks.length === 0) {
				throw new ORPCError("BAD_REQUEST", { message: "No content extracted from URL" });
			}

			// Create ingestion job
			const job = await createIngestionJob({
				knowledgeSpaceId: space.id,
				dataSourceId: webSource?.id,
				mode: "url_fetch",
				inputMeta: {
					url: input.url,
					chunkStrategy: input.chunkStrategy ?? "fixed",
				},
			});

			await updateIngestionJob(job.id, {
				status: "RUNNING",
				startedAt: new Date(),
				totalItems: chunks.length,
			});

			// Upsert document
			const digest = await checksum(result.document.content);
			const document = await upsertKnowledgeDocument({
				knowledgeSpaceId: space.id,
				dataSourceId: webSource?.id,
				externalId: `url:${input.url}:${digest.slice(0, 12)}`,
				sourceType: "HTTP_SITEMAP",
				title: result.document.title,
				mimeType: result.document.mimeType,
				language: input.language,
				contentText: result.document.content,
				metadata: {
					...result.document.metadata,
					sourceUrl: input.url,
					chunkStrategy: input.chunkStrategy ?? "fixed",
				},
				checksum: digest,
			});

			// Store chunks
			await replaceKnowledgeChunks({
				knowledgeSpaceId: space.id,
				documentId: document.id,
				chunks: chunks.map((chunk) => ({
					chunkIndex: chunk.chunkIndex,
					text: chunk.text,
					tokenCount: chunk.tokenCount,
					embedding: chunk.embedding,
					metadata: {
						from: "url-fetch",
						sourceUrl: input.url,
						chunkStrategy: input.chunkStrategy ?? "fixed",
					},
				})),
			});

			// Build graph
			const savedChunks = chunks.map((chunk) => ({
				id: `${document.id}:${chunk.chunkIndex}`,
				text: chunk.text,
			}));

			const { buildGraphFromChunks } = await import("../lib/graphrag");
			await buildGraphFromChunks({
				knowledgeSpaceId: space.id,
				chunks: savedChunks,
			});

			await updateIngestionJob(job.id, {
				status: "SUCCEEDED",
				totalItems: chunks.length,
				processedItems: chunks.length,
				finishedAt: new Date(),
			});

			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "chat",
				provider: "aacsearch",
				model: "graphrag",
				flatFeeKopecks: CREDIT_RATES.chat,
			});

			return {
				status: "ok",
				jobId: job.id,
				documentId: document.id,
				chunks: chunks.length,
				chunkStrategy: input.chunkStrategy ?? "fixed",
				sourceUrl: input.url,
			};
		} catch (err) {
			await releaseCreditReservation(creditReservationId);
			throw err;
		}
	});
