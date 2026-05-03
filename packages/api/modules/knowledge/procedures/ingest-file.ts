import { ORPCError } from "@orpc/client";
import {
	createIngestionJob,
	getKnowledgeSpaceBySlug,
	listDataSources,
	replaceKnowledgeChunks,
	updateIngestionJob,
	upsertKnowledgeDocument,
} from "@repo/database";
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
import { chunkText } from "../lib/chunking";
import { buildGraphFromChunks } from "../lib/graphrag";
import { parseIncomingFile } from "../lib/parsers";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

function inferFileSourceType(
	fileName: string,
	mimeType: string,
): "FILE_MD" | "FILE_XML" | "FILE_PDF" {
	const lower = fileName.toLowerCase();
	if (mimeType.includes("markdown") || lower.endsWith(".md")) return "FILE_MD";
	if (mimeType.includes("xml") || lower.endsWith(".xml")) return "FILE_XML";
	return "FILE_PDF";
}

async function checksum(text: string): Promise<string> {
	const crypto = await import("node:crypto");
	return crypto.createHash("sha256").update(text).digest("hex");
}

export const ingestFile = protectedProcedure
	.use(creditGate("chat", CREDIT_RATES.chat))
	.route({
		method: "POST",
		path: "/knowledge/ingest/file",
		tags: ["Knowledge"],
		summary: "Ingest md/xml/pdf file",
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

			const parsed = await parseIncomingFile({
				fileName: input.fileName,
				mimeType: input.mimeType,
				contentBase64: input.contentBase64,
			});
			const chunks = chunkText(parsed.text);
			if (chunks.length === 0) {
				throw new ORPCError("BAD_REQUEST", { message: "No text extracted from file" });
			}

			const existingSources = await listDataSources(space.id);
			const fileSource = existingSources.find((source) =>
				source.sourceType.startsWith("FILE_"),
			);

			const job = await createIngestionJob({
				knowledgeSpaceId: space.id,
				dataSourceId: fileSource?.id,
				mode: "file_upload",
				inputMeta: {
					fileName: input.fileName,
					mimeType: input.mimeType,
				},
			});

			await updateIngestionJob(job.id, { status: "RUNNING", startedAt: new Date() });

			const digest = await checksum(parsed.text);
			const document = await upsertKnowledgeDocument({
				knowledgeSpaceId: space.id,
				dataSourceId: fileSource?.id,
				externalId: `file:${input.fileName}`,
				sourceType: inferFileSourceType(input.fileName, input.mimeType),
				title: parsed.title,
				mimeType: parsed.mimeType,
				language: input.language,
				contentText: parsed.text,
				metadata: {
					...parsed.metadata,
					fileName: input.fileName,
				},
				checksum: digest,
			});

			await replaceKnowledgeChunks({
				knowledgeSpaceId: space.id,
				documentId: document.id,
				chunks: chunks.map((chunk) => ({
					chunkIndex: chunk.chunkIndex,
					text: chunk.text,
					tokenCount: chunk.tokenCount,
					embedding: chunk.embedding,
					metadata: { from: "file-upload" },
				})),
			});

			const savedChunks = chunks.map((chunk) => ({
				id: `${document.id}:${chunk.chunkIndex}`,
				text: chunk.text,
			}));
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

			// Commit flat-fee usage on successful ingestion with GraphRAG extraction
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
			};
		} catch (err) {
			// Release reservation on any error
			await releaseCreditReservation(creditReservationId);
			throw err;
		}
	});
