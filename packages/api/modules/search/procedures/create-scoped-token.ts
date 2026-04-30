import { ORPCError } from "@orpc/client";
import { getSearchApiKeyById } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";
import { issueScopedSearchToken } from "../lib/scoped-token";

export const createScopedToken = protectedProcedure
	.route({
		method: "POST",
		path: "/search/keys/{keyId}/scoped-token",
		tags: ["Search"],
		summary: "Issue a short-lived scoped search token",
		description:
			"Wraps an existing search API key with an embedded `filter_by` that the public search endpoint will enforce. Useful for B2B2C widgets where each end-user must only see their own subset.",
	})
	.input(
		z.object({
			keyId: z.string(),
			parentRawKey: z.string().min(8),
			filterBy: z.string().min(1).max(2_000),
			expiresInSeconds: z.number().int().min(30).max(86_400).default(3_600),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		const apiKey = await getSearchApiKeyById(input.keyId);
		if (!apiKey) throw new ORPCError("NOT_FOUND");
		await requireOrganizationMember(apiKey.organizationId, user.id);

		const { token, expiresAt } = issueScopedSearchToken({
			keyId: apiKey.id,
			parentRawKey: input.parentRawKey,
			filterBy: input.filterBy,
			expiresInSeconds: input.expiresInSeconds,
		});

		return { token, expiresAt };
	});
