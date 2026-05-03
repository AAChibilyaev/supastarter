import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/client";
import { reserveAiCredits } from "@repo/billing-wallet";
import {
	createIngestionJob,
	getAiWalletByEntity,
	getKnowledgeSpaceBySlug,
	listDataSources,
	replaceKnowledgeChunks,
	updateIngestionJob,
	upsertKnowledgeDocument,
} from "@repo/database";
import { detectFileType } from "@repo/document-processor";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	commitFlatFeeUsage,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireKnowledgeOwnerAdmin } from "../lib/access";
import { chunkText, type ChunkStrategy } from "../lib/chunking";
import { parseIncomingFile } from "../lib/parsers";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

/**
 * Map file type to KnowledgeSourceType enum value.
 */
function inferFileSourceType(fileName: string, mimeType: string): string {
	const ft = detectFileType(fileName, mimeType);
	switch (ft) {
		case "pdf":
			return "FILE_PDF";
		case "docx":
			return "FILE_DOCX";
		case "xlsx":
			return "FILE_XLSX";
		case "pptx":
			return "FILE_PPTX";
		case "epub":
			return "FILE_EPUB";
		case "image":
			return "FILE_IMG";
		case "audio":
			return "FILE_AUDIO";
		case "video":
			return "FILE_VIDEO";
		case "csv":
			return "FILE_CSV";
		case "json":
			return "FILE_JSON";
		case "md":
			return "FILE_MD";
		case "txt":
			return "FILE_TXT";
		default:
			return "FILE_TXT";
	}
}

async function checksum(text: string): Promise<string> {
	const crypto = await import("node:crypto");
	return crypto.createHash("sha256").update(text).digest("hex");
}

const chunkStrategySchema = z.enum(["fixed", "semantic", "markdown", "code"]).optional();

/**
 * Map file type to the appropriate credit operation for billing.
 */
function getCreditOperation(fileType: string | null): string {
	switch (fileType) {
		case "image":
			return "embedding";
		case "audio":
		case "video":
			return "audio_transcription";
		default:
			return "chat";
	}
}

/**
 * Compute the credit cost for a file based on its type and metadata.
 * - image: flat rate (embedding = 200 kopecks)
 * - audio: per-minute rate (audio_transcription = 500 kopecks/min, rounded up)
 * - video: per-minute rate (audio_transcription = 500 kopecks/min, since video goes through audio transcription)
 * - documents: flat chat rate (500 kopecks)
 */
function computeCreditCost(fileType: string | null, metadata: Record<string, unknown>): bigint {
	switch (fileType) {
		case "image":
			return CREDIT_RATES.embedding;
		case "audio":
		case "video": {
			const durationSeconds = (metadata.durationSeconds as number) ?? 0;
			const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
			return CREDIT_RATES.audio_transcription * BigInt(minutes);
		}
		default:
			return CREDIT_RATES.chat;
	}
}

export const ingestFile = protectedProcedure
	.route({
		method: "POST",
		path: "/knowledge/ingest/file",
		tags: ["Knowledge"],
		summary:
			"Ingest a document file — supports pdf, docx, xlsx, pptx, epub, csv, json, md, txt, image, audio, video",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
			fileName: z.string().min(1),
			mimeType: z.string().min(3),
			contentBase64: z.string().min(1),
			language: z.string().max(12).optional(),
			chunkStrategy: chunkStrategySchema,
			hypeEnabled: z.boolean().optional().default(false),
		}),
	)
	.handler(async ({ input, context: { ...rest } }) => {
		const user = (rest as Record<string, unknown>).user as { id: string };
		const session = (rest as Record<string, unknown>).session as
			| { activeOrganizationId?: string; userId: string }
			| undefined;

		// Declare reservation outside try for catch-block access
		let creditReservationId: string | null = null;

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

			// Stage 1: Parse the file
			const parsed = await parseIncomingFile({
				fileName: input.fileName,
				mimeType: input.mimeType,
				contentBase64: input.contentBase64,
			});

			// Determine the file type for credit computation
			const fileType = detectFileType(input.fileName, input.mimeType);

			// Compute credit operation and cost based on file type
			const creditOp = getCreditOperation(fileType);
			const creditCost = computeCreditCost(fileType, parsed.metadata);

			// Resolve wallet and reserve credits
			const orgId = session?.activeOrganizationId;
			const walletUserId = session?.userId;
			const wallet = await getAiWalletByEntity(
				orgId ? { organizationId: orgId } : { userId: walletUserId! },
			);
			if (!wallet) {
				throw new ORPCError("FAILED_PRECONDITION", {
					message: "AI Wallet not initialized. Visit Settings > Billing to activate.",
				});
			}

			const idempotencyKey = `credit-gate:${creditOp}:${wallet.id}:${randomUUID()}`;
			const reservation = await reserveAiCredits({
				walletId: wallet.id,
				userId: walletUserId ?? null,
				organizationId: orgId ?? null,
				operation: creditOp,
				estimatedKopecks: creditCost,
				idempotencyKey,
			});
			creditReservationId = reservation.reservationId;

			// Stage 2: Chunk with selected strategy
			const chunkOptions = input.chunkStrategy
				? { strategy: input.chunkStrategy as ChunkStrategy }
				: undefined;
			const chunks = chunkText(parsed.text, chunkOptions);
			if (chunks.length === 0) {
				throw new ORPCError("BAD_REQUEST", { message: "No text extracted from file" });
			}

			// HyPE: Generate hypothetical questions for each chunk (if enabled)
			const { generateHypotheticalQuestions } = await import("../lib/hype");
			const hypeResults = input.hypeEnabled
				? await Promise.all(
						chunks.map((chunk) =>
							generateHypotheticalQuestions(chunk.text, 3).catch(() => null),
						),
					)
				: null;

			const existingSources = await listDataSources(space.id);
			const fileSource = existingSources.find((source) =>
				source.sourceType.startsWith("FILE_"),
			);

			// Stage 3: Create ingestion job
			const job = await createIngestionJob({
				knowledgeSpaceId: space.id,
				dataSourceId: fileSource?.id,
				mode: "file_upload",
				inputMeta: {
					fileName: input.fileName,
					mimeType: input.mimeType,
					chunkStrategy: input.chunkStrategy ?? "fixed",
				},
			});

			await updateIngestionJob(job.id, {
				status: "RUNNING",
				startedAt: new Date(),
				totalItems: chunks.length,
			});

			// Stage 4: Upsert document + chunks
			const digest = await checksum(parsed.text);
			const document = await upsertKnowledgeDocument({
				knowledgeSpaceId: space.id,
				dataSourceId: fileSource?.id,
				externalId: `file:${input.fileName}:${digest.slice(0, 12)}`,
				sourceType: inferFileSourceType(input.fileName, input.mimeType) as any,
				title: parsed.title,
				mimeType: parsed.mimeType,
				language: input.language,
				contentText: parsed.text,
				metadata: {
					...parsed.metadata,
					fileName: input.fileName,
					chunkStrategy: input.chunkStrategy ?? "fixed",
					originalFormat: inferFileSourceType(input.fileName, input.mimeType),
				},
				checksum: digest,
			});

			logger.info(
				{
					jobId: job.id,
					documentId: document.id,
					chunks: chunks.length,
					strategy: input.chunkStrategy ?? "fixed",
				},
				"Ingested file and generating embeddings",
			);

			// Stage 5: Store chunks with local embeddings
			await replaceKnowledgeChunks({
				knowledgeSpaceId: space.id,
				documentId: document.id,
				chunks: chunks.map((chunk) => ({
					chunkIndex: chunk.chunkIndex,
					text: chunk.text,
					tokenCount: chunk.tokenCount,
					embedding: chunk.embedding,
					metadata: {
						from: "file-upload",
						chunkStrategy: input.chunkStrategy ?? "fixed",
						...(hypeResults?.[chunk.chunkIndex]
							? { hypotheticalQuestions: hypeResults[chunk.chunkIndex] }
							: {}),
					},
				})),
			});

			// Stage 6: Build graph from chunks
			const savedChunks = chunks.map((chunk) => ({
				id: `${document.id}:${chunk.chunkIndex}`,
				text: chunk.text,
			}));

			// Import graph builder dynamically (it's in the knowledge module)
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

			// Commit per-file-type usage on successful ingestion
			await commitFlatFeeUsage({
				reservationId: creditReservationId!,
				operation: creditOp,
				provider: "aacsearch",
				model: creditOp === "embedding" ? "multimodal-image" : "graphrag",
				flatFeeKopecks: creditCost,
			});

			return {
				status: "ok",
				jobId: job.id,
				documentId: document.id,
				chunks: chunks.length,
				chunkStrategy: input.chunkStrategy ?? "fixed",
			};
		} catch (err) {
			if (creditReservationId) {
				await releaseCreditReservation(creditReservationId);
			}
			throw err;
		}
	});
