import {
	getSynonymsByIndexId,
	replaceSynonyms,
	rowsToSynonymPairs,
} from "@repo/database/prisma/queries/synonyms";
import { logger } from "@repo/logs";
import { aliasName, syncSynonymsToTypesense } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const synonymSchema = z.object({
	synonym: z.string().min(1).max(255),
	root: z.string().min(1).max(255),
	locale: z.string().min(2).max(5).optional(),
});

export const getSynonyms = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/synonyms",
		tags: ["Search"],
		summary: "Get synonyms for a search index",
		description: "Returns the configured synonyms stored in the search_index_synonym table.",
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

		const rows = await getSynonymsByIndexId(index.id);
		return rowsToSynonymPairs(rows);
	});

export const updateSynonyms = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/synonyms",
		tags: ["Search"],
		summary: "Update synonyms for a search index",
		description: "Replaces the entire synonym list in the search_index_synonym table.",
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

		// Replace synonyms in the new table (transactional)
		await replaceSynonyms(index.id, input.organizationId, input.synonyms);

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
