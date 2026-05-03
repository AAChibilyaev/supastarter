import { aliasName, exportDocuments } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const exportIndexDocuments = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/documents/export",
		tags: ["Search"],
		summary: "Export documents from an index",
		description:
			"Exports all documents from a search index, with optional filtering. Returns parsed JSON documents.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			filterBy: z.string().optional(),
			perPage: z.number().int().min(1).max(1000).optional(),
			format: z.enum(["json", "jsonl"]).optional().default("json"),
		}),
	)
	.output(
		z.object({
			total: z.number(),
			documents: z.array(z.record(z.string(), z.unknown())),
			parseFailures: z.number(),
			indexId: z.string(),
		}),
	)
	.handler(
		async ({
			input: { organizationId, slug, filterBy, perPage, format: _format },
			context: { user },
		}) => {
			await requireOrganizationMember(organizationId, user.id);
			const index = await requireSearchIndex(organizationId, slug);

			const alias = aliasName(organizationId, slug);

			const result = await exportDocuments({
				collection: alias,
				filterBy,
				perPage,
			});

			return {
				total: result.total,
				documents: result.documents,
				parseFailures: result.parseFailures,
				indexId: index.id,
			};
		},
	);
