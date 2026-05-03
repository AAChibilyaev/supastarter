/**
 * Natural Language Search — converts natural language queries into
 * structured Typesense filter expressions using LLM (OpenAI).
 *
 * Example:
 *   "red shoes under $50 from Nike size 10" →
 *   { query: "shoes", filter_by: "color:=red && price:<50 && brand:=Nike && size:=10" }
 */

import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireSearchIndex, requireOrganizationMember } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

// Cache the OpenAI import to avoid repeated dynamic imports
let openaiModule: typeof import("openai") | null = null;

async function getOpenAI() {
	if (!openaiModule) {
		openaiModule = await import("openai");
	}
	return openaiModule;
}

const hitSchema = z.object({
	document: z.record(z.string(), z.unknown()),
	textMatch: z.string().optional(),
});

export const naturalLanguageSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/natural-language-search",
		tags: ["Search"],
		summary: "Natural language search with LLM-powered filter extraction",
		description:
			"Accepts a natural language query (e.g. 'red shoes under $50'), uses an LLM to extract structured filters, " +
			"then performs a text search with those filters applied.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			query: z.string().min(1).max(500),
			queryBy: z.string().default("title,description"),
			perPage: z.number().int().min(1).max(250).default(20),
			page: z.number().int().min(1).default(1),
			model: z.string().default("gpt-4o-mini"),
			schema: z
				.array(
					z.object({
						field: z.string(),
						type: z.enum([
							"string",
							"int32",
							"int64",
							"float",
							"bool",
							"string[]",
						]),
						facet: z.boolean().optional(),
					}),
				)
				.optional()
				.describe(
					"Optional schema of searchable fields to guide LLM filter extraction",
				),
		}),
	)
	.output(
		z.object({
			originalQuery: z.string(),
			extractedQuery: z.string(),
			filterBy: z.string().optional(),
			naturalLanguageExplanation: z.string(),
			found: z.number(),
			hits: z.array(hitSchema),
			searchTimeMs: z.number(),
			llmTimeMs: z.number(),
			extractedFilters: z.array(
				z.object({
					field: z.string(),
					operator: z.string(),
					value: z.string(),
				}),
			),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const startTime = Date.now();

		// Phase 1: Extract structured filters from natural language using LLM
		const schemaContext = input.schema
			? `\nAvailable search fields: ${JSON.stringify(input.schema)}`
			: "";

		const systemPrompt = `You are a search query parser. Convert natural language search queries into structured filters.

Rules:
1. Extract a refined search query (remove filter words like prices, brands, colors)
2. Extract explicit filter conditions as {field, operator, value} tuples
3. Support operators: := (equals), :< (less than), :> (greater than), :<=, :>=, :!= (not equals)
4. For ranges like "under $50" use price:<50, "over $100" use price:>100
5. For negative filters like "without leather" use material:!=leather
6. Combine operators: "from $10 to $50" = price:>=10 && price:<=50
7. For text/category matches use := (e.g. color:=red, brand:=nike)
8. Return EXPLANATION in the same language as the query${schemaContext}

Respond ONLY with valid JSON:
{
  "query": "the refined search keywords",
  "filters": [
    {"field": "field_name", "operator": ":=", "value": "value"}
  ],
  "explanation": "brief explanation of what was understood"
}`;

		const OpenAI = await getOpenAI().then((m) => m.default);
		const openai = new OpenAI();

		const completion = await openai.chat.completions.create({
			model: input.model,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: input.query },
			],
			response_format: { type: "json_object" },
			temperature: 0.1,
			max_tokens: 500,
		});

		const llmTimeMs = Date.now() - startTime;

		const rawContent = completion.choices[0]?.message?.content ?? "{}";
		let parsed: {
			query?: string;
			filters?: Array<{
				field: string;
				operator: string;
				value: string;
			}>;
			explanation?: string;
		} = {};

		try {
			parsed = JSON.parse(rawContent);
		} catch {
			// If LLM output isn't valid JSON, fall through with defaults
		}

		const extractedQuery = parsed.query?.trim() || input.query;
		const extractedFilters = parsed.filters ?? [];
		const explanation = parsed.explanation ?? "";

		// Build Typesense filter_by string
		const filterBy = extractedFilters
			.map((f) => `${f.field}${f.operator}${f.value}`)
			.join(" && ");

		// Phase 2: Execute the search with extracted filters
		const client = getTypesenseClient();
		const searchStartTime = Date.now();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const results = (await client
			.collections(index.slug)
			.documents()
			.search({
				q: extractedQuery,
				query_by: input.queryBy,
				filter_by: filterBy || undefined,
				per_page: input.perPage,
				page: input.page,
			} as any)) as any;

		const searchTimeMs = Date.now() - searchStartTime;

		return {
			originalQuery: input.query,
			extractedQuery,
			filterBy: filterBy || undefined,
			naturalLanguageExplanation: explanation,
			found: results.found ?? 0,
			hits: ((results.hits ?? []) as any[]).map((hit: any) => ({
				document: hit.document as Record<string, unknown>,
				textMatch: hit.text_match_info?.snippet as string | undefined,
			})),
			searchTimeMs,
			llmTimeMs,
			extractedFilters,
		};
	});
