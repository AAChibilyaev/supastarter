import { estimateTokens } from "@repo/ai-core";
import { logger } from "@repo/logs";

/**
 * Default RAG configuration per knowledge space.
 */
export interface RagConfig {
	/** Maximum tokens for the output response (answer) */
	maxOutputTokens: number;
	/** Maximum tokens for total context (retrieved chunks) */
	maxContextTokens: number;
	/** Minimum confidence score (0-1) below which we return "I don't know" */
	minConfidence: number;
	/** Number of chunks to retrieve per query */
	retrievalLimit: number;
	/** Custom system prompt override — if empty uses default */
	systemPrompt: string;
	/** Whether to include GraphRAG edges in context */
	includeGraphEdges: boolean;
	/** Model to use for generation (overrides default) */
	model?: string;
}

export const RAG_CONFIG_DEFAULTS: RagConfig = {
	maxOutputTokens: 1024,
	maxContextTokens: 8000,
	minConfidence: 0.35,
	retrievalLimit: 8,
	systemPrompt: "",
	includeGraphEdges: true,
};

/**
 * Build RAG context from retrieved chunks, respecting token budget.
 * Truncates context to fit within maxContextTokens, keeping the highest-scoring chunks.
 */
export function buildRagContext(
	chunks: Array<{
		id: string;
		documentId: string;
		documentTitle: string;
		text: string;
		score: number;
	}>,
	maxTokens: number,
): {
	contextText: string;
	usedChunks: typeof chunks;
} {
	// Sort by score descending, then accumulate within budget
	const sorted = [...chunks].sort((a, b) => b.score - a.score);

	let totalTokens = 0;
	const used: typeof chunks = [];
	const parts: string[] = [];

	for (const chunk of sorted) {
		const formatted = `[${used.length + 1}] ${chunk.documentTitle}\nScore: ${chunk.score.toFixed(3)}\n${chunk.text}`;
		const tokenCount = estimateTokens(formatted);

		if (totalTokens + tokenCount > maxTokens) {
			// Stop if adding this chunk would exceed budget
			break;
		}

		parts.push(formatted);
		totalTokens += tokenCount;
		used.push(chunk);
	}

	logger.debug(
		`[RAG] Context built: ${used.length}/${chunks.length} chunks, ~${totalTokens} tokens`,
	);

	return {
		contextText: parts.join("\n\n"),
		usedChunks: used,
	};
}

/**
 * Calculate RAG confidence based on retrieval scores.
 * Returns 0-1 score indicating confidence in the retrieved context.
 *
 * High confidence: top chunk score > 0.7 AND average score across top 3 > 0.5
 * Medium confidence: top chunk score > 0.4
 * Low confidence: everything else
 */
export function calculateConfidence(chunks: Array<{ score: number }>): number {
	if (chunks.length === 0) return 0;

	const topScore = chunks[0]!.score;
	const top3Avg =
		chunks.slice(0, 3).reduce((sum, c) => sum + c.score, 0) / Math.min(chunks.length, 3);

	const chunkCountBonus = Math.min(chunks.length / 5, 1) * 0.1;
	return Math.min(topScore * 0.5 + top3Avg * 0.4 + chunkCountBonus, 1);
}

/**
 * Default fallback message when retrieval confidence is too low.
 */
export const FALLBACK_LOW_CONFIDENCE =
	"I could not find supporting knowledge in this space yet. Upload data sources or files first.";

/**
 * Prompt template variables supported in system prompts.
 *
 * Available variables:
 *  - {{question}}  — the user's current query
 *  - {{context}}   — the formatted RAG context (snippets with scores)
 *  - {{history}}   — the conversation history as formatted text
 *  - {{chunks}}    — raw chunk text (document title + text per chunk)
 */
export type PromptTemplateVars = {
	question: string;
	context: string;
	history?: string;
	chunks?: string;
};

/**
 * Replace template variables in a prompt string.
 * Uses simple `{{varName}}` syntax. Unknown variables are left as-is.
 *
 * @example
 * buildPromptTemplate("Answer: {{question}}", { question: "What is RAG?" })
 * // → "Answer: What is RAG?"
 */
export function buildPromptTemplate(template: string, vars: PromptTemplateVars): string {
	let result = template;
	for (const [key, value] of Object.entries(vars)) {
		if (value !== undefined) {
			result = result.replaceAll(`{{${key}}}`, value);
		}
	}
	return result;
}

/**
 * Format conversation history into a readable text block for prompt injection.
 */
export function formatHistory(
	history: Array<{ role: "user" | "assistant"; content: string }>,
): string {
	if (!history || history.length === 0) return "";
	return history
		.map((msg) => `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`)
		.join("\n");
}

/**
 * Default system prompt for RAG.
 */
export function buildDefaultSystemPrompt(includeGraphEdges: boolean): string {
	const parts = [
		"You are AACsearch RAG assistant.",
		"Answer using only provided context snippets.",
		"If context is insufficient, explicitly say so.",
		"Always cite snippet numbers in the answer - for example: [Source 1], [Source 2].",
		"Do not make up information that is not in the context.",
	];

	if (includeGraphEdges) {
		parts.push(
			"When relevant, mention relationships between entities found in the knowledge graph.",
		);
	}

	return parts.join("\n");
}

/**
 * Validate query token count and return error message if over limit.
 */
export function validateQueryTokens(query: string, maxQueryTokens: number = 2000): string | null {
	const tokens = estimateTokens(query);
	if (tokens > maxQueryTokens) {
		return `Query exceeds maximum token limit of ${maxQueryTokens}. Current: ~${tokens} tokens.`;
	}
	return null;
}

/**
 * Merge user-provided RAG config with defaults.
 */
export function mergeRagConfig(overrides: Partial<RagConfig>): RagConfig {
	return { ...RAG_CONFIG_DEFAULTS, ...overrides };
}
