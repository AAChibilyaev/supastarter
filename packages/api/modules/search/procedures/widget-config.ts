import { db, type Prisma } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const widgetConfigSchema = z.object({
	facetFields: z.array(z.string()).default([]),
	defaultSortField: z.string().optional(),
	showPrices: z.boolean().default(true),
	showImages: z.boolean().default(true),
	theme: z.enum(["light", "dark", "auto"]).default("auto"),
});

export const getWidgetConfig = protectedProcedure
	.route({
		method: "GET",
		path: "/search/widget-config/:indexSlug",
		tags: ["Search"],
		summary: "Get widget configuration for a search index",
		description:
			"Returns the widget configuration needed to embed the search widget, including API endpoints, key hints, and saved UI configuration.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			indexSlug: searchIndexSlugSchema,
		}),
	)
	.output(
		z.object({
			baseUrl: z.string(),
			indexSlug: z.string(),
			apiKeyPrefix: z.string(),
			snippet: z.string(),
			config: widgetConfigSchema,
		}),
	)
	.handler(async ({ input }) => {
		const baseUrl = process.env.NEXT_PUBLIC_SAAS_URL ?? "http://localhost:3000";

		const index = await db.searchIndex.findFirst({
			where: {
				slug: input.indexSlug,
				organizationId: input.organizationId,
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

		const rawSchema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};
		const savedConfig = widgetConfigSchema.safeParse(rawSchema._widgetConfig ?? {});
		const config = savedConfig.success ? savedConfig.data : widgetConfigSchema.parse({});

		const facetsAttr = config.facetFields.length > 0 ? config.facetFields.join(",") : undefined;
		const snippet = buildSnippet({
			baseUrl,
			indexSlug: input.indexSlug,
			apiKeyPrefix: apiKey.prefix,
			config,
			facetsAttr,
		});

		return {
			baseUrl,
			indexSlug: input.indexSlug,
			apiKeyPrefix: apiKey.prefix,
			snippet,
			config,
		};
	});

export const saveWidgetConfig = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/widget-config",
		tags: ["Search"],
		summary: "Save widget configuration",
		description: "Persists widget UI configuration (facets, sort, theme) in the index schema.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			config: widgetConfigSchema,
		}),
	)
	.output(z.object({ ok: z.boolean() }))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const rawSchema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};

		await db.searchIndex.update({
			where: { id: index.id },
			data: {
				schema: {
					...rawSchema,
					_widgetConfig: input.config,
				} as Prisma.InputJsonValue,
			},
		});

		return { ok: true };
	});

function buildSnippet({
	baseUrl,
	indexSlug,
	apiKeyPrefix,
	config,
	facetsAttr,
}: {
	baseUrl: string;
	indexSlug: string;
	apiKeyPrefix: string;
	config: { theme: string; defaultSortField?: string; showPrices: boolean; showImages: boolean };
	facetsAttr?: string;
}) {
	const lines = [
		`<script`,
		`  src="${baseUrl}/api/widget/widget.js"`,
		`  data-base-url="${baseUrl}"`,
		`  data-api-key="${apiKeyPrefix}***"`,
		`  data-index-slug="${indexSlug}"`,
		`  data-container="#aac-search"`,
		`  data-theme="${config.theme}"`,
	];
	if (facetsAttr) lines.push(`  data-facets="${facetsAttr}"`);
	if (config.defaultSortField) lines.push(`  data-sort="${config.defaultSortField}"`);
	if (!config.showPrices) lines.push(`  data-show-prices="false"`);
	if (!config.showImages) lines.push(`  data-show-images="false"`);
	lines.push(`></script>`);
	return lines.join("\n");
}
