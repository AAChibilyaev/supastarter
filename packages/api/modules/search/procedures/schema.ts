import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { getTypesenseClient, aliasName } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import {
	requireOrganizationAdmin,
	requireOrganizationMember,
	requireSearchIndex,
} from "../lib/access";
import { searchFieldSchema, searchIndexSlugSchema } from "../types";

export const getSchema = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/schema",
		tags: ["Search"],
		summary: "Get Typesense collection schema",
		description:
			"Reads the collection schema from Typesense and returns the field definitions for the given index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(
		z.object({
			name: z.string(),
			fields: z.array(
				z.object({
					name: z.string(),
					type: z.string(),
					optional: z.boolean().optional(),
					facet: z.boolean().optional(),
					index: z.boolean().optional(),
					sort: z.boolean().optional(),
				}),
			),
			defaultSortingField: z.string().nullable(),
			enableNestedFields: z.boolean(),
			numDocuments: z.number(),
			tokenSeparators: z.array(z.string()).optional(),
			symbolTokensToIndex: z.array(z.string()).optional(),
		}),
	)
	.handler(async ({ input: { organizationId, slug }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);
		await requireSearchIndex(organizationId, slug);

		const client = getTypesenseClient();
		const alias = aliasName(organizationId, slug);

		let collection;
		try {
			collection = await client.aliases(alias).retrieve();
		} catch {
			throw new ORPCError("NOT_FOUND", {
				message: "Typesense alias not found for this index",
			});
		}

		const collectionName = collection.collection_name;
		let fullCollection;
		try {
			fullCollection = await client.collections(collectionName).retrieve();
		} catch {
			throw new ORPCError("NOT_FOUND", {
				message: "Typesense collection not found",
			});
		}

		return {
			name: fullCollection.name,
			fields: fullCollection.fields ?? [],
			defaultSortingField: fullCollection.default_sorting_field ?? null,
			enableNestedFields: fullCollection.enable_nested_fields ?? false,
			numDocuments: fullCollection.num_documents ?? 0,
			tokenSeparators: (fullCollection as Record<string, unknown>).token_separators as
				| string[]
				| undefined,
			symbolTokensToIndex: (fullCollection as Record<string, unknown>)
				.symbol_tokens_to_index as string[] | undefined,
		};
	});

export const updateSchema = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/schema",
		tags: ["Search"],
		summary: "Update index schema definition",
		description:
			"Updates the Prisma SearchIndex.schema field with the provided fields and optionally triggers a reindex.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			fields: z.array(searchFieldSchema),
			defaultSortingField: z.string().optional(),
			tokenSeparators: z.array(z.string().min(1)).optional(),
			symbolTokensToIndex: z.array(z.string().min(1)).optional(),
			triggerReindex: z.boolean().optional().default(false),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			schemaUpdated: z.boolean(),
			reindexTriggered: z.boolean(),
			indexId: z.string(),
			indexSlug: z.string(),
		}),
	)
	.handler(
		async ({
			input: { organizationId, slug, fields, defaultSortingField, triggerReindex },
			context: { user },
		}) => {
			await requireOrganizationAdmin(organizationId, user);
			const index = await requireSearchIndex(organizationId, slug);

			const schema = {
				fields: fields as unknown[],
				...(defaultSortingField ? { defaultSortingField } : {}),
				...(input.tokenSeparators !== undefined
					? { tokenSeparators: input.tokenSeparators }
					: {}),
				...(input.symbolTokensToIndex !== undefined
					? { symbolTokensToIndex: input.symbolTokensToIndex }
					: {}),
			};

			await db.searchIndex.update({
				where: { id: index.id },
				data: { schema: schema as never },
			});

			return {
				success: true,
				schemaUpdated: true,
				reindexTriggered: triggerReindex,
				indexId: index.id,
				indexSlug: slug,
			};
		},
	);
