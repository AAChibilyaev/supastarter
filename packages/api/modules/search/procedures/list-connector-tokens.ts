import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

export const listConnectorTokens = protectedProcedure
	.route({
		method: "GET",
		path: "/search/connector-tokens",
		tags: ["Search"],
		summary: "List connector tokens",
		description: "Returns all connector_write-scoped API keys for an organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.array(
			z.object({
				id: z.string(),
				name: z.string(),
				prefix: z.string(),
				scopes: z.array(z.string()),
				expiresAt: z.date().nullable(),
				revokedAt: z.date().nullable(),
				lastUsedAt: z.date().nullable(),
				createdAt: z.date(),
				index: z
					.object({
						id: z.string(),
						slug: z.string(),
						displayName: z.string(),
					})
					.nullable(),
			}),
		),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const keys = await db.searchApiKey.findMany({
			where: {
				organizationId,
				scopes: { has: "connector_write" },
			},
			include: {
				index: { select: { id: true, slug: true, displayName: true } },
			},
			orderBy: { createdAt: "desc" },
		});

		return keys.map((key) => ({
			id: key.id,
			name: key.name,
			prefix: key.prefix,
			scopes: key.scopes,
			expiresAt: key.expiresAt,
			revokedAt: key.revokedAt,
			lastUsedAt: key.lastUsedAt,
			createdAt: key.createdAt,
			index: key.index,
		}));
	});
