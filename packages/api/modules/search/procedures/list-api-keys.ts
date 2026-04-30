import { listSearchApiKeys } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const listApiKeys = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/api-keys",
		tags: ["Search"],
		summary: "List search API keys",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);
		const keys = await listSearchApiKeys(index.id);

		return keys.map((key) => ({
			id: key.id,
			name: key.name,
			prefix: key.prefix,
			scopes: key.scopes,
			expiresAt: key.expiresAt,
			revokedAt: key.revokedAt,
			lastUsedAt: key.lastUsedAt,
			createdAt: key.createdAt,
		}));
	});
