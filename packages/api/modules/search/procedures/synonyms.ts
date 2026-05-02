import { db, type Prisma } from "@repo/database";
import { logger } from "@repo/logs";
import { aliasName, syncSynonymsToTypesense } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const synonymSchema = z.object({
	synonym: z.string().min(1).max(255),
	root: z.string().min(1).max(255),
});

export const getSynonyms = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/synonyms",
		tags: ["Search"],
		summary: "Get synonyms for a search index",
		description: "Returns the configured synonyms stored in the index schema.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(z.array(synonymSchema))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const rawSchema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};
		const synonyms = Array.isArray(rawSchema._synonyms) ? rawSchema._synonyms : [];

		return synonyms as { synonym: string; root: string }[];
	});

export const updateSynonyms = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/synonyms",
		tags: ["Search"],
		summary: "Update synonyms for a search index",
		description: "Replaces the entire synonym list stored in the index schema.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			synonyms: z.array(synonymSchema),
		}),
	)
	.output(z.array(synonymSchema))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const schema = (index.schema ?? {}) as Record<string, unknown>;

		await db.searchIndex.update({
			where: { id: index.id },
			data: {
				schema: {
					...schema,
					_synonyms: input.synonyms,
				} as Prisma.InputJsonValue,
			},
		});

		// Sync to Typesense — best-effort, does not block the response
		const collection = aliasName(input.organizationId, input.slug);
		syncSynonymsToTypesense(collection, input.synonyms).catch((err) =>
			logger.error("updateSynonyms: Typesense sync failed", {
				organizationId: input.organizationId,
				slug: input.slug,
				err,
			}),
		);

		return input.synonyms;
	});
