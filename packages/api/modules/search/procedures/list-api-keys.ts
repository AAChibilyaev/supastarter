import { ORPCError } from "@orpc/client";
import { listSearchApiKeys } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import {
	requireSearchIndexByOwner,
	requireSearchOwnerMember,
	SEARCH_OWNER_TYPES,
	type SearchOwnerInput,
} from "../lib/access";
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
			organizationId: z.string().optional(),
			ownerType: z
				.enum([SEARCH_OWNER_TYPES.organization, SEARCH_OWNER_TYPES.user])
				.optional(),
			ownerId: z.string().optional(),
			slug: searchIndexSlugSchema,
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

		await requireSearchOwnerMember(owner, user);
		const index = await requireSearchIndexByOwner(owner, input.slug);
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
