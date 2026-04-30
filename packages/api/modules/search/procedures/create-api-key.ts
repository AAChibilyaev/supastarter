import { ORPCError } from "@orpc/client";
import { createSearchApiKey } from "@repo/database";
import { generateSearchApiKey } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import {
	requireSearchIndexByOwner,
	requireSearchOwnerAdmin,
	SEARCH_OWNER_TYPES,
	type SearchOwnerInput,
} from "../lib/access";
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
			organizationId: z.string().optional(),
			ownerType: z
				.enum([SEARCH_OWNER_TYPES.organization, SEARCH_OWNER_TYPES.user])
				.optional(),
			ownerId: z.string().optional(),
			slug: searchIndexSlugSchema,
			name: z.string().min(1).max(120),
			scopes: z.array(searchApiKeyScopeSchema).min(1),
			allowedOrigins: z.array(z.string().min(3).max(255)).max(20).optional(),
			rateLimitPerMinute: z.number().int().min(1).max(60_000).optional(),
			expiresAt: z.iso.datetime().optional(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		const owner: SearchOwnerInput =
			input.ownerType && input.ownerId
				? { ownerType: input.ownerType, ownerId: input.ownerId }
				: {
						ownerType: SEARCH_OWNER_TYPES.organization,
						ownerId: input.organizationId ?? "",
					};
		if (!owner.ownerId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "ownerId or organizationId is required",
			});
		}

		await requireSearchOwnerAdmin(owner, user);
		const index = await requireSearchIndexByOwner(owner, input.slug);

		const generated = generateSearchApiKey();
		const created = await createSearchApiKey({
			indexId: index.id,
			organizationId: index.organizationId,
			name: input.name,
			prefix: generated.prefix,
			hash: generated.hash,
			scopes: input.scopes,
			allowedOrigins: input.allowedOrigins,
			rateLimitPerMinute: input.rateLimitPerMinute,
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
