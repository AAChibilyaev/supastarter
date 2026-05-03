import { db } from "../client";
import type { Prisma } from "../generated/client";

// ─── Personal Indexes (My Search) ──────────────────────────────────────────

export async function createPersonalSearchIndex(input: {
	organizationId: string;
	slug: string;
	displayName: string;
	createdByUserId: string;
}) {
	return db.searchIndex.create({
		data: {
			organizationId: input.organizationId,
			slug: input.slug,
			displayName: input.displayName,
			schema: {
				type: "personal",
				createdByUserId: input.createdByUserId,
				files: [],
			} as unknown as Prisma.InputJsonValue,
		},
	});
}

export async function listPersonalSearchIndexes(organizationId: string) {
	return db.searchIndex.findMany({
		where: {
			organizationId,
			// Personal indexes flagged by schema containing type="personal"
		},
		orderBy: { createdAt: "desc" },
	});
}

export async function getPersonalSearchIndexById(organizationId: string, id: string) {
	return db.searchIndex.findFirst({
		where: {
			id,
			organizationId,
		},
	});
}

export async function getPersonalSearchIndexBySlug(organizationId: string, slug: string) {
	return db.searchIndex.findFirst({
		where: {
			organizationId,
			slug,
		},
	});
}

export async function deletePersonalSearchIndex(organizationId: string, id: string) {
	return db.searchIndex.deleteMany({
		where: {
			id,
			organizationId,
		},
	});
}

// ─── File Metadata (stored in SearchIndex.schema JSON) ─────────────────────

export interface IndexFileEntry {
	id: string;
	filename: string;
	originalFilename: string;
	mimeType: string;
	fileType: string;
	fileSize: number;
	wordCount: number;
	uploadedAt: string;
	sourceUrl?: string;
}

export async function addFileToIndex(indexId: string, file: IndexFileEntry): Promise<void> {
	const index = await db.searchIndex.findUnique({
		where: { id: indexId },
		select: { schema: true },
	});

	if (!index) {
		throw new Error("Search index not found");
	}

	const schema = index.schema as Record<string, unknown>;
	const files = (schema.files as IndexFileEntry[]) ?? [];
	files.push(file);

	await db.searchIndex.update({
		where: { id: indexId },
		data: {
			schema: { ...schema, files } as unknown as Prisma.InputJsonValue,
		},
	});
}

export async function listFilesInIndex(
	indexId: string,
	organizationId: string,
): Promise<IndexFileEntry[]> {
	const index = await db.searchIndex.findFirst({
		where: { id: indexId, organizationId },
		select: { schema: true },
	});

	if (!index) {
		return [];
	}

	const schema = index.schema as Record<string, unknown>;
	const schemaType = schema.type;
	// Only return files from personal indexes
	if (schemaType !== "personal") {
		return [];
	}

	return (schema.files as IndexFileEntry[]) ?? [];
}

export async function removeFileFromIndex(indexId: string, fileId: string): Promise<void> {
	const index = await db.searchIndex.findUnique({
		where: { id: indexId },
		select: { schema: true },
	});

	if (!index) {
		throw new Error("Search index not found");
	}

	const schema = index.schema as Record<string, unknown>;
	const files = (schema.files as IndexFileEntry[]) ?? [];
	const filtered = files.filter((f) => f.id !== fileId);

	await db.searchIndex.update({
		where: { id: indexId },
		data: {
			schema: { ...schema, files: filtered } as unknown as Prisma.InputJsonValue,
		},
	});
}
