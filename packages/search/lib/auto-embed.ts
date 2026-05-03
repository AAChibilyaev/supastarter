/**
 * Multi-provider embedding interface for AACsearch.
 *
 * Supports: OpenAI (default), Google Generative AI (Gemini/PaLM).
 * Auto-embedding hooks into the document ingestion pipeline.
 */

import "server-only";

// ─── Provider Interface ──────────────────────────────────────────────────────

export interface EmbeddingProvider {
	name: string;
	generateEmbedding(text: string, model?: string): Promise<EmbeddingResult>;
	generateEmbeddings(texts: string[], model?: string): Promise<EmbeddingResult[]>;
}

export interface EmbeddingResult {
	vector: number[];
	model: string;
	dimensions: number;
	tokens: number;
}

export interface EmbeddingModelDef {
	name: string;
	dimensions: number;
	provider: "openai" | "google" | "vertex" | "azure" | "openai-compatible";
	maxInputTokens: number;
}

// ─── Model Registry ───────────────────────────────────────────────────────────

export const EMBEDDING_MODELS = {
	// OpenAI
	"text-embedding-3-small": {
		name: "text-embedding-3-small",
		dimensions: 1536,
		provider: "openai" as const,
		maxInputTokens: 8191,
	},
	"text-embedding-3-large": {
		name: "text-embedding-3-large",
		dimensions: 3072,
		provider: "openai" as const,
		maxInputTokens: 8191,
	},
	"text-embedding-ada-002": {
		name: "text-embedding-ada-002",
		dimensions: 1536,
		provider: "openai" as const,
		maxInputTokens: 8191,
	},
	// Google / Gemini
	"text-embedding-004": {
		name: "text-embedding-004",
		dimensions: 768,
		provider: "google" as const,
		maxInputTokens: 2048,
	},
	"gemini-embedding-exp-03-07": {
		name: "gemini-embedding-exp-03-07",
		dimensions: 3072,
		provider: "google" as const,
		maxInputTokens: 8192,
	},
	// Azure OpenAI
	"azure/text-embedding-ada-002": {
		name: "azure/text-embedding-ada-002",
		dimensions: 1536,
		provider: "azure" as const,
		maxInputTokens: 8191,
	},
	"azure/text-embedding-3-small": {
		name: "azure/text-embedding-3-small",
		dimensions: 1536,
		provider: "azure" as const,
		maxInputTokens: 8191,
	},
	"azure/text-embedding-3-large": {
		name: "azure/text-embedding-3-large",
		dimensions: 3072,
		provider: "azure" as const,
		maxInputTokens: 8191,
	},
	// GCP Vertex AI
	"vertex/textembedding-gecko@001": {
		name: "vertex/textembedding-gecko@001",
		dimensions: 768,
		provider: "vertex" as const,
		maxInputTokens: 2048,
	},
	"vertex/textembedding-gecko@003": {
		name: "vertex/textembedding-gecko@003",
		dimensions: 768,
		provider: "vertex" as const,
		maxInputTokens: 2048,
	},
	"vertex/text-embedding-004": {
		name: "vertex/text-embedding-004",
		dimensions: 768,
		provider: "vertex" as const,
		maxInputTokens: 2048,
	},
	"vertex/text-embedding-005": {
		name: "vertex/text-embedding-005",
		dimensions: 768,
		provider: "vertex" as const,
		maxInputTokens: 2048,
	},
	"vertex/gemini-embedding-exp-03-07": {
		name: "vertex/gemini-embedding-exp-03-07",
		dimensions: 3072,
		provider: "vertex" as const,
		maxInputTokens: 8192,
	},
	// OpenAI-compatible (Ollama, LM Studio, Together AI, etc.)
	"openai-compatible/nomic-embed-text-v1.5": {
		name: "openai-compatible/nomic-embed-text-v1.5",
		dimensions: 768,
		provider: "openai-compatible" as const,
		maxInputTokens: 8192,
	},
	"openai-compatible/bge-m3": {
		name: "openai-compatible/bge-m3",
		dimensions: 1024,
		provider: "openai-compatible" as const,
		maxInputTokens: 8192,
	},
	"openai-compatible/bge-large-en-v1.5": {
		name: "openai-compatible/bge-large-en-v1.5",
		dimensions: 1024,
		provider: "openai-compatible" as const,
		maxInputTokens: 512,
	},
} satisfies Record<string, EmbeddingModelDef>;

export type EmbeddingModelName = keyof typeof EMBEDDING_MODELS;

// ─── Provider Resolution ──────────────────────────────────────────────────────

function getModelDef(model: string): EmbeddingModelDef {
	const def = EMBEDDING_MODELS[model as EmbeddingModelName];
	if (!def) {
		// Accept any model with openai-compatible/ prefix dynamically
		if (model.startsWith("openai-compatible/")) {
			return {
				name: model,
				dimensions: 1536,
				provider: "openai-compatible" as const,
				maxInputTokens: 8192,
			};
		}
		// Accept any model with vertex/ prefix dynamically
		if (model.startsWith("vertex/")) {
			return {
				name: model,
				dimensions: 768,
				provider: "vertex" as const,
				maxInputTokens: 2048,
			};
		}
		throw new Error(`Unknown embedding model: ${model}`);
	}
	return def;
}

// ─── Field Detection for Auto-Embedding ───────────────────────────────────────

/**
 * Default text fields considered for auto-embedding.
 * Scans document keys for common text field names.
 */
export const AUTO_EMBED_FIELDS = [
	"title",
	"description",
	"text",
	"content",
	"body",
	"summary",
	"name",
	"long_description",
	"full_text",
	"metadata",
	"keywords",
	"caption",
] as const;

export type AutoEmbedField = (typeof AUTO_EMBED_FIELDS)[number];

/**
 * Detect the best text field from a document for auto-embedding.
 * Prioritizes title > description > content > first long text field.
 */
export function detectEmbeddingField(document: Record<string, unknown>): string | null {
	const order = [
		"title",
		"description",
		"text",
		"content",
		"body",
		"summary",
		"name",
		"long_description",
	];

	for (const field of order) {
		const val = document[field];
		if (typeof val === "string" && val.trim().length > 0) {
			return field;
		}
	}

	// Fallback: pick the first string field with length > 20 chars
	for (const [key, val] of Object.entries(document)) {
		if (typeof val === "string" && val.trim().length > 20) {
			return key;
		}
	}

	return null;
}

/**
 * Auto-generate embedding text from a document by concatenating
 * the most relevant text fields.
 */
export function buildEmbeddingText(
	document: Record<string, unknown>,
	maxLength = 8000,
): string | null {
	const parts: string[] = [];

	const priorityFields = ["title", "description", "content", "text", "summary", "body"];
	for (const field of priorityFields) {
		const val = document[field];
		if (typeof val === "string" && val.trim().length > 0) {
			parts.push(val.trim());
		}
	}

	if (parts.length === 0) {
		// Pick the longest string field
		let longest = "";
		for (const val of Object.values(document)) {
			if (typeof val === "string" && val.length > longest.length) {
				longest = val;
			}
		}
		if (longest.length > 0) parts.push(longest.trim());
	}

	if (parts.length === 0) return null;

	const combined = parts.join(". ");
	return combined.length > maxLength ? combined.slice(0, maxLength) : combined;
}
