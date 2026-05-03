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
	AUTO_EMBED_FIELDS,
	buildEmbeddingText,
	detectEmbeddingField,
} from "./auto-embed";

export type { EmbeddingModelName, EmbeddingResult };
export {
	EMBEDDING_MODELS,
	AUTO_EMBED_FIELDS,
	buildEmbeddingText,
	detectEmbeddingField,
} from "./auto-embed";

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

// ─── Azure OpenAI Provider ─────────────────────────────────────────────────────

function getAzureApiKey(): string {
	return process.env.AZURE_OPENAI_API_KEY ?? "";
}

function getAzureApiUrl(): string {
	return process.env.AZURE_OPENAI_API_URL ?? "";
}

function getAzureApiVersion(): string {
	return process.env.AZURE_OPENAI_API_VERSION ?? "2024-02-01";
}

let cachedAzureOpenAIClient: OpenAI | null = null;

export function getAzureOpenAIClient(): OpenAI {
	if (cachedAzureOpenAIClient) return cachedAzureOpenAIClient;
	const apiKey = getAzureApiKey();
	const apiUrl = getAzureApiUrl();
	const apiVersion = getAzureApiVersion();
	if (!apiKey) {
		throw new Error("AZURE_OPENAI_API_KEY not set");
	}
	if (!apiUrl) {
		throw new Error("AZURE_OPENAI_API_URL not set");
	}
	cachedAzureOpenAIClient = new OpenAI({
		apiKey,
		baseURL: apiUrl,
		defaultQuery: { "api-version": apiVersion },
	});
	return cachedAzureOpenAIClient;
}

/**
 * Strip the "azure/" prefix from model names for Azure API calls.
 * Azure uses the base model name (e.g. "text-embedding-ada-002").
 */
function toAzureDeploymentName(model: string): string {
	return model.replace(/^azure\//, "");
}

async function azureEmbedding(text: string, model: string): Promise<EmbeddingResult> {
	const client = getAzureOpenAIClient();
	const deployment = toAzureDeploymentName(model);
	const response = await client.embeddings.create({ model: deployment, input: text });
	const embedding = response.data[0];
	return {
		vector: embedding.embedding,
		model: response.model,
		dimensions: embedding.embedding.length,
		tokens: response.usage?.total_tokens ?? 0,
	};
}

async function azureEmbeddings(texts: string[], model: string): Promise<EmbeddingResult[]> {
	const client = getAzureOpenAIClient();
	const deployment = toAzureDeploymentName(model);
	const response = await client.embeddings.create({ model: deployment, input: texts });
	return response.data.map((embedding) => ({
		vector: embedding.embedding,
		model: response.model,
		dimensions: embedding.embedding.length,
		tokens: response.usage?.total_tokens
			? Math.ceil(response.usage.total_tokens / texts.length)
			: 0,
	}));
}

// ─── GCP Vertex AI (PaLM / Gecko / Gemini) Provider ────────────────────────────

interface GcpServiceAccount {
	type: string;
	project_id: string;
	private_key_id: string;
	private_key: string;
	client_email: string;
	client_id: string;
	auth_uri: string;
	token_uri: string;
}

/**
 * Get the GCP service account credentials from environment variable.
 */
function getGcpServiceAccount(): GcpServiceAccount {
	const raw = process.env.GCP_SERVICE_ACCOUNT_JSON;
	if (!raw) {
		throw new Error(
			"GCP_SERVICE_ACCOUNT_JSON not set — provide the full service account JSON string",
		);
	}
	try {
		return JSON.parse(raw) as GcpServiceAccount;
	} catch {
		throw new Error("GCP_SERVICE_ACCOUNT_JSON is not valid JSON");
	}
}

/**
 * Generate a JWT assertion and exchange it for a GCP OAuth2 access token.
 * Uses Node.js built-in crypto (RS256 sign). No external dependencies.
 */
let cachedGcpToken: { token: string; expiresAt: number } | null = null;

async function getGcpAccessToken(): Promise<string> {
	if (cachedGcpToken && cachedGcpToken.expiresAt > Date.now() + 60_000) {
		return cachedGcpToken.token;
	}

	const sa = getGcpServiceAccount();

	// Build JWT header + payload
	const header = { alg: "RS256" as const, typ: "JWT" as const };
	const now = Math.floor(Date.now() / 1000);
	const payload = {
		iss: sa.client_email,
		scope: "https://www.googleapis.com/auth/cloud-platform",
		aud: sa.token_uri,
		exp: now + 3600,
		iat: now,
	};

	const base64Url = (obj: Record<string, unknown>): string =>
		Buffer.from(JSON.stringify(obj)).toString("base64url").replace(/=+$/, "");

	const signatureInput = `${base64Url(header)}.${base64Url(payload)}`;

	// Sign with RSA-SHA256 using the service account's private key
	const crypto = await import("node:crypto");
	const sign = crypto.createSign("RSA-SHA256");
	sign.update(signatureInput);
	sign.end();
	const signature = sign.sign(sa.private_key, "base64url");

	const jwt = `${signatureInput}.${signature}`;

	// Exchange JWT for access token
	const tokenResponse = await fetch(sa.token_uri, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: jwt,
		}),
	});

	if (!tokenResponse.ok) {
		const errText = await tokenResponse.text().catch(() => "unknown");
		throw new Error(`GCP OAuth2 token exchange failed ${tokenResponse.status}: ${errText}`);
	}

	const tokenData = (await tokenResponse.json()) as {
		access_token: string;
		expires_in?: number;
	};

	cachedGcpToken = {
		token: tokenData.access_token,
		expiresAt: now + (tokenData.expires_in ?? 3600),
	};

	return cachedGcpToken.token;
}

/**
 * Strip the "vertex/" prefix from model names for Vertex AI calls.
 */
function toVertexModelName(model: string): string {
	return model.replace(/^vertex\//, "");
}

/**
 * Call GCP Vertex AI embedding API for a single text.
 */
async function vertexEmbedding(
	text: string,
	model: string,
	projectId?: string,
	region?: string,
): Promise<EmbeddingResult> {
	const sa = getGcpServiceAccount();
	const project = projectId ?? sa.project_id;
	const gcpRegion = region ?? process.env.GCP_REGION ?? "us-central1";
	const accessToken = await getGcpAccessToken();
	const actualModel = toVertexModelName(model);

	const url = `https://${gcpRegion}-aiplatform.googleapis.com/v1/projects/${project}/locations/${gcpRegion}/publishers/google/models/${actualModel}:predict`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			instances: [{ content: text }],
		}),
	});

	if (!response.ok) {
		const errText = await response.text().catch(() => "unknown");
		throw new Error(`Vertex AI embedding API error ${response.status}: ${errText}`);
	}

	const data = (await response.json()) as {
		predictions?: Array<{
			embeddings?: {
				values?: number[];
				statistics?: { token_count?: number };
			};
		}>;
	};

	const prediction = data.predictions?.[0];
	const values = prediction?.embeddings?.values;
	if (!values) {
		throw new Error("Vertex AI embedding API: no embedding in response");
	}

	const tokenCount = prediction.embeddings?.statistics?.token_count ?? 0;

	return {
		vector: values,
		model,
		dimensions: values.length,
		tokens: tokenCount,
	};
}

/**
 * Batch embedding via sequential calls (Vertex AI doesn't support
 * native batching for text embedding models in the predict endpoint).
 */
async function vertexEmbeddings(
	texts: string[],
	model: string,
	projectId?: string,
	region?: string,
): Promise<EmbeddingResult[]> {
	// For efficiency, batch up to 5 texts per call where supported
	const batchSize = 5;
	const results: EmbeddingResult[] = [];

	for (let i = 0; i < texts.length; i += batchSize) {
		const batch = texts.slice(i, i + batchSize);

		if (batch.length === 1) {
			results.push(await vertexEmbedding(batch[0], model, projectId, region));
			continue;
		}

		const sa = getGcpServiceAccount();
		const project = projectId ?? sa.project_id;
		const gcpRegion = region ?? process.env.GCP_REGION ?? "us-central1";
		const accessToken = await getGcpAccessToken();
		const actualModel = toVertexModelName(model);

		const url = `https://${gcpRegion}-aiplatform.googleapis.com/v1/projects/${project}/locations/${gcpRegion}/publishers/google/models/${actualModel}:predict`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				instances: batch.map((t) => ({ content: t })),
			}),
		});

		if (!response.ok) {
			// Fall back to sequential for this batch
			for (const t of batch) {
				results.push(await vertexEmbedding(t, model, projectId, region));
			}
			continue;
		}

		const data = (await response.json()) as {
			predictions?: Array<{
				embeddings?: {
					values?: number[];
					statistics?: { token_count?: number };
				};
			}>;
		};

		for (const prediction of data.predictions ?? []) {
			const values = prediction?.embeddings?.values;
			if (values) {
				results.push({
					vector: values,
					model,
					dimensions: values.length,
					tokens: prediction.embeddings?.statistics?.token_count ?? 0,
				});
			}
		}
	}

	return results;
}

// ─── OpenAI-Compatible Provider (Ollama, LM Studio, Together AI, etc.) ─────

/**
 * Create an OpenAI SDK client pointed at an OpenAI-compatible API.
 * Only model name is required — baseURL and apiKey come from env vars
 * or can be configured per-index via the model config.
 */
export function getOpenaiCompatibleClient(apiUrl?: string, apiKey?: string): OpenAI {
	return new OpenAI({
		apiKey: apiKey ?? process.env.OPENAI_COMPATIBLE_API_KEY ?? "",
		baseURL: apiUrl ?? process.env.OPENAI_COMPATIBLE_API_URL ?? "http://localhost:11434/v1",
	});
}

/**
 * Strip the "openai-compatible/" prefix from model names for API calls.
 * The actual model name is what follows the prefix (e.g. "nomic-embed-text-v1.5").
 */
function toOpenaiCompatibleModelName(model: string): string {
	return model.replace(/^openai-compatible\//, "");
}

async function openaiCompatibleEmbedding(
	text: string,
	model: string,
	apiUrl?: string,
	apiKey?: string,
): Promise<EmbeddingResult> {
	const client = getOpenaiCompatibleClient(apiUrl, apiKey);
	const actualModel = toOpenaiCompatibleModelName(model);
	const response = await client.embeddings.create({ model: actualModel, input: text });
	const embedding = response.data[0];
	return {
		vector: embedding.embedding,
		model: response.model,
		dimensions: embedding.embedding.length,
		tokens: response.usage?.total_tokens ?? 0,
	};
}

async function openaiCompatibleEmbeddings(
	texts: string[],
	model: string,
	apiUrl?: string,
	apiKey?: string,
): Promise<EmbeddingResult[]> {
	const client = getOpenaiCompatibleClient(apiUrl, apiKey);
	const actualModel = toOpenaiCompatibleModelName(model);
	const response = await client.embeddings.create({ model: actualModel, input: texts });
	return response.data.map((embedding) => ({
		vector: embedding.embedding,
		model: response.model,
		dimensions: embedding.embedding.length,
		tokens: response.usage?.total_tokens
			? Math.ceil(response.usage.total_tokens / texts.length)
			: 0,
	}));
}

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
		case "azure":
			return azureEmbedding(text, model);
		case "vertex":
			return vertexEmbedding(text, model);
		case "openai-compatible":
			return openaiCompatibleEmbedding(text, model);
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
		case "azure":
			return azureEmbeddings(texts, model);
		case "vertex":
			return vertexEmbeddings(texts, model);
		case "openai-compatible":
			return openaiCompatibleEmbeddings(texts, model);
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
