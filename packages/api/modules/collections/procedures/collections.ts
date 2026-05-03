import { ORPCError } from "@orpc/client";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireOrganizationMember } from "../../search/lib/access";

const collectionViewSchema = z.object({
	id: z.string(),
	organizationId: z.string(),
	slug: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	schema: z.any(),
	documentCount: z.number(),
	size: z.number(),
	status: z.string(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	synonymSets: z.array(z.string()),
	curationSets: z.array(z.string()),
	createdAt: z.string(),
	updatedAt: z.string(),
});

// ─── List Collections ────────────────────────────────────────────────────

export const listCollections = protectedProcedure
	.route({
		method: "GET",
		path: "/collections",
		tags: ["Collections"],
		summary: "List collections",
		description: "Returns all active collections for the organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(z.array(collectionViewSchema))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);
		const { listCollections } = await import("@repo/database");
		return listCollections(input.organizationId);
	});

// ─── Create Collection ───────────────────────────────────────────────────

export const createCollection = protectedProcedure
	.route({
		method: "POST",
		path: "/collections",
		tags: ["Collections"],
		summary: "Create collection",
		description: "Creates a new collection with the given slug and schema.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z
				.string()
				.min(1)
				.max(128)
				.regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
			name: z.string().min(1).max(256),
			description: z.string().max(1024).optional(),
			schema: z.array(z.any()).optional().default([]),
			metadata: z.record(z.string(), z.unknown()).optional(),
			synonymSets: z.array(z.string().min(1)).optional(),
			curationSets: z.array(z.string().min(1)).optional(),
		}),
	)
	.output(collectionViewSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const { createCollection, getCollectionBySlug } = await import("@repo/database");

		// Check slug uniqueness
		const existing = await getCollectionBySlug(input.organizationId, input.slug);
		if (existing) {
			throw new ORPCError("CONFLICT", {
				message: "A collection with this slug already exists",
			});
		}

		return createCollection({
			organizationId: input.organizationId,
			slug: input.slug,
			name: input.name,
			description: input.description,
			schema: input.schema,
			metadata: input.metadata,
			synonymSets: input.synonymSets,
			curationSets: input.curationSets,
		});
	});

// ─── Get Collection ──────────────────────────────────────────────────────

export const getCollection = protectedProcedure
	.route({
		method: "GET",
		path: "/collections/{slug}",
		tags: ["Collections"],
		summary: "Get collection by slug",
		description: "Returns a single collection by its slug within the organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z.string(),
		}),
	)
	.output(collectionViewSchema.nullable())
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const { getCollectionBySlug } = await import("@repo/database");
		const collection = await getCollectionBySlug(input.organizationId, input.slug);
		if (!collection) {
			throw new ORPCError("NOT_FOUND");
		}
		return collection;
	});

// ─── Update Collection ───────────────────────────────────────────────────

export const updateCollection = protectedProcedure
	.route({
		method: "PATCH",
		path: "/collections/{slug}",
		tags: ["Collections"],
		summary: "Update collection",
		description: "Updates collection name, description, schema, or slug.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z.string(),
			name: z.string().min(1).max(256).optional(),
			description: z.string().max(1024).nullable().optional(),
			schema: z.array(z.any()).optional(),
			newSlug: z
				.string()
				.min(1)
				.max(128)
				.regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
				.optional(),
			metadata: z.record(z.string(), z.unknown()).nullable().optional(),
			synonymSets: z.array(z.string().min(1)).optional(),
			curationSets: z.array(z.string().min(1)).optional(),
		}),
	)
	.output(collectionViewSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const { getCollectionBySlug, updateCollection } = await import("@repo/database");

		const collection = await getCollectionBySlug(input.organizationId, input.slug);
		if (!collection) {
			throw new ORPCError("NOT_FOUND");
		}

		return updateCollection(collection.id, {
			slug: input.newSlug,
			name: input.name,
			description: input.description,
			schema: input.schema,
			metadata: input.metadata,
			synonymSets: input.synonymSets,
			curationSets: input.curationSets,
		});
	});

// ─── Delete Collection ───────────────────────────────────────────────────

export const deleteCollection = protectedProcedure
	.route({
		method: "DELETE",
		path: "/collections/{slug}",
		tags: ["Collections"],
		summary: "Delete collection",
		description: "Permanently deletes a collection and all its documents.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z.string(),
		}),
	)
	.output(z.object({ deleted: z.boolean() }))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const { getCollectionBySlug, deleteCollection: del } = await import("@repo/database");

		const collection = await getCollectionBySlug(input.organizationId, input.slug);
		if (!collection) {
			throw new ORPCError("NOT_FOUND");
		}

		await del(collection.id);
		return { deleted: true };
	});

// ─── Duplicate Collection ────────────────────────────────────────────────

export const duplicateCollection = protectedProcedure
	.route({
		method: "POST",
		path: "/collections/{slug}/duplicate",
		tags: ["Collections"],
		summary: "Duplicate collection",
		description: "Creates a copy of the collection including all documents.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z.string(),
			newSlug: z
				.string()
				.min(1)
				.max(128)
				.regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
			newName: z.string().min(1).max(256),
		}),
	)
	.output(collectionViewSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const { getCollectionBySlug, duplicateCollection: dup } = await import("@repo/database");

		const collection = await getCollectionBySlug(input.organizationId, input.slug);
		if (!collection) {
			throw new ORPCError("NOT_FOUND");
		}

		return dup(collection.id, input.newSlug, input.newName);
	});
