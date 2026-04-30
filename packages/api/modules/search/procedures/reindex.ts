import { ORPCError } from "@orpc/client";
import { updateSearchIndexVersion } from "@repo/database";
import { logger } from "@repo/logs";
import { reindexCollection } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchFieldSchema, searchIndexSlugSchema } from "../types";

export const reindex = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/reindex",
		tags: ["Search"],
		summary: "Reindex collection (zero-downtime alias swap)",
		description:
			"Creates a new versioned Typesense collection, copies all current documents to it, swaps the alias atomically, then drops obsolete prior versions (keeping the immediately previous one as a rollback target).",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			fields: z.array(searchFieldSchema).min(1).optional(),
			defaultSortingField: z.string().optional(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const fields =
			input.fields ??
			(Array.isArray(index.schema as unknown[])
				? (index.schema as unknown as { name: string; type: string }[])
				: []);

		if (!fields || fields.length === 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Index has no schema fields to reindex",
			});
		}

		try {
			const result = await reindexCollection({
				organizationId: input.organizationId,
				slug: input.slug,
				currentVersion: index.version,
				fields: fields as never,
				defaultSortingField: input.defaultSortingField,
			});

			await updateSearchIndexVersion(index.id, result.newVersion);

			return result;
		} catch (error) {
			logger.error("Reindex failed", { error, slug: input.slug });
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "reindex_failed" });
		}
	});
