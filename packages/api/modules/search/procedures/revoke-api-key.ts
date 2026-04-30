import { ORPCError } from "@orpc/client";
import { getSearchApiKeyById, revokeSearchApiKey } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

export const revokeApiKey = protectedProcedure
	.route({
		method: "POST",
		path: "/search/api-keys/{keyId}/revoke",
		tags: ["Search"],
		summary: "Revoke search API key",
	})
	.input(
		z.object({
			organizationId: z.string(),
			keyId: z.string(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const key = await getSearchApiKeyById(input.keyId);
		if (!key || key.organizationId !== input.organizationId) {
			throw new ORPCError("NOT_FOUND");
		}

		await revokeSearchApiKey(input.keyId);
		return { revoked: true };
	});
