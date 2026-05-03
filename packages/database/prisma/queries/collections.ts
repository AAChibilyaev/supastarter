import { db } from "../client";
import type { Prisma } from "../generated/client";

// ─── Collection Queries ──────────────────────────────────────────────────

export interface CollectionView {
	id: string;
	organizationId: string;
	slug: string;
	name: string;
	description: string | null;
	schema: Prisma.JsonValue;
	documentCount: number;
	size: number;
	status: string;
	createdAt: string;
	updatedAt: string;
}

function mapCollection(c: any): CollectionView {
	return {
		id: c.id,
		organizationId: c.organizationId,
		slug: c.slug,
		name: c.name,
		description: c.description,
		schema: c.schema,
		documentCount: c.documentCount,
		size: Number(c.size),
		status: c.status,
		createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
		updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : String(c.updatedAt),
	};
}

export function listCollections(organizationId: string): Promise<CollectionView[]> {
	return db.collection
		.findMany({
			where: { organizationId, status: "active" },
			orderBy: { createdAt: "desc" },
		})
		.then((rows) => rows.map(mapCollection));
}

export async function getCollectionBySlug(
	organizationId: string,
	slug: string,
): Promise<CollectionView | null> {
	const row = await db.collection.findUnique({
		where: { organizationId_slug: { organizationId, slug } },
	});
	return row ? mapCollection(row) : null;
}

export async function getCollectionById(id: string): Promise<CollectionView | null> {
	const row = await db.collection.findUnique({ where: { id } });
	return row ? mapCollection(row) : null;
}

export interface CreateCollectionInput {
	organizationId: string;
	slug: string;
	name: string;
	description?: string;
	schema?: any;
}

export async function createCollection(input: CreateCollectionInput): Promise<CollectionView> {
	const row = await db.collection.create({
		data: {
			organizationId: input.organizationId,
			slug: input.slug,
			name: input.name,
			description: input.description ?? null,
			schema: input.schema ?? [],
		},
	});
	return mapCollection(row);
}

export interface UpdateCollectionInput {
	slug?: string;
	name?: string;
	description?: string | null;
	schema?: any;
}

export async function updateCollection(
	id: string,
	input: UpdateCollectionInput,
): Promise<CollectionView> {
	const row = await db.collection.update({
		where: { id },
		data: {
			...(input.slug !== undefined ? { slug: input.slug } : {}),
			...(input.name !== undefined ? { name: input.name } : {}),
			...(input.description !== undefined ? { description: input.description } : {}),
			...(input.schema !== undefined ? { schema: input.schema } : {}),
		},
	});
	return mapCollection(row);
}

export async function deleteCollection(id: string): Promise<void> {
	await db.collection.delete({ where: { id } });
}

export async function duplicateCollection(
	id: string,
	newSlug: string,
	newName: string,
): Promise<CollectionView> {
	const original = await db.collection.findUnique({
		where: { id },
		include: { documents: true },
	});

	if (!original) {
		throw new Error("Collection not found");
	}

	const newCollection = await db.collection.create({
		data: {
			organizationId: original.organizationId,
			slug: newSlug,
			name: newName,
			description: original.description,
			schema: original.schema as any,
		},
	});

	if (original.documents.length > 0) {
		await db.collectionDocument.createMany({
			data: original.documents.map((doc, index) => ({
				collectionId: newCollection.id,
				organizationId: original.organizationId,
				data: doc.data as Prisma.JsonObject,
				rowNumber: index + 1,
			})),
		});

		await db.collection.update({
			where: { id: newCollection.id },
			data: { documentCount: original.documents.length },
		});
	}

	return mapCollection(newCollection);
}

// ─── Collection Document Queries ─────────────────────────────────────────

export interface CollectionDocumentView {
	id: string;
	collectionId: string;
	organizationId: string;
	data: Prisma.JsonValue;
	rowNumber: number;
	createdAt: string;
	updatedAt: string;
}

function mapDocument(doc: any): CollectionDocumentView {
	return {
		id: doc.id,
		collectionId: doc.collectionId,
		organizationId: doc.organizationId,
		data: doc.data,
		rowNumber: doc.rowNumber,
		createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
		updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
	};
}

export interface ListDocumentsOptions {
	limit?: number;
	offset?: number;
	sortField?: string;
	sortDirection?: "asc" | "desc";
	filter?: Record<string, unknown>;
}

export async function listDocuments(
	collectionId: string,
	options: ListDocumentsOptions = {},
): Promise<{ documents: CollectionDocumentView[]; total: number }> {
	const limit = options.limit ?? 50;
	const offset = options.offset ?? 0;

	const where: Prisma.CollectionDocumentWhereInput = { collectionId };

	const orderBy: Prisma.CollectionDocumentOrderByWithRelationInput = {
		rowNumber: options.sortDirection ?? "asc",
	};

	const [rows, total] = await Promise.all([
		db.collectionDocument.findMany({
			where,
			orderBy,
			take: limit,
			skip: offset,
		}),
		db.collectionDocument.count({ where }),
	]);

	return { documents: rows.map(mapDocument), total };
}

export async function getDocument(id: string): Promise<CollectionDocumentView | null> {
	const row = await db.collectionDocument.findUnique({ where: { id } });
	return row ? mapDocument(row) : null;
}

export interface CreateDocumentInput {
	collectionId: string;
	organizationId: string;
	data: any;
}

export async function createDocument(input: CreateDocumentInput): Promise<CollectionDocumentView> {
	// Get next row number
	const lastDoc = await db.collectionDocument.findFirst({
		where: { collectionId: input.collectionId },
		orderBy: { rowNumber: "desc" },
		select: { rowNumber: true },
	});

	const nextRowNumber = (lastDoc?.rowNumber ?? 0) + 1;

	const row = await db.collectionDocument.create({
		data: {
			collectionId: input.collectionId,
			organizationId: input.organizationId,
			data: input.data,
			rowNumber: nextRowNumber,
		},
	});

	// Update document count
	await db.collection.update({
		where: { id: input.collectionId },
		data: { documentCount: { increment: 1 } },
	});

	return mapDocument(row);
}

export interface UpdateDocumentInput {
	data?: any;
	rowNumber?: number;
}

export async function updateDocument(
	id: string,
	input: UpdateDocumentInput,
): Promise<CollectionDocumentView> {
	const row = await db.collectionDocument.update({
		where: { id },
		data: {
			...(input.data !== undefined ? { data: input.data } : {}),
			...(input.rowNumber !== undefined ? { rowNumber: input.rowNumber } : {}),
		},
	});
	return mapDocument(row);
}

export async function deleteDocument(id: string): Promise<void> {
	const doc = await db.collectionDocument.findUnique({
		where: { id },
		select: { collectionId: true },
	});

	if (!doc) return;

	await db.collectionDocument.delete({ where: { id } });

	// Update document count
	await db.collection.update({
		where: { id: doc.collectionId },
		data: { documentCount: { decrement: 1 } },
	});
}

// ─── Export ─────────────────────────────────────────────────────────────────

export type ExportFormat = "csv" | "json" | "jsonl" | "xlsx";

export async function exportCollectionDocuments(
	collectionId: string,
	options: {
		documentIds?: string[];
		schemaFields?: string[];
		/** Simple field=value filter applied in-memory after fetch */
		filter?: Record<string, unknown>;
	} = {},
): Promise<CollectionDocumentView[]> {
	const where: Prisma.CollectionDocumentWhereInput = { collectionId };
	if (options.documentIds && options.documentIds.length > 0) {
		where.id = { in: options.documentIds };
	}
	const rows = await db.collectionDocument.findMany({
		where,
		orderBy: { rowNumber: "asc" },
	});

	// In-memory filter matching on JSON data fields
	let filtered = rows.map(mapDocument);
	if (options.filter && Object.keys(options.filter).length > 0) {
		filtered = filtered.filter((doc) => {
			const data = doc.data as Record<string, unknown>;
			return Object.entries(options.filter!).every(([key, value]) => {
				if (value === undefined || value === null || value === "") return true;
				return data?.[key] === value;
			});
		});
	}

	return filtered;
}

export async function buildCsvContent(
	documents: CollectionDocumentView[],
	schemaFields: string[],
): Promise<string> {
	const headers = schemaFields.join(",");
	const rows = documents
		.map((doc) => {
			const data = doc.data as Record<string, unknown>;
			return schemaFields
				.map((field) => {
					const val = data?.[field];
					if (val == null) return "";
					// Safe stringification for CSV
					const str = typeof val === "string" ? val : JSON.stringify(val);
					// Escape CSV: wrap in quotes if contains comma, quote, or newline
					if (str.includes(",") || str.includes('"') || str.includes("\n")) {
						return `"${str.replace(/"/g, '""')}"`;
					}
					return str;
				})
				.join(",");
		})
		.join("\n");
	return `${headers}\n${rows}`;
}

export function buildJsonContent(
	documents: CollectionDocumentView[],
	pretty: boolean = true,
): string {
	const extracted = documents.map((doc) => doc.data);
	return pretty ? JSON.stringify(extracted, null, 2) : JSON.stringify(extracted);
}

export function buildXlsxContent(
	documents: CollectionDocumentView[],
	schemaFields: string[],
): Buffer {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const XLSX = require("xlsx");

	const data = documents.map((doc) => {
		const record = doc.data as Record<string, unknown>;
		const row: Record<string, unknown> = {};
		for (const field of schemaFields) {
			row[field] = record?.[field] ?? null;
		}
		return row;
	});

	const wb = XLSX.utils.book_new();
	const ws = XLSX.utils.json_to_sheet(data);

	// Auto-fit column widths
	const colWidths = schemaFields.map((field) => {
		const maxLen = Math.max(
			field.length,
			...data.map((row) => {
				const val = row[field];
				return val != null ? JSON.stringify(val).length : 0;
			}),
		);
		return { wch: Math.min(maxLen + 2, 60) };
	});
	ws["!cols"] = colWidths;

	XLSX.utils.book_append_sheet(wb, ws, "Documents");
	const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
	return buffer;
}

export interface CreateBatchDocumentsInput {
	collectionId: string;
	organizationId: string;
	documents: any[];
}

export async function createBatchDocuments(
	input: CreateBatchDocumentsInput,
): Promise<CollectionDocumentView[]> {
	const { collectionId, organizationId, documents } = input;

	// Get the starting row number
	const lastDoc = await db.collectionDocument.findFirst({
		where: { collectionId },
		orderBy: { rowNumber: "desc" },
		select: { rowNumber: true },
	});

	let nextRowNumber = (lastDoc?.rowNumber ?? 0) + 1;

	const data = documents.map((doc) => ({
		collectionId,
		organizationId,
		data: doc,
		rowNumber: nextRowNumber++,
	}));

	await db.collectionDocument.createMany({ data });

	// Update document count
	await db.collection.update({
		where: { id: collectionId },
		data: { documentCount: { increment: documents.length } },
	});

	// Fetch the created documents
	const created = await db.collectionDocument.findMany({
		where: { collectionId },
		orderBy: { rowNumber: "desc" },
		take: documents.length,
	});

	return created.reverse().map(mapDocument);
}

export interface UpdateBatchDocumentsInput {
	ids: string[];
	data: any;
}

export async function updateBatchDocuments(input: UpdateBatchDocumentsInput): Promise<number> {
	const result = await db.collectionDocument.updateMany({
		where: { id: { in: input.ids } },
		data: { data: input.data },
	});
	return result.count;
}

export interface DeleteBatchDocumentsInput {
	collectionId: string;
	ids: string[];
}

export async function deleteBatchDocuments(input: DeleteBatchDocumentsInput): Promise<number> {
	const result = await db.collectionDocument.deleteMany({
		where: { id: { in: input.ids }, collectionId: input.collectionId },
	});

	// Update document count
	await db.collection.update({
		where: { id: input.collectionId },
		data: { documentCount: { decrement: result.count } },
	});

	return result.count;
}
