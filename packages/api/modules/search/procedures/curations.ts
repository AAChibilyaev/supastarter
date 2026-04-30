import { db, type Prisma } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const curationSchema = z.object({
	query: z.string().min(1).max(500),
	pinnedIds: z.array(z.string()),
	hiddenIds: z.array(z.string()),
});

export const getCurations = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/curations",
		tags: ["Search"],
		summary: "Get curations for a search index",
		description: "Returns the configured curation rules stored in the index schema.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const schema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};
		const curations = Array.isArray((schema as Record<string, unknown>)._curations)
			? (schema as Record<string, unknown>)._curations
			: [];

		return curations as { query: string; pinnedIds: string[]; hiddenIds: string[] }[];
	});

export const updateCurations = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/curations",
		tags: ["Search"],
		summary: "Update curations for a search index",
		description: "Replaces the entire curation rules list stored in the index schema.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			curations: z.array(curationSchema),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const rawSchema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};

		await db.searchIndex.update({
			where: { id: index.id },
			data: {
				schema: {
					...rawSchema,
					_curations: input.curations,
				} as Prisma.InputJsonValue,
			},
		});

		return input.curations;
	});
