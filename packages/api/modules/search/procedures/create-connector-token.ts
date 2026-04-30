import { createSearchApiKey } from "@repo/database";
import { generateSearchApiKey } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import {
	requireOrganizationAdmin,
	requireSearchIndexByOwner,
	SEARCH_OWNER_TYPES,
	type SearchOwnerInput,
} from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const createConnectorToken = protectedProcedure
	.route({
		method: "POST",
		path: "/search/connector-tokens",
		tags: ["Search"],
		summary: "Create connector token",
		description:
			"Generates a new connector token (ss_connector_* prefix) for an index. The raw key is returned only once.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			name: z.string().min(1).max(120).optional().default("Connector Token"),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		const owner: SearchOwnerInput = {
			ownerType: SEARCH_OWNER_TYPES.organization,
			ownerId: input.organizationId,
		};

		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndexByOwner(owner, input.slug);

		const generated = generateSearchApiKey();
		// Override prefix display to show connector prefix
		const connectorPrefix = `ss_connector_${generated.rawKey.slice(11, 23)}`;

		const created = await createSearchApiKey({
			indexId: index.id,
			organizationId: index.organizationId,
			name: input.name,
			prefix: connectorPrefix,
			hash: generated.hash,
			scopes: ["connector_write"],
		});

		return {
			id: created.id,
			name: created.name,
			prefix: created.prefix,
			scopes: created.scopes,
			expiresAt: created.expiresAt,
			createdAt: created.createdAt,
			rawKey: generated.rawKey.replace("ss_search_", "ss_connector_"),
		};
	});
