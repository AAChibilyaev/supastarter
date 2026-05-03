/**
 * GraphRAG — LLM-powered recommendations with natural language explanations.
 *
 * How it works:
 * 1. Query Neo4j for product graph connections (similar, same-category, also-bought)
 * 2. Extract structured context: categories, attributes, neighbor prices
 * 3. Form enriched prompt for OpenAI (gpt-4o-mini)
 * 4. Return recommendations with natural language explanations
 */

import { type Driver } from "neo4j-driver";

import { query } from "./neo4j-client";
import { GRAPH_RAG_CONTEXT, GRAPH_RAG_MULTI_SEED } from "./queries.cypher";

export interface GraphRagInput {
	/** Primary product ID to get recommendations for */
	productId: string;
	/** Optional: additional seed product IDs for multi-seed mode (e.g. user's recent views) */
	additionalSeedIds?: string[];
	/** Max recommendations to return */
	limit?: number;
	/** Optional context hint to guide the LLM (e.g. "budget-friendly", "eco-friendly") */
	preferenceHint?: string;
}

export interface GraphRagResult {
	recommendations: Array<{
		id: string;
		title: string;
		explanation: string;
		relevanceScore: number;
		connectionType: string;
	}>;
	summary: string;
	context: {
		productTitle: string;
		productCategory: string;
		neighborCount: number;
	};
	llmUsed: boolean;
}

export interface GraphRagMultiSeedResult {
	recommendations: Array<{
		id: string;
		title: string;
		explanation: string;
		relevanceScore: number;
		connectedTo: string[];
	}>;
	summary: string;
	llmUsed: boolean;
}

/**
 * Build enriched context from Neo4j graph neighborhood for a product.
 */
async function fetchGraphContext(
	productId: string,
	driver?: Driver,
): Promise<{
	productTitle: string;
	productCategory: string;
	similar: Array<{ id: string; title: string; score: number }>;
	sameCategory: Array<{ id: string; title: string }>;
	alsoBought: Array<{ id: string; title: string; score: number }>;
}> {
	const result = await query(GRAPH_RAG_CONTEXT, { productId }, driver);

	if (result.records.length === 0) {
		return {
			productTitle: "Unknown",
			productCategory: "",
			similar: [],
			sameCategory: [],
			alsoBought: [],
		};
	}

	const record = result.records[0];

	const similar = (
		record.get("similarProducts") as Array<{
			id: string;
			title: string;
			score: number;
		}>
	).filter((s) => s.id);

	const sameCategory = (
		record.get("sameCategory") as Array<{
			id: string;
			title: string;
		}>
	).filter((s) => s.id);

	const alsoBought = (
		record.get("alsoBought") as Array<{
			id: string;
			title: string;
			score: number;
		}>
	).filter((s) => s.id);

	return {
		productTitle: (record.get("title") as string) ?? "Unknown",
		productCategory: (record.get("category") as string) ?? "",
		similar,
		sameCategory,
		alsoBought,
	};
}

/**
 * Build enriched context from Neo4j for multiple seed products.
 */
async function fetchMultiSeedContext(
	productIds: string[],
	driver?: Driver,
): Promise<
	Array<{
		seedProductId: string;
		seedTitle: string;
		recommendations: Array<{ id: string; title: string; score: number; relation: string }>;
	}>
> {
	const result = await query(GRAPH_RAG_MULTI_SEED, { productIds }, driver);

	return result.records.map((record) => {
		const recs = (
			record.get("recommendations") as Array<{
				id: string;
				title: string;
				score: number;
				relation: string;
			}>
		).filter((r) => r.id);

		return {
			seedProductId: record.get("seedProductId") as string,
			seedTitle: record.get("seedTitle") as string,
			recommendations: recs,
		};
	});
}

/**
 * Format graph context into a structured text prompt for the LLM.
 */
function formatContextPrompt(input: {
	productTitle: string;
	productCategory: string;
	similar: Array<{ id: string; title: string; score: number }>;
	sameCategory: Array<{ id: string; title: string }>;
	alsoBought: Array<{ id: string; title: string; score: number }>;
	limit: number;
	preferenceHint?: string;
}): string {
	const parts: string[] = [
		"You are AACsearch's recommendation AI. Your task is to recommend products based on graph connections.",
		"",
		`Product: "${input.productTitle}"`,
		input.productCategory ? `Category: ${input.productCategory}` : "",
		"",
	];

	if (input.similar.length > 0) {
		parts.push("--- Similar Products (content-based similarity) ---");
		for (const s of input.similar.slice(0, 10)) {
			parts.push(`  - "${s.title}" (id: ${s.id}) — similarity score: ${s.score.toFixed(2)}`);
		}
		parts.push("");
	}

	if (input.sameCategory.length > 0) {
		parts.push("--- Same Category Products ---");
		for (const s of input.sameCategory.slice(0, 10)) {
			parts.push(`  - "${s.title}" (id: ${s.id})`);
		}
		parts.push("");
	}

	if (input.alsoBought.length > 0) {
		parts.push("--- Also Bought Together ---");
		for (const s of input.alsoBought.slice(0, 10)) {
			parts.push(`  - "${s.title}" (id: ${s.id}) — co-purchase score: ${s.score.toFixed(2)}`);
		}
		parts.push("");
	}

	parts.push("--- Task ---");
	parts.push(`Select the best ${input.limit} recommendations for this product. For each, provide:`);
	parts.push("1. The product ID");
	parts.push("2. A natural language explanation of WHY this is recommended (1-2 sentences)");
	parts.push("3. A relevance score from 0.0 to 1.0");
	parts.push("4. The connection type: 'similar_content', 'category_match', or 'purchase_pattern'");
	parts.push("");
	parts.push("Format your response as a JSON object:");
	parts.push(
		'{"recommendations":[{"id":"...","explanation":"...","relevanceScore":0.85,"connectionType":"similar_content"}],"summary":"Brief 1-sentence overview of recommendations"}',
	);
	parts.push("");
	parts.push("Only include recommendations from the products listed above.");
	parts.push("Do NOT invent products not in the list.");
	parts.push("If no suitable recommendations exist, return an empty recommendations array.");

	if (input.preferenceHint) {
		parts.push("");
		parts.push(`User preference hint: ${input.preferenceHint}`);
		parts.push("Prioritize products matching this preference.");
	}

	return parts.join("\n");
}

/**
 * Format multi-seed context into a structured text prompt for the LLM.
 */
function formatMultiSeedPrompt(input: {
	seeds: Array<{
		seedProductId: string;
		seedTitle: string;
		recommendations: Array<{ id: string; title: string; score: number; relation: string }>;
	}>;
	limit: number;
	preferenceHint?: string;
}): string {
	const parts: string[] = [
		"You are AACsearch's recommendation AI. Your task is to recommend products based on user activity and graph connections.",
		"",
		"The user has viewed or purchased the following products:",
		"",
	];

	for (const seed of input.seeds) {
		parts.push(`Product: "${seed.seedTitle}" (id: ${seed.seedProductId})`);
		if (seed.recommendations.length > 0) {
			for (const rec of seed.recommendations.slice(0, 5)) {
				parts.push(
					`  - "${rec.title}" (id: ${rec.id}) — type: ${rec.relation}, score: ${(rec.score ?? 0.5).toFixed(2)}`,
				);
			}
		}
		parts.push("");
	}

	parts.push("--- Task ---");
	parts.push(
		`Select the best ${input.limit} recommendations based on all seed products. For each, provide:`,
	);
	parts.push("1. The product ID");
	parts.push("2. A natural language explanation of WHY this is recommended (1-2 sentences)");
	parts.push("3. A relevance score from 0.0 to 1.0");
	parts.push("4. Which seed product(s) led to this recommendation");
	parts.push("");
	parts.push("Format your response as a JSON object:");
	parts.push(
		'{"recommendations":[{"id":"...","explanation":"...","relevanceScore":0.85,"connectedTo":["seedId1","seedId2"]}],"summary":"Brief 1-sentence overview"}',
	);
	parts.push("");
	parts.push("Only include recommendations from the products listed above.");
	parts.push("Do NOT invent products not in the list.");
	parts.push("Deduplicate — if the same product appears for multiple seeds, include it once.");

	if (input.preferenceHint) {
		parts.push("");
		parts.push(`User preference hint: ${input.preferenceHint}`);
		parts.push("Prioritize products matching this preference.");
	}

	return parts.join("\n");
}

/**
 * Parse LLM JSON response safely, with fallback.
 */
function parseLlmResponse(text: string): {
	recommendations: Array<{
		id: string;
		explanation: string;
		relevanceScore: number;
		connectionType?: string;
		connectedTo?: string[];
	}>;
	summary: string;
} | null {
	try {
		// Try to extract JSON from markdown code blocks first
		const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
		const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
		const parsed = JSON.parse(jsonStr);

		return {
			recommendations: Array.isArray(parsed.recommendations)
				? parsed.recommendations.slice(0, 20)
				: [],
			summary:
				typeof parsed.summary === "string"
					? parsed.summary
					: "Recommended for you based on graph connections.",
		};
	} catch {
		return null;
	}
}

/**
 * Generate GraphRAG recommendations for a product.
 * Uses Neo4j graph context + OpenAI LLM for natural language explanations.
 *
 * Falls back to graph data without LLM if OpenAI is unavailable.
 */
export async function getGraphRagRecommendations(
	input: GraphRagInput,
	driver?: Driver,
	fetchLlm?: (prompt: string) => Promise<string>,
): Promise<GraphRagResult> {
	const { productId, additionalSeedIds, limit = 8, preferenceHint } = input;

	// 1. Fetch graph context for primary product
	const context = await fetchGraphContext(productId, driver);

	// If additional seed IDs provided, fetch their context too
	const additionalContexts = additionalSeedIds?.length
		? await Promise.all(
				additionalSeedIds.map((seedId) => fetchGraphContext(seedId, driver).catch(() => null)),
			)
		: [];

	const allNeighbors = [
		...context.similar,
		...context.sameCategory,
		...context.alsoBought,
		...additionalContexts.flatMap((ctx) =>
			ctx ? [...ctx.similar, ...ctx.sameCategory, ...ctx.alsoBought] : [],
		),
	];

	if (allNeighbors.length === 0) {
		return {
			recommendations: [],
			summary: "No graph connections found for this product.",
			context: {
				productTitle: context.productTitle,
				productCategory: context.productCategory,
				neighborCount: 0,
			},
			llmUsed: false,
		};
	}

	// 2. Try LLM-powered recommendations
	if (fetchLlm) {
		try {
			const prompt = formatContextPrompt({
				productTitle: context.productTitle,
				productCategory: context.productCategory,
				similar: context.similar,
				sameCategory: context.sameCategory,
				alsoBought: context.alsoBought,
				limit,
				preferenceHint,
			});

			const llmResponse = await fetchLlm(prompt);
			const parsed = parseLlmResponse(llmResponse);

			if (parsed && parsed.recommendations.length > 0) {
				// Validate that recommended IDs are in our graph results
				const validIds = new Set(allNeighbors.map((n) => n.id));
				const validatedRecs = parsed.recommendations.filter((r) => validIds.has(r.id));

				if (validatedRecs.length > 0) {
					return {
						recommendations: validatedRecs.slice(0, limit).map((r) => ({
							id: r.id,
							title: allNeighbors.find((n) => n.id === r.id)?.title ?? r.id,
							explanation: r.explanation,
							relevanceScore: r.relevanceScore,
							connectionType: r.connectionType ?? "graph_connection",
						})),
						summary: parsed.summary,
						context: {
							productTitle: context.productTitle,
							productCategory: context.productCategory,
							neighborCount: allNeighbors.length,
						},
						llmUsed: true,
					};
				}
			}
		} catch {
			// LLM failed — fall through to graph-based fallback
		}
	}

	// 3. Fallback: sort graph results by score
	const scored = allNeighbors
		.filter((n): n is typeof n & { score: number } => "score" in n)
		.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
		.slice(0, limit);

	return {
		recommendations: scored.map((n) => ({
			id: n.id,
			title: n.title,
			explanation: preferenceHint
				? `Recommended based on ${"score" in n ? "similarity" : "category"} match${preferenceHint ? ` (${preferenceHint})` : ""}.`
				: `Recommended based on ${"score" in n ? "content similarity" : "same category"}.`,
			relevanceScore: n.score ?? 0.5,
			connectionType: "score" in n ? "similar_content" : "category_match",
		})),
		summary: `Discovered ${allNeighbors.length} related products for "${context.productTitle}".`,
		context: {
			productTitle: context.productTitle,
			productCategory: context.productCategory,
			neighborCount: allNeighbors.length,
		},
		llmUsed: false,
	};
}

/**
 * Generate GraphRAG recommendations from multiple seed products (e.g. user's recent views).
 */
export async function getMultiSeedGraphRagRecommendations(
	input: {
		productIds: string[];
		limit?: number;
		preferenceHint?: string;
	},
	driver?: Driver,
	fetchLlm?: (prompt: string) => Promise<string>,
): Promise<GraphRagMultiSeedResult> {
	const { productIds, limit = 8, preferenceHint } = input;

	if (productIds.length === 0) {
		return {
			recommendations: [],
			summary: "No seed products provided.",
			llmUsed: false,
		};
	}

	// 1. Fetch multi-seed graph context
	const seeds = await fetchMultiSeedContext(productIds, driver);

	const allRecs = seeds.flatMap((s) => s.recommendations);

	if (allRecs.length === 0) {
		return {
			recommendations: [],
			summary: "No graph connections found from the provided products.",
			llmUsed: false,
		};
	}

	// 2. Try LLM
	if (fetchLlm) {
		try {
			const prompt = formatMultiSeedPrompt({
				seeds,
				limit,
				preferenceHint,
			});

			const llmResponse = await fetchLlm(prompt);
			const parsed = parseLlmResponse(llmResponse);

			if (parsed && parsed.recommendations.length > 0) {
				const validIds = new Set(allRecs.map((r) => r.id));
				const validatedRecs = parsed.recommendations.filter((r) => validIds.has(r.id));

				if (validatedRecs.length > 0) {
					return {
						recommendations: validatedRecs.slice(0, limit).map((r) => {
							const seedLinks = seeds
								.filter((s) => s.recommendations.some((rec) => rec.id === r.id))
								.map((s) => s.seedTitle);

							return {
								id: r.id,
								title:
									allRecs.find((n) => n.id === r.id)?.title ??
									seeds
										.find((s) => s.recommendations.some((rec) => rec.id === r.id))
										?.recommendations.find((rec) => rec.id === r.id)?.title ??
									r.id,
								explanation: r.explanation,
								relevanceScore: r.relevanceScore,
								connectedTo: r.connectedTo ?? seedLinks,
							};
						}),
						summary: parsed.summary,
						llmUsed: true,
					};
				}
			}
		} catch {
			// Fall through
		}
	}

	// 3. Fallback: deduplicate and sort
	const seen = new Set<string>();
	const deduped = allRecs.filter((r) => {
		if (seen.has(r.id)) return false;
		seen.add(r.id);
		return true;
	});

	const scored = deduped.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);

	return {
		recommendations: scored.map((r) => {
			const connectedSeeds = seeds
				.filter((s) => s.recommendations.some((rec) => rec.id === r.id))
				.map((s) => s.seedTitle);

			return {
				id: r.id,
				title: r.title,
				explanation: `Found across ${connectedSeeds.length} product${connectedSeeds.length !== 1 ? "s" : ""} you viewed.`,
				relevanceScore: r.score ?? 0.5,
				connectedTo: connectedSeeds,
			};
		}),
		summary: `Discovered ${deduped.length} unique product connections from ${productIds.length} seed product${productIds.length !== 1 ? "s" : ""}.`,
		llmUsed: false,
	};
}
