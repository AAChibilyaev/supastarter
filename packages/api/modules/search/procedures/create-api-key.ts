import { createSearchApiKey } from "@repo/database";
import { generateSearchApiKey } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchApiKeyScopeSchema, searchIndexSlugSchema } from "../types";

export const createApiKey = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/api-keys",
		tags: ["Search"],
		summary: "Create search API key",
		description:
			"Generates a new SaaS search API key. The raw key is returned only once and never stored.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			name: z.string().min(1).max(120),
			scopes: z.array(searchApiKeyScopeSchema).min(1),
			expiresAt: z.iso.datetime().optional(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const generated = generateSearchApiKey();
		const created = await createSearchApiKey({
			indexId: index.id,
			organizationId: index.organizationId,
			name: input.name,
			prefix: generated.prefix,
			hash: generated.hash,
			scopes: input.scopes,
			expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
		});

		return {
			id: created.id,
			name: created.name,
			prefix: created.prefix,
			scopes: created.scopes,
			expiresAt: created.expiresAt,
			createdAt: created.createdAt,
			rawKey: generated.rawKey,
		};
	});
