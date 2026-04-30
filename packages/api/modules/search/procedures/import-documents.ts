import { ORPCError } from "@orpc/client";
import { recordSearchUsage } from "@repo/database";
import { logger } from "@repo/logs";
import { aliasName, bulkUpsert } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const importDocuments = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/import",
		tags: ["Search"],
		summary: "Bulk import documents",
		description: "Bulk upserts documents into the index alias collection.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			documents: z.array(z.record(z.string(), z.unknown())).min(1).max(5000),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		try {
			const result = await bulkUpsert({
				collection: aliasName(input.organizationId, input.slug),
				tenantId: input.organizationId,
				documents: input.documents,
			});

			await recordSearchUsage({
				indexId: index.id,
				organizationId: index.organizationId,
				type: "ingest",
				count: result.successCount,
			});

			return {
				total: result.total,
				successCount: result.successCount,
				failureCount: result.failures.length,
				failures: result.failures.slice(0, 10),
			};
		} catch (error) {
			logger.error("Search import failed", { error });
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
