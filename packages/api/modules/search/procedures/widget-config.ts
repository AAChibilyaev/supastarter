import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const getWidgetConfig = protectedProcedure
	.route({
		method: "GET",
		path: "/search/widget-config/:indexSlug",
		tags: ["Search"],
		summary: "Get widget configuration for a search index",
		description:
			"Returns the widget configuration needed to embed the search widget, including API endpoints and key hints.",
	})
	.input(
		z.object({
			indexSlug: z.string(),
		}),
	)
	.output(
		z.object({
			baseUrl: z.string(),
			indexSlug: z.string(),
			apiKeyPrefix: z.string(),
			snippet: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		const baseUrl = process.env.NEXT_PUBLIC_SAAS_URL ?? "http://localhost:3000";

		// Find the first API key for this index that has search scope
		const index = await db.searchIndex.findFirst({
			where: {
				slug: input.indexSlug,
				organizationId: context.session.activeOrganizationId ?? undefined,
			},
			include: {
				apiKeys: {
					where: {
						revokedAt: null,
						scopes: { has: "search" },
					},
					take: 1,
					orderBy: { createdAt: "desc" },
				},
			},
		});

		if (!index) {
			throw new Error("Index not found");
		}

		const apiKey = index.apiKeys[0];

		if (!apiKey) {
			throw new Error(
				"No search API key found for this index. Create an API key with search scope first.",
			);
		}

		const snippet = `<script
  src="${baseUrl}/api/widget/widget.js"
  data-base-url="${baseUrl}"
  data-api-key="${apiKey.prefix}***"
  data-index-slug="${input.indexSlug}"
  data-container="#aac-search"
  data-theme="auto"
></script>`;

		return {
			baseUrl,
			indexSlug: input.indexSlug,
			apiKeyPrefix: apiKey.prefix,
			snippet,
		};
	});
