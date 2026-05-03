import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { physicalCollectionName, truncateCollection } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const truncateIndex = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/truncate",
		tags: ["Search"],
		summary: "Truncate search index",
		description:
			"Deletes all documents from the index while preserving the schema. Requires a confirmPhrase matching the index slug for safety.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			confirmPhrase: z.string(),
		}),
	)
	.output(
		z.object({
			truncated: z.literal(true),
			slug: z.string(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		// Safety: confirmPhrase must match the index slug
		if (input.confirmPhrase !== input.slug) {
			throw new ORPCError("BAD_REQUEST", {
				message: "confirm_phrase_mismatch",
			});
		}

		try {
			const collectionName = physicalCollectionName(
				input.organizationId,
				input.slug,
				index.version,
			);
			await truncateCollection(collectionName);
		} catch (error) {
			logger.error("Failed to truncate search index", {
				error,
				organizationId: input.organizationId,
				slug: input.slug,
				indexId: index.id,
			});
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "truncate_index_failed",
			});
		}

		return {
			truncated: true,
			slug: index.slug,
		};
	});
