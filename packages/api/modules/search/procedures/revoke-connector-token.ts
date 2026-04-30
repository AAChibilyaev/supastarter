import { ORPCError } from "@orpc/client";
import { getSearchApiKeyById, revokeSearchApiKey } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

export const revokeConnectorToken = protectedProcedure
	.route({
		method: "POST",
		path: "/search/connector-tokens/{keyId}/revoke",
		tags: ["Search"],
		summary: "Revoke connector token",
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

		if (!key.scopes.includes("connector_write")) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Key is not a connector token",
			});
		}

		await revokeSearchApiKey(input.keyId);
		return { revoked: true };
	});
