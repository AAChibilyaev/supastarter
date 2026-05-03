import { ORPCError } from "@orpc/client";
import { createSearchIndexByOwner, getSearchIndexByOwnerSlug } from "@repo/database";
import { logger } from "@repo/logs";
import {
	aliasName,
	cloneCollection,
	getTypesenseClient,
	physicalCollectionName,
} from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const cloneIndex = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/clone",
		tags: ["Search"],
		summary: "Clone search index",
		description:
			"Clones an existing Typesense collection schema and optionally copies documents into a new search index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			newSlug: searchIndexSlugSchema,
			copyDocuments: z.boolean().optional().default(false),
		}),
	)
	.output(
		z.object({
			id: z.string(),
			slug: z.string(),
			name: z.string(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		// Check that the new slug doesn't already exist
		const existing = await getSearchIndexByOwnerSlug(
			{ organizationId: input.organizationId },
			input.newSlug,
		);
		if (existing) {
			throw new ORPCError("CONFLICT", {
				message: "An index with the new slug already exists",
			});
		}

		// Resolve the source physical collection name via alias
		const sourceAlias = aliasName(input.organizationId, input.slug);
		let sourceCollectionName: string;
		try {
			const client = getTypesenseClient();
			const alias = await client.aliases(sourceAlias).retrieve();
			sourceCollectionName = alias.collection_name;
		} catch {
			throw new ORPCError("NOT_FOUND", {
				message: "Typesense alias not found for this index",
			});
		}

		// Create the new SearchIndex record in the DB first
		const displayName = `${index.displayName} (clone)`;
		const created = await createSearchIndexByOwner({
			organizationId: input.organizationId,
			slug: input.newSlug,
			displayName,
			schema: index.schema as never,
		});

		const newCollectionName = physicalCollectionName(
			input.organizationId,
			input.newSlug,
			created.version,
		);

		try {
			// Clone the Typesense collection
			const cloneResult = await cloneCollection(
				sourceCollectionName,
				newCollectionName,
				input.copyDocuments,
			);

			logger.info("Collection cloned", {
				sourceCollection: sourceCollectionName,
				newCollection: newCollectionName,
				copyDocuments: input.copyDocuments,
				organizationId: input.organizationId,
				slug: input.newSlug,
			});

			return {
				id: created.id,
				slug: created.slug,
				name: cloneResult.name,
			};
		} catch (error) {
			logger.error("Failed to clone Typesense collection", {
				error,
				sourceCollection: sourceCollectionName,
				newCollection: newCollectionName,
				organizationId: input.organizationId,
			});
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Could not clone search collection",
			});
		}
	});
