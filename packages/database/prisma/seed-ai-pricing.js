// Seed default AI pricing rules (credit costs per AACsearch feature)
// Uses raw SQL to match the pattern in seed.js
const { Pool } = require("pg");

const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL || "postgresql://postgres:***@localhost:5432/supastarter",
});

const EFFECTIVE_FROM = new Date("2026-05-01T00:00:00.000Z");

const seedRules = [
	// RAG search: 5 credits per turn
	{
		provider: "aacsearch",
		model: "rag",
		operation: "rag_answer",
		flatFeeKopecks: 5n,
		notes: "RAG search — 5 credits per turn (question + answer cycle)",
	},
	// AI Answer (zero-click): 3 credits per answer
	{
		provider: "aacsearch",
		model: "ai_answer",
		operation: "ai_answer",
		flatFeeKopecks: 3n,
		notes: "AI Answer (zero-click) — 3 credits per inline answer card",
	},
	// AI Re-ranking: 1 credit per query
	{
		provider: "aacsearch",
		model: "ai_rerank",
		operation: "rerank",
		flatFeeKopecks: 1n,
		notes: "AI Re-ranking — 1 credit per query",
	},
	// Custom embedding: 1 credit per 1K tokens
	{
		provider: "aacsearch",
		model: "embedding",
		operation: "embedding_tokens_1k",
		flatFeeKopecks: 1n,
		notes: "Custom embedding — 1 credit per 1K tokens",
	},
	// GraphRAG extraction: 5 credits per document
	{
		provider: "aacsearch",
		model: "graphrag",
		operation: "chat",
		flatFeeKopecks: 5n,
		notes: "GraphRAG extraction — 5 credits per document",
	},
	// HyPE indexing: 3 credits per document
	{
		provider: "aacsearch",
		model: "hype",
		operation: "hype_index",
		flatFeeKopecks: 3n,
		notes: "HyPE indexing — 3 credits per document",
	},
	// Web crawler: 2 credits per page
	{
		provider: "aacsearch",
		model: "web_crawler",
		operation: "ai_crawler_extraction",
		flatFeeKopecks: 2n,
		notes: "Web crawler — 2 credits per page",
	},
	// Image embedding: 2 credits per image
	{
		provider: "aacsearch",
		model: "image",
		operation: "embedding",
		flatFeeKopecks: 2n,
		notes: "Image embedding — 2 credits per image",
	},
	// Audio transcription: 5 credits per minute
	{
		provider: "aacsearch",
		model: "audio",
		operation: "chat",
		flatFeeKopecks: 5n,
		notes: "Audio transcription — 5 credits per minute",
	},
	// Chat / file ingest / voice search: 5 credits per operation
	{
		provider: "aacsearch",
		model: "chat",
		operation: "chat",
		flatFeeKopecks: 5n,
		notes: "Chat / file ingest / voice search — 5 credits per operation",
	},
	// Image search (Vision + embedding): 3 credits per query
	{
		provider: "aacsearch",
		model: "image_search",
		operation: "image_search",
		flatFeeKopecks: 3n,
		notes: "Image search (Vision API + embedding) — 3 credits per query",
	},
	// My Search RAG: 5 credits per turn
	{
		provider: "aacsearch",
		model: "my_search",
		operation: "my_search_rag",
		flatFeeKopecks: 5n,
		notes: "My Search RAG — 5 credits per turn",
	},
	// Natural language query: 1 credit per query
	{
		provider: "aacsearch",
		model: "nlq",
		operation: "natural_language_query",
		flatFeeKopecks: 1n,
		notes: "Natural language search query — 1 credit per query",
	},
];

async function main() {
	console.log("Seeding AI pricing rules (credit costs)...");

	const client = await pool.connect();
	try {
		for (const rule of seedRules) {
			const id = require("crypto").randomUUID();
			await client.query(
				`INSERT INTO ai_pricing_rule (
					id, provider, model, operation,
					"flatFeeKopecks", "markupBps",
					"effectiveFrom", "effectiveTo",
					notes, "createdAt"
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
				ON CONFLICT (provider, model, operation, "effectiveFrom")
				DO UPDATE SET
					"flatFeeKopecks" = EXCLUDED."flatFeeKopecks",
					"markupBps" = EXCLUDED."markupBps",
					notes = EXCLUDED.notes`,
				[
					id,
					rule.provider,
					rule.model,
					rule.operation,
					rule.flatFeeKopecks,
					2000, // default 20% markup
					EFFECTIVE_FROM,
					null, // effectiveTo — null = active indefinitely
					rule.notes,
				],
			);
			console.log(
				`  ✓ ${rule.provider}/${rule.model}/${rule.operation} = ${rule.flatFeeKopecks} kopecks`,
			);
		}
		console.log("Seeding complete — 13 AI pricing rules inserted/updated.");
	} finally {
		client.release();
		await pool.end();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
