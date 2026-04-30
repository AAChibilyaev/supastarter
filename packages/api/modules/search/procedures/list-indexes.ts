import { ORPCError } from "@orpc/client";
import { listSearchIndexesByOwner } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchOwnerMember, SEARCH_OWNER_TYPES, type SearchOwnerInput } from "../lib/access";

export const listIndexes = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes",
		tags: ["Search"],
		summary: "List search indexes",
		description: "Lists all search indexes for the given organization.",
	})
	.input(
		z.object({
			organizationId: z.string().optional(),
			ownerType: z
				.enum([SEARCH_OWNER_TYPES.organization, SEARCH_OWNER_TYPES.user])
				.optional(),
			ownerId: z.string().optional(),
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
		const indexes = await listSearchIndexesByOwner({
			organizationId: owner.ownerId,
		});
		return indexes.map((index) => ({
			id: index.id,
			organizationId: index.organizationId,
			slug: index.slug,
			displayName: index.displayName,
			version: index.version,
			enabled: index.enabled,
			createdAt: index.createdAt,
			updatedAt: index.updatedAt,
			apiKeysCount: index._count.apiKeys,
		}));
	});
