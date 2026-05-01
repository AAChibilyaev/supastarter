import "server-only";
import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
	if (cachedClient) {
		return cachedClient;
	}

	cachedClient = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY ?? "",
	});

	return cachedClient;
}

const DEFAULT_MODEL = "text-embedding-3-small";

export interface EmbeddingResult {
	vector: number[];
	model: string;
	dimensions: number;
	tokens: number;
}

export async function generateEmbedding(
	text: string,
	model: string = DEFAULT_MODEL,
): Promise<EmbeddingResult> {
	const openai = getOpenAIClient();

	const response = await openai.embeddings.create({
		model,
		input: text,
	});

	const embedding = response.data[0];

	return {
		vector: embedding.embedding,
		model: response.model,
		dimensions: embedding.embedding.length,
		tokens: response.usage?.total_tokens ?? 0,
	};
}

export async function generateEmbeddings(
	texts: string[],
	model: string = DEFAULT_MODEL,
): Promise<EmbeddingResult[]> {
	const openai = getOpenAIClient();

	const response = await openai.embeddings.create({
		model,
		input: texts,
	});

	return response.data.map((embedding) => ({
		vector: embedding.embedding,
		model: response.model,
		dimensions: embedding.embedding.length,
		tokens: response.usage?.total_tokens
			? Math.ceil(response.usage.total_tokens / texts.length)
			: 0,
	}));
}

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

export const EMBEDDING_MODELS = {
	"text-embedding-3-small": {
		name: "text-embedding-3-small",
		dimensions: 1536,
		provider: "openai",
		maxInputTokens: 8191,
	},
	"text-embedding-3-large": {
		name: "text-embedding-3-large",
		dimensions: 3072,
		provider: "openai",
		maxInputTokens: 8191,
	},
	"text-embedding-ada-002": {
		name: "text-embedding-ada-002",
		dimensions: 1536,
		provider: "openai",
		maxInputTokens: 8191,
	},
} as const;

export type EmbeddingModelName = keyof typeof EMBEDDING_MODELS;
