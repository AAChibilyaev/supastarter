import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationAdmin } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const deleteStopwords = protectedProcedure
	.route({
		method: "DELETE",
		path: "/search/indexes/{slug}/stopwords",
		tags: ["Search"],
		summary: "Delete all stopwords for a search index",
		description: "Removes the entire stopwords configuration for the index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		await requireSearchIndex(input.organizationId, input.slug);

		const client = getTypesenseClient();
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await (client as any).collections(input.slug).stopwords().delete();
			return { success: true };
		} catch {
			return { success: false };
		}
	});

export const listStopwords = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/stopwords",
		tags: ["Search"],
		summary: "List stopwords for a search index",
		description: "Returns the configured stopwords list for the index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(
		z.object({
			stopwords: z.array(z.string()),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		await requireSearchIndex(input.organizationId, input.slug);

		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = (await (client as any).collections(input.slug).stopwords().retrieve()) as any;

		const stopwords = (result?.stopwords ?? []) as string[];
		return { stopwords };
	});

export const upsertStopwords = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/stopwords",
		tags: ["Search"],
		summary: "Update stopwords for a search index",
		description: "Replaces the entire stopwords list for the index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			stopwords: z.array(z.string().min(1).max(100)),
		}),
	)
	.output(
		z.object({
			stopwords: z.array(z.string()),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		await requireSearchIndex(input.organizationId, input.slug);

		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (client as any).collections(input.slug).stopwords().upsert({
			stopwords: input.stopwords,
		});

		return { stopwords: input.stopwords };
	});
