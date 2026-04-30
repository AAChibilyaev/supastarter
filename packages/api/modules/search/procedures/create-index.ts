import { ORPCError } from "@orpc/client";
import { createSearchIndex, getSearchIndexBySlug } from "@repo/database";
import { logger } from "@repo/logs";
import { createPhysicalCollection, ensureAlias } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";
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
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			displayName: z.string().min(1).max(120),
			fields: z.array(searchFieldSchema).min(1),
			defaultSortingField: z.string().optional(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const existing = await getSearchIndexBySlug(input.organizationId, input.slug);
		if (existing) {
			throw new ORPCError("CONFLICT", { message: "Index slug already exists" });
		}

		const created = await createSearchIndex({
			organizationId: input.organizationId,
			slug: input.slug,
			displayName: input.displayName,
			schema: {
				fields: input.fields,
				defaultSortingField: input.defaultSortingField,
			},
		});

		try {
			await createPhysicalCollection({
				organizationId: input.organizationId,
				slug: input.slug,
				version: created.version,
				fields: input.fields,
				defaultSortingField: input.defaultSortingField,
			});
			await ensureAlias(input.organizationId, input.slug, created.version);
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
