import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationAdmin } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const stemOverrideSchema = z.object({
	word: z.string().min(1).max(255),
	root: z.string().min(1).max(255),
});

export const deleteStemmingOverride = protectedProcedure
	.route({
		method: "DELETE",
		path: "/search/indexes/{slug}/stemming/{word}",
		tags: ["Search"],
		summary: "Delete a stemming override",
		description: "Removes a single stemming dictionary entry by its word key.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			word: z.string().min(1).max(255),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			word: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		await requireSearchIndex(input.organizationId, input.slug);

		const client = getTypesenseClient();
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await (client as any).collections(input.slug).stemming().delete(input.word);
			return { success: true, word: input.word };
		} catch {
			return { success: false, word: input.word };
		}
	});

export const listStemmingOverrides = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/stemming",
		tags: ["Search"],
		summary: "List stemming overrides for a search index",
		description: "Returns the configured stemming dictionary overrides.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(z.array(stemOverrideSchema))
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		await requireSearchIndex(input.organizationId, input.slug);

		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = (await (client as any).collections(input.slug).stemming().retrieve()) as any;

		const words = (result?.words ?? []) as string[];
		return words.map((word: string) => ({
			word,
			root: (result?.roots?.[word] ?? word) as string,
		}));
	});

export const upsertStemmingOverride = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/stemming",
		tags: ["Search"],
		summary: "Create or update a stemming override",
		description: "Adds or updates a stemming dictionary entry for the index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			word: z.string().min(1).max(255),
			root: z.string().min(1).max(255),
		}),
	)
	.output(stemOverrideSchema)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		await requireSearchIndex(input.organizationId, input.slug);

		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (client as any).collections(input.slug).stemming().upsert(input.word, {
			root: input.root,
		});

		return { word: input.word, root: input.root };
	});
