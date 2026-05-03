import { ORPCError } from "@orpc/client";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../../search/lib/access";

// Use z.any() for JSON data fields — Prisma's JsonValue is complex
const jsonSchema = z.any();

const documentViewSchema = z.object({
	id: z.string(),
	collectionId: z.string(),
	organizationId: z.string(),
	data: z.any(),
	rowNumber: z.number(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const paginatedDocumentSchema = z.object({
	documents: z.array(documentViewSchema),
	total: z.number(),
});

// ─── List Documents ──────────────────────────────────────────────────────

export const listDocuments = protectedProcedure
	.route({
		method: "GET",
		path: "/collections/{slug}/documents",
		tags: ["Documents"],
		summary: "List documents",
		description: "Returns paginated documents for a collection with sorting.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z.string(),
			limit: z.number().min(1).max(200).optional().default(50),
			offset: z.number().min(0).optional().default(0),
			sortField: z.string().optional(),
			sortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
		}),
	)
	.output(paginatedDocumentSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const { getCollectionBySlug, listDocuments: listDocs } = await import("@repo/database");

		const collection = await getCollectionBySlug(input.organizationId, input.slug);
		if (!collection) {
			throw new ORPCError("NOT_FOUND");
		}

		return listDocs(collection.id, {
			limit: input.limit,
			offset: input.offset,
			sortField: input.sortField,
			sortDirection: input.sortDirection,
		});
	});

// ─── Get Document ────────────────────────────────────────────────────────

export const getDocument = protectedProcedure
	.route({
		method: "GET",
		path: "/collections/{slug}/documents/{id}",
		tags: ["Documents"],
		summary: "Get document",
		description: "Returns a single document by ID.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.string(),
		}),
	)
	.output(documentViewSchema.nullable())
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const { getDocument: getDoc } = await import("@repo/database");
		const doc = await getDoc(input.id);
		if (!doc) {
			throw new ORPCError("NOT_FOUND");
		}
		return doc;
	});

// ─── Create Document ─────────────────────────────────────────────────────

export const createDocument = protectedProcedure
	.route({
		method: "POST",
		path: "/collections/{slug}/documents",
		tags: ["Documents"],
		summary: "Create document",
		description: "Creates a new document in the collection.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z.string(),
			data: jsonSchema,
		}),
	)
	.output(documentViewSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const { getCollectionBySlug, createDocument: createDoc } = await import("@repo/database");

		const collection = await getCollectionBySlug(input.organizationId, input.slug);
		if (!collection) {
			throw new ORPCError("NOT_FOUND");
		}

		return createDoc({
			collectionId: collection.id,
			organizationId: input.organizationId,
			data: input.data,
		});
	});

// ─── Create Batch Documents ──────────────────────────────────────────────

export const createBatchDocuments = protectedProcedure
	.route({
		method: "POST",
		path: "/collections/{slug}/documents/batch",
		tags: ["Documents"],
		summary: "Create batch documents",
		description: "Creates multiple documents at once (from paste/import).",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z.string(),
			documents: z.array(jsonSchema).min(1).max(10000),
		}),
	)
	.output(z.array(documentViewSchema))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const { getCollectionBySlug, createBatchDocuments: createBatch } =
			await import("@repo/database");

		const collection = await getCollectionBySlug(input.organizationId, input.slug);
		if (!collection) {
			throw new ORPCError("NOT_FOUND");
		}

		return createBatch({
			collectionId: collection.id,
			organizationId: input.organizationId,
			documents: input.documents,
		});
	});

// ─── Update Document ─────────────────────────────────────────────────────

export const updateDocument = protectedProcedure
	.route({
		method: "PATCH",
		path: "/collections/{slug}/documents/{id}",
		tags: ["Documents"],
		summary: "Update document",
		description: "Updates a single document's data or row number.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.string(),
			data: jsonSchema.optional(),
			rowNumber: z.number().int().positive().optional(),
		}),
	)
	.output(documentViewSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const { updateDocument: updateDoc } = await import("@repo/database");
		return updateDoc(input.id, {
			data: input.data,
			rowNumber: input.rowNumber,
		});
	});

// ─── Update Batch Documents ──────────────────────────────────────────────

export const updateBatchDocuments = protectedProcedure
	.route({
		method: "PATCH",
		path: "/collections/{slug}/documents/batch",
		tags: ["Documents"],
		summary: "Update batch documents",
		description: "Bulk update — sets the same data fields on multiple documents.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			ids: z.array(z.string()).min(1).max(1000),
			data: jsonSchema,
		}),
	)
	.output(z.object({ count: z.number() }))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const { updateBatchDocuments: updateBatch } = await import("@repo/database");
		const count = await updateBatch({
			ids: input.ids,
			data: input.data,
		});

		return { count };
	});

// ─── Delete Document ─────────────────────────────────────────────────────

export const deleteDocument = protectedProcedure
	.route({
		method: "DELETE",
		path: "/collections/{slug}/documents/{id}",
		tags: ["Documents"],
		summary: "Delete document",
		description: "Deletes a single document from the collection.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.string(),
		}),
	)
	.output(z.object({ deleted: z.boolean() }))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const { deleteDocument: deleteDoc } = await import("@repo/database");
		await deleteDoc(input.id);
		return { deleted: true };
	});

// ─── Delete Batch Documents ──────────────────────────────────────────────

export const deleteBatchDocuments = protectedProcedure
	.route({
		method: "POST",
		path: "/collections/{slug}/documents/batch-delete",
		tags: ["Documents"],
		summary: "Delete batch documents",
		description: "Deletes multiple documents from a collection by IDs.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z.string(),
			ids: z.array(z.string()).min(1).max(1000),
		}),
	)
	.output(z.object({ count: z.number() }))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const { getCollectionBySlug, deleteBatchDocuments: deleteBatch } =
			await import("@repo/database");

		const collection = await getCollectionBySlug(input.organizationId, input.slug);
		if (!collection) {
			throw new ORPCError("NOT_FOUND");
		}

		const count = await deleteBatch({
			collectionId: collection.id,
			ids: input.ids,
		});

		return { count };
	});
