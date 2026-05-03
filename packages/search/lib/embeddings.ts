/**
 * AACsearch Embedding Engine — multi-provider text embedding.
 *
 * Supported providers:
 *   - OpenAI (default): text-embedding-3-small / 3-large / ada-002
 *   - Google Generative AI: text-embedding-004, gemini-embedding-exp-03-07
 *
 * Auto-embedding: when documents are ingested, embeddings can be auto-generated
 * and stored in the Typesense document for vector search.
 */

import "server-only";
import { logger } from "@repo/logs";
import OpenAI from "openai";

import {
	type EmbeddingModelDef,
	type EmbeddingModelName,
	type EmbeddingResult,
	EMBEDDING_MODELS,
} from "./auto-embed";

export type { EmbeddingModelName, EmbeddingResult };
export { EMBEDDING_MODELS } from "./auto-embed";
export { detectEmbeddingField, buildEmbeddingText, AUTO_EMBED_FIELDS } from "./auto-embed";

// ─── OpenAI Provider ──────────────────────────────────────────────────────────

let cachedOpenAIClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
	if (cachedOpenAIClient) return cachedOpenAIClient;
	cachedOpenAIClient = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY ?? "",
	});
	return cachedOpenAIClient;
}

async function openaiEmbedding(text: string, model: string): Promise<EmbeddingResult> {
	const client = getOpenAIClient();
	const response = await client.embeddings.create({ model, input: text });
	const embedding = response.data[0];
	return {
		vector: embedding.embedding,
		model: response.model,
		dimensions: embedding.embedding.length,
		tokens: response.usage?.total_tokens ?? 0,
	};
}

async function openaiEmbeddings(texts: string[], model: string): Promise<EmbeddingResult[]> {
	const client = getOpenAIClient();
	const response = await client.embeddings.create({ model, input: texts });
	return response.data.map((embedding) => ({
		vector: embedding.embedding,
		model: response.model,
		dimensions: embedding.embedding.length,
		tokens: response.usage?.total_tokens
			? Math.ceil(response.usage.total_tokens / texts.length)
			: 0,
	}));
}

// ─── Google Generative AI (Gemini/PaLM) Provider ──────────────────────────────

let cachedGoogleClient: unknown = null;

// Google Generative Language API key
const GOOGLE_API_KEY = process.env.GOOGLE_GENAI_API_KEY ?? "";

/**
 * Call Google's embedding API directly via REST.
 * Supports: text-embedding-004, gemini-embedding-exp-03-07
 */
async function googleEmbedding(text: string, model: string): Promise<EmbeddingResult> {
	if (!GOOGLE_API_KEY) {
		throw new Error("GOOGLE_GENAI_API_KEY not set");
	}

	// Google embedding API endpoint
	// https://ai.google.dev/api/embeddings
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${GOOGLE_API_KEY}`;

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: `models/${model}`,
			content: { parts: [{ text }] },
		}),
	});

	if (!response.ok) {
		const errText = await response.text().catch(() => "unknown");
		throw new Error(`Google embedding API error ${response.status}: ${errText}`);
	}

	const data = (await response.json()) as {
		embedding?: { values?: number[] };
	};

	if (!data.embedding?.values) {
		throw new Error(`Google embedding API: no embedding in response`);
	}

	const def = getModelDef(model);
	return {
		vector: data.embedding.values,
		model,
		dimensions: data.embedding.values.length,
		tokens: Math.ceil(text.length / 4), // rough estimate: ~4 chars per token
	};
}

/**
 * Batch embedding via sequential calls (Google doesn't support native batching).
 */
async function googleEmbeddings(texts: string[], model: string): Promise<EmbeddingResult[]> {
	const results: EmbeddingResult[] = [];
	for (let i = 0; i < texts.length; i++) {
		const result = await googleEmbedding(texts[i], model);
		results.push(result);
	}
	return results;
}

// ─── Provider Router ──────────────────────────────────────────────────────────

function getModelDef(model: string): EmbeddingModelDef {
	const def = EMBEDDING_MODELS[model as EmbeddingModelName];
	if (!def) {
		throw new Error(
			`Unknown embedding model: ${model}. Available: ${Object.keys(EMBEDDING_MODELS).join(", ")}`,
		);
	}
	return def;
}

/**
 * Generate a single embedding using the appropriate provider for the model.
 */
export async function generateEmbedding(
	text: string,
	model: string = "text-embedding-3-small",
): Promise<EmbeddingResult> {
	const def = getModelDef(model);

	switch (def.provider) {
		case "openai":
			return openaiEmbedding(text, model);
		case "google":
			return googleEmbedding(text, model);
		default:
			throw new Error(`Unsupported embedding provider: ${def.provider}`);
	}
}

/**
 * Generate multiple embeddings (batch) using the appropriate provider.
 */
export async function generateEmbeddings(
	texts: string[],
	model: string = "text-embedding-3-small",
): Promise<EmbeddingResult[]> {
	if (texts.length === 0) return [];

	const def = getModelDef(model);

	switch (def.provider) {
		case "openai":
			return openaiEmbeddings(texts, model);
		case "google":
			return googleEmbeddings(texts, model);
		default:
			throw new Error(`Unsupported embedding provider: ${def.provider}`);
	}
}

/**
 * Format a Typesense vector_query parameter from an embedding vector.
 */
export function formatVectorQuery(
	vector: number[],
	field: string = "embedding",
	k: number = 10,
	flatCutoff: number | undefined = undefined,
	distance: "cosine" | "ip" | "l2" = "cosine",
): string {
	let query = `${field}:(${vector.join(", ")}, k:${k}, distance:${distance}`;
	if (flatCutoff !== undefined) {
		query += `, flat_search_cutoff:${flatCutoff}`;
	}
	query += ")";
	return query;
}

// ─── Auto-Embedding Pipeline ──────────────────────────────────────────────────

/**
 * Configuration for auto-embedding on a collection.
 */
export interface AutoEmbedConfig {
	enabled: boolean;
	model: EmbeddingModelName;
	sourceField: string;
	targetField: string;
}

const DEFAULT_AUTO_EMBED_CONFIG: AutoEmbedConfig = {
	enabled: true,
	model: "text-embedding-3-small",
	sourceField: "auto",
	targetField: "embedding",
};

/**
 * Auto-generate an embedding for a single document during ingestion.
 * Modifies the document in-place by adding the embedding field.
 *
 * @returns The generated embedding, or null if skipped.
 */
export async function autoEmbedDocument(
	document: Record<string, unknown>,
	config: Partial<AutoEmbedConfig> = {},
): Promise<EmbeddingResult | null> {
	const cfg = { ...DEFAULT_AUTO_EMBED_CONFIG, ...config };

	// Determine what text to embed
	let text: string | null = null;

	if (cfg.sourceField === "auto") {
		text = buildEmbeddingText(document);
	} else {
		const val = document[cfg.sourceField];
		if (typeof val === "string" && val.trim().length > 0) {
			text = val.trim();
		}
	}

	if (!text) return null;

	try {
		const result = await generateEmbedding(text, cfg.model);
		document[cfg.targetField] = result.vector;
		return result;
	} catch (err) {
		logger.warn({ err, model: cfg.model }, "autoEmbedDocument failed");
		return null;
	}
}

/**
 * Auto-generate embeddings for a batch of documents during ingestion.
 * Modifies documents in-place. Non-blocking: failures are logged, not thrown.
 */
export async function autoEmbedDocuments(
	documents: Record<string, unknown>[],
	config: Partial<AutoEmbedConfig> = {},
): Promise<{ embedded: number; skipped: number; failed: number }> {
	const cfg = { ...DEFAULT_AUTO_EMBED_CONFIG, ...config };
	let embedded = 0;
	let skipped = 0;
	let failed = 0;

	const textsToEmbed: Array<{ doc: Record<string, unknown>; text: string }> = [];

	for (const doc of documents) {
		let text: string | null = null;

		if (cfg.sourceField === "auto") {
			text = buildEmbeddingText(doc);
		} else {
			const val = doc[cfg.sourceField];
			if (typeof val === "string" && val.trim().length > 0) {
				text = val.trim();
			}
		}

		if (!text) {
			skipped++;
			continue;
		}

		textsToEmbed.push({ doc, text });
	}

	if (textsToEmbed.length === 0) {
		return { embedded: 0, skipped: documents.length, failed: 0 };
	}

	try {
		const results = await generateEmbeddings(
			textsToEmbed.map((t) => t.text),
			cfg.model,
		);

		for (let i = 0; i < results.length; i++) {
			textsToEmbed[i].doc[cfg.targetField] = results[i].vector;
			embedded++;
		}
	} catch (err) {
		// Batch failed — fall back to sequential with per-document error handling
		logger.warn({ err }, "batch autoEmbedDocuments failed, falling back to sequential");

		for (const { doc, text } of textsToEmbed) {
			try {
				const result = await generateEmbedding(text, cfg.model);
				doc[cfg.targetField] = result.vector;
				embedded++;
			} catch {
				failed++;
			}
		}
	}

	return { embedded, skipped, failed };
}
