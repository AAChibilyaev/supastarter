import { ORPCError } from "@orpc/client";
import { createSearchIndexByOwner, getSearchIndexByOwnerSlug } from "@repo/database";
import { logger } from "@repo/logs";
import { createPhysicalCollection, ensureAlias } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchOwnerAdmin, SEARCH_OWNER_TYPES, type SearchOwnerInput } from "../lib/access";
import { searchFieldSchema, searchIndexSlugSchema } from "../types";

export const createIndex = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes",
		tags: ["Search"],
		summary: "Create search index",
		description: "Creates a new search index with a Typesense collection and alias.",
	})
	.input(
		z.object({
			organizationId: z.string().optional(),
			ownerType: z
				.enum([SEARCH_OWNER_TYPES.organization, SEARCH_OWNER_TYPES.user])
				.optional(),
			ownerId: z.string().optional(),
			slug: searchIndexSlugSchema,
			displayName: z.string().min(1).max(120),
			fields: z.array(searchFieldSchema).min(1),
			defaultSortingField: z.string().optional(),
			tokenSeparators: z.array(z.string().min(1)).optional(),
			symbolTokensToIndex: z.array(z.string().min(1)).optional(),
		}),
	)
	.output(
		z.object({
			id: z.string(),
			slug: z.string(),
			displayName: z.string(),
			version: z.number(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		const owner: SearchOwnerInput =
			input.ownerType && input.ownerId
				? { ownerType: input.ownerType, ownerId: input.ownerId }
				: {
						ownerType: SEARCH_OWNER_TYPES.organization,
						ownerId: input.organizationId ?? "",
					};

		if (!owner.ownerId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "ownerId or organizationId is required",
			});
		}

		await requireSearchOwnerAdmin(owner, user);

		const existing = await getSearchIndexByOwnerSlug(
			{
				organizationId: owner.ownerId,
			},
			input.slug,
		);
		if (existing) {
			throw new ORPCError("CONFLICT", { message: "Index slug already exists" });
		}

		const created = await createSearchIndexByOwner({
			organizationId: owner.ownerId,
			slug: input.slug,
			displayName: input.displayName,
			schema: {
				fields: input.fields,
				defaultSortingField: input.defaultSortingField,
			},
		});

		try {
			await createPhysicalCollection({
				organizationId: owner.ownerId,
				slug: input.slug,
				version: created.version,
				fields: input.fields,
				defaultSortingField: input.defaultSortingField,
				tokenSeparators: input.tokenSeparators,
				symbolTokensToIndex: input.symbolTokensToIndex,
			});
			await ensureAlias(owner.ownerId, input.slug, created.version);
		} catch (error) {
			logger.error("Failed to create Typesense collection", { error });
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Could not create search collection",
			});
		}

		return {
			id: created.id,
			slug: created.slug,
			displayName: created.displayName,
			version: created.version,
		};
	});
