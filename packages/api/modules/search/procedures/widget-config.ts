import { db, type Prisma } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

const facetConfigSchema = z.object({
	fieldName: z.string(),
	displayName: z.string(),
	sortOrder: z.enum(["count", "alpha"]).default("count"),
	maxValues: z.number().min(1).max(1000).default(10),
	multiSelect: z.boolean().default(true),
	type: z.enum(["checkbox", "range", "toggle", "select"]).default("checkbox"),
	collapsible: z.boolean().default(true),
	rangeMin: z.number().optional(),
	rangeMax: z.number().optional(),
	numberFormat: z.enum(["number", "currency", "custom"]).optional(),
	customFormat: z.string().optional(),
});

const widgetConfigSchema = z.object({
	facetFields: z.array(z.string()).default([]),
	facetConfigs: z.array(facetConfigSchema).default([]),
	defaultSortField: z.string().optional(),
	showPrices: z.boolean().default(true),
	showImages: z.boolean().default(true),
	theme: z.enum(["light", "dark", "auto"]).default("auto"),
	queryBy: z.array(z.string()).default([]),
	placeholder: z.string().default("Search..."),
	resultsPerPage: z.number().min(5).max(50).default(20),
	showThumbnails: z.boolean().default(true),
	showSearchButton: z.boolean().default(true),
	searchButtonText: z.string().default("Search"),
	accentColor: z.string().default("#6366f1"),
	keyboardShortcut: z.boolean().default(true),
	// Autocomplete settings
	autocompleteEnabled: z.boolean().default(true),
	autocompleteSource: z.enum(["analytics", "instant"]).default("analytics"),
	autocompleteResults: z.number().min(3).max(10).default(5),
	autocompleteDebounce: z.number().min(100).max(500).default(200),
	autocompleteMinQuery: z.number().min(1).max(3).default(2),
	autocompleteThumbnails: z.boolean().default(false),
	autocompleteHighlight: z.boolean().default(true),
	autocompleteRecent: z.boolean().default(false),
	// Voice search settings
	voiceEnabled: z.boolean().default(false),
	voiceLanguage: z.string().default("auto"),
	voiceTrigger: z.enum(["mic", "doubleTap"]).default("mic"),
	voiceFallbackMessage: z.string().default(""),
	// Chat assistant settings
	chatEnabled: z.boolean().default(false),
	chatAssistantName: z.string().default(""),
	widgetMode: z.enum(["search", "chat", "hybrid"]).default("search"),
	// AI Search features
	aiAnswers: z.boolean().default(false),
	imageSearch: z.boolean().default(false),
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
	config: {
		theme: string;
		defaultSortField?: string;
		showPrices: boolean;
		showImages: boolean;
		placeholder: string;
		resultsPerPage: number;
		showThumbnails: boolean;
		showSearchButton: boolean;
		searchButtonText: string;
		accentColor: string;
		keyboardShortcut: boolean;
		queryBy?: string[];
		chatEnabled?: boolean;
		chatAssistantName?: string;
		widgetMode?: string;
		aiAnswers?: boolean;
		imageSearch?: boolean;
	};
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
		`  data-placeholder="${config.placeholder}"`,
		`  data-results-per-page="${config.resultsPerPage}"`,
		`  data-accent-color="${config.accentColor}"`,
	];
	if (config.queryBy && config.queryBy.length > 0)
		lines.push(`  data-query-by="${config.queryBy.join(",")}"`);
	if (!config.showThumbnails) lines.push(`  data-show-thumbnails="false"`);
	if (!config.showSearchButton) lines.push(`  data-show-search-button="false"`);
	if (config.searchButtonText !== "Search")
		lines.push(`  data-search-button-text="${config.searchButtonText}"`);
	if (!config.keyboardShortcut) lines.push(`  data-keyboard-shortcut="false"`);
	if (facetsAttr) lines.push(`  data-facets="${facetsAttr}"`);
	if (config.defaultSortField) lines.push(`  data-sort="${config.defaultSortField}"`);
	if (!config.showPrices) lines.push(`  data-show-prices="false"`);
	if (!config.showImages) lines.push(`  data-show-images="false"`);
	if (config.widgetMode && config.widgetMode !== "search")
		lines.push(`  data-widget-mode="${config.widgetMode}"`);
	if (config.chatEnabled) lines.push(`  data-chat-enabled="true"`);
	if (config.chatAssistantName) lines.push(`  data-assistant-name="${config.chatAssistantName}"`);
	if (config.aiAnswers) lines.push(`  data-ai-answers="true"`);
	if (config.imageSearch) lines.push(`  data-image-search="true"`);
	lines.push(`></script>`);
	return lines.join("\n");
}
