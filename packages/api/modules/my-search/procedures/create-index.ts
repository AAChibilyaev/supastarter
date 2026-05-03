import { ORPCError } from "@orpc/client";
import { createPersonalSearchIndex, getPersonalSearchIndexBySlug } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const createIndex = protectedProcedure
	.route({
		method: "POST",
		path: "/my-search/indexes",
		tags: ["My Search"],
		summary: "Create a personal search index",
		description: "Creates a new personal search index for the user's documents.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]*$/),
			displayName: z.string().min(1).max(120),
		}),
	)
	.output(
		z.object({
			id: z.string(),
			slug: z.string(),
			displayName: z.string(),
			version: z.number(),
			createdAt: z.date(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAccess(input.organizationId, user.id);

		const existing = await getPersonalSearchIndexBySlug(
			input.organizationId,
			input.slug,
		);
		if (existing) {
			throw new ORPCError("CONFLICT", {
				message: "An index with this slug already exists",
			});
		}

		const index = await createPersonalSearchIndex({
			organizationId: input.organizationId,
			slug: input.slug,
			displayName: input.displayName,
			createdByUserId: user.id,
		});

		logger.info(`Personal search index created: ${index.id} (${input.slug})`);

		return {
			id: index.id,
			slug: index.slug,
			displayName: index.displayName,
			version: index.version,
			createdAt: index.createdAt,
		};
	});
