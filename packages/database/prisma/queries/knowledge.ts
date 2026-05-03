import { db } from "../client";
import type { KnowledgeOwnerType, KnowledgeSourceType, Prisma } from "../generated/client";
import { Prisma as PrismaClient } from "../generated/client";

export interface KnowledgeOwnerScope {
	ownerType: KnowledgeOwnerType;
	userId?: string;
	organizationId?: string;
}

function toSpaceWhere(scope: KnowledgeOwnerScope): Prisma.KnowledgeSpaceWhereInput {
	if (scope.ownerType === "USER") {
		return {
			ownerType: "USER",
			userId: scope.userId,
		};
	}

	return {
		ownerType: "ORGANIZATION",
		organizationId: scope.organizationId,
	};
}

export async function createKnowledgeSpace(input: {
	ownerType: KnowledgeOwnerType;
	userId?: string;
	organizationId?: string;
	slug: string;
	name: string;
}) {
	return db.knowledgeSpace.create({
		data: {
			ownerType: input.ownerType,
			userId: input.userId ?? null,
			organizationId: input.organizationId ?? null,
			slug: input.slug,
			name: input.name,
		},
	});
}

export async function listKnowledgeSpaces(scope: KnowledgeOwnerScope) {
	return db.knowledgeSpace.findMany({
		where: toSpaceWhere(scope),
		orderBy: { createdAt: "desc" },
	});
}

export async function getKnowledgeSpaceBySlug(scope: KnowledgeOwnerScope, slug: string) {
	return db.knowledgeSpace.findFirst({
		where: {
			...toSpaceWhere(scope),
			slug,
		},
	});
}

export async function createDataSource(input: {
	knowledgeSpaceId: string;
	sourceType: KnowledgeSourceType;
	name: string;
	config?: Prisma.InputJsonValue;
	credentialRef?: string;
}) {
	return db.dataSource.create({
		data: {
			knowledgeSpaceId: input.knowledgeSpaceId,
			sourceType: input.sourceType,
			name: input.name,
			config: input.config ?? {},
			credentialRef: input.credentialRef,
		},
	});
}

export async function listDataSources(knowledgeSpaceId: string) {
	return db.dataSource.findMany({
		where: { knowledgeSpaceId },
		orderBy: { createdAt: "desc" },
	});
}

export async function createIngestionJob(input: {
	knowledgeSpaceId: string;
	dataSourceId?: string;
	mode: string;
	inputMeta?: Prisma.InputJsonValue;
}) {
	return db.ingestionJob.create({
		data: {
			knowledgeSpaceId: input.knowledgeSpaceId,
			dataSourceId: input.dataSourceId,
			mode: input.mode,
			inputMeta: input.inputMeta ?? {},
			status: "QUEUED",
		},
	});
}

export async function updateIngestionJob(
	id: string,
	data: Prisma.IngestionJobUncheckedUpdateInput,
) {
	return db.ingestionJob.update({
		where: { id },
		data,
	});
}

export async function upsertKnowledgeDocument(input: {
	knowledgeSpaceId: string;
	dataSourceId?: string;
	externalId: string;
	sourceType: KnowledgeSourceType;
	title: string;
	mimeType: string;
	language?: string;
	contentText: string;
	metadata?: Prisma.InputJsonValue;
	checksum: string;
}) {
	const existing = await db.knowledgeDocument.findUnique({
		where: {
			knowledgeSpaceId_externalId: {
				knowledgeSpaceId: input.knowledgeSpaceId,
				externalId: input.externalId,
			},
		},
	});

	if (!existing) {
		return db.knowledgeDocument.create({
			data: {
				knowledgeSpaceId: input.knowledgeSpaceId,
				dataSourceId: input.dataSourceId,
				externalId: input.externalId,
				sourceType: input.sourceType,
				title: input.title,
				mimeType: input.mimeType,
				language: input.language ?? "en",
				contentText: input.contentText,
				metadata: input.metadata ?? {},
				checksum: input.checksum,
			},
		});
	}

	return db.knowledgeDocument.update({
		where: { id: existing.id },
		data: {
			dataSourceId: input.dataSourceId,
			title: input.title,
			mimeType: input.mimeType,
			language: input.language ?? existing.language,
			contentText: input.contentText,
			metadata: input.metadata ?? {},
			checksum: input.checksum,
			version: { increment: 1 },
		},
	});
}

export async function replaceKnowledgeChunks(input: {
	knowledgeSpaceId: string;
	documentId: string;
	chunks: Array<{
		chunkIndex: number;
		text: string;
		tokenCount: number;
		embedding?: Prisma.InputJsonValue;
		metadata?: Prisma.InputJsonValue;
	}>;
}) {
	await db.knowledgeChunk.deleteMany({
		where: { documentId: input.documentId },
	});

	if (input.chunks.length === 0) {
		return;
	}

	await db.knowledgeChunk.createMany({
		data: input.chunks.map((chunk) => ({
			knowledgeSpaceId: input.knowledgeSpaceId,
			documentId: input.documentId,
			chunkIndex: chunk.chunkIndex,
			text: chunk.text,
			tokenCount: chunk.tokenCount,
			embedding: chunk.embedding ?? PrismaClient.JsonNull,
			metadata: chunk.metadata ?? {},
		})),
	});
}

export async function listKnowledgeChunks(knowledgeSpaceId: string, limit = 30) {
	return db.knowledgeChunk.findMany({
		where: { knowledgeSpaceId },
		orderBy: { updatedAt: "desc" },
		take: limit,
		include: {
			document: {
				select: {
					id: true,
					title: true,
					sourceType: true,
				},
			},
		},
	});
}

export async function upsertGraphNode(input: {
	knowledgeSpaceId: string;
	canonicalName: string;
	nodeType: string;
	metadata?: Prisma.InputJsonValue;
}) {
	return db.graphNode.upsert({
		where: {
			knowledgeSpaceId_canonicalName_nodeType: {
				knowledgeSpaceId: input.knowledgeSpaceId,
				canonicalName: input.canonicalName,
				nodeType: input.nodeType,
			},
		},
		create: {
			knowledgeSpaceId: input.knowledgeSpaceId,
			canonicalName: input.canonicalName,
			nodeType: input.nodeType,
			metadata: input.metadata ?? {},
		},
		update: {
			metadata: input.metadata ?? {},
		},
	});
}

export async function createGraphEdge(input: {
	knowledgeSpaceId: string;
	fromNodeId: string;
	toNodeId: string;
	relationType: string;
	weight?: number;
	evidenceChunkId?: string;
	metadata?: Prisma.InputJsonValue;
}) {
	return db.graphEdge.create({
		data: {
			knowledgeSpaceId: input.knowledgeSpaceId,
			fromNodeId: input.fromNodeId,
			toNodeId: input.toNodeId,
			relationType: input.relationType,
			weight: input.weight ?? 1,
			evidenceChunkId: input.evidenceChunkId,
			metadata: input.metadata ?? {},
		},
	});
}

export async function listGraphEdgesForNodes(input: {
	knowledgeSpaceId: string;
	nodeIds: string[];
	limit?: number;
}) {
	return db.graphEdge.findMany({
		where: {
			knowledgeSpaceId: input.knowledgeSpaceId,
			OR: [{ fromNodeId: { in: input.nodeIds } }, { toNodeId: { in: input.nodeIds } }],
		},
		orderBy: { createdAt: "desc" },
		take: input.limit ?? 100,
	});
}

export async function listKnowledgeDocuments(
	knowledgeSpaceId: string,
	options?: { limit?: number; sortBy?: "createdAt" | "updatedAt"; sortOrder?: "asc" | "desc" },
) {
	const sortBy = options?.sortBy ?? "createdAt";
	const sortOrder = options?.sortOrder ?? "desc";
	return db.knowledgeDocument.findMany({
		where: { knowledgeSpaceId },
		orderBy: { [sortBy]: sortOrder },
		take: options?.limit ?? 200,
		include: {
			_count: { select: { chunks: true } },
		},
	});
}

export async function deleteDataSource(id: string) {
	// Documents and chunks are cascade-deleted via FK constraint
	return db.dataSource.delete({ where: { id } });
}

export async function deleteKnowledgeSpace(id: string) {
	// All related data (sources, documents, chunks, graph) cascade-deleted via FK
	return db.knowledgeSpace.delete({ where: { id } });
}

export async function deleteKnowledgeDocument(id: string) {
	// Chunks are cascade-deleted via FK constraint
	return db.knowledgeDocument.delete({ where: { id } });
}

/**
 * Sentinel DataSource name used to store per-space RAG configuration.
 * The DataSource.config JSON field holds the RagConfig values.
 */
const RAG_CONFIG_DATASOURCE_NAME = "__rag_config__";

export type StoredRagConfig = {
	maxOutputTokens: number;
	maxContextTokens: number;
	minConfidence: number;
	retrievalLimit: number;
	includeGraphEdges: boolean;
	systemPrompt: string;
};

/**
 * Read the stored RAG configuration for a knowledge space.
 * Returns null if no config has been saved yet.
 */
export async function getSpaceRagConfig(knowledgeSpaceId: string): Promise<StoredRagConfig | null> {
	const ds = await db.dataSource.findFirst({
		where: {
			knowledgeSpaceId,
			name: RAG_CONFIG_DATASOURCE_NAME,
		},
	});
	if (!ds || !ds.config) return null;
	const config = ds.config as Record<string, unknown>;
	return {
		maxOutputTokens: (config.maxOutputTokens as number) ?? 1024,
		maxContextTokens: (config.maxContextTokens as number) ?? 8000,
		minConfidence: (config.minConfidence as number) ?? 0.35,
		retrievalLimit: (config.retrievalLimit as number) ?? 8,
		includeGraphEdges: (config.includeGraphEdges as boolean) ?? true,
		systemPrompt: (config.systemPrompt as string) ?? "",
	};
}

/**
 * Save or update the RAG configuration for a knowledge space.
 * Uses a DetaSource entry as storage proxy (DB frozen — no schema change possible).
 */
export async function upsertSpaceRagConfig(
	knowledgeSpaceId: string,
	config: StoredRagConfig,
): Promise<void> {
	const existing = await db.dataSource.findFirst({
		where: {
			knowledgeSpaceId,
			name: RAG_CONFIG_DATASOURCE_NAME,
		},
	});

	const configJson: Prisma.InputJsonValue = {
		maxOutputTokens: config.maxOutputTokens,
		maxContextTokens: config.maxContextTokens,
		minConfidence: config.minConfidence,
		retrievalLimit: config.retrievalLimit,
		includeGraphEdges: config.includeGraphEdges,
		systemPrompt: config.systemPrompt,
	};

	if (existing) {
		await db.dataSource.update({
			where: { id: existing.id },
			data: { config: configJson },
		});
	} else {
		await db.dataSource.create({
			data: {
				knowledgeSpaceId,
				sourceType: "FILE_MD",
				name: RAG_CONFIG_DATASOURCE_NAME,
				config: configJson,
			},
		});
	}
}
