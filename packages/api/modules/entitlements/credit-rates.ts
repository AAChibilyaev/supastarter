/**
 * Centralized credit rate card for AACsearch paid operations.
 *
 * Every paid operation has a fixed cost in kopecks (1 kopeck = 0.01 RUB).
 * The credit gate middleware (`./middleware/credit-gate.ts`) uses these rates
 * to atomically reserve and deduct from the organization's AiWallet.
 *
 * Matching issue AAC-107: Credits consumption engine.
 *
 * Rate card (from PRD section 12.5):
 *   Operation              | Credits | Kopecks | Notes
 *   -----------------------|---------|---------|--------------------------------------
 *   rag_answer             |       5 |     500 | RAG per turn
 *   ai_answer              |       3 |     300 | AI Answer per answer (zero-click)
 *   rerank                 |       1 |     100 | AI re-ranking per query
 *   embedding              |       2 |     200 | Per image (image-search)
 *   embedding_tokens_1k    |       1 |     100 | Custom embedding per 1K tokens
 *   graphrag_extract       |       5 |     500 | GraphRAG extraction per document
 *   hype_index             |       3 |     300 | HyPE indexing per document
 *   web_crawler_page       |       2 |     200 | Web crawler per crawled page
 *   audio_transcription    |       5 |     500 | Audio transcription per minute
 *   chat                   |       5 |     500 | Chat / file ingest / voice search
 *   my_search_rag          |       5 |     500 | My Search RAG per turn
 *   natural_language_query |       1 |     100 | Natural language search query
 *
 * All values in kopecks. Multiply by (rate_bps / 10000) for markup.
 *
 * Usage:
 *   import { CREDIT_RATES } from "../../entitlements/credit-rates";
 *   .use(creditGate("rag_answer", CREDIT_RATES.rag_answer))
 */

export const CREDIT_RATES = {
	/** RAG conversational search — per turn (5 credits / 500 kopecks) */
	rag_answer: BigInt(500),

	/** AI Answer (zero-click) in search results — per answer (3 credits / 300 kopecks) */
	ai_answer: BigInt(300),

	/** AI re-ranking — per query (1 credit / 100 kopecks) */
	rerank: BigInt(100),

	/** Embedding generation (image/vision) — per image (2 credits / 200 kopecks) */
	embedding: BigInt(200),

	/** Custom embedding per 1K tokens (1 credit / 100 kopecks per 1K tokens) */
	embedding_tokens_1k: BigInt(100),

	/** GraphRAG extraction — per document (5 credits / 500 kopecks) */
	graphrag_extract: BigInt(500),

	/** HyPE indexing — per document (3 credits / 300 kopecks) */
	hype_index: BigInt(300),

	/** Web crawler — per crawled page (2 credits / 200 kopecks) */
	web_crawler_page: BigInt(200),

	/** Audio transcription — per minute (5 credits / 500 kopecks per minute) */
	audio_transcription: BigInt(500),

	/** Image search with Vision API caption → embedding generation — per query (3 credits / 300 kopecks) */
	image_search: BigInt(300),

	/** Chat / file ingest / voice search generic cost — per operation (5 credits / 500 kopecks) */
	chat: BigInt(500),

	/** My Search RAG — per turn (5 credits / 500 kopecks) */
	my_search_rag: BigInt(500),

	/** Natural language search — per query (1 credit / 100 kopecks) */
	natural_language_query: BigInt(100),

	/** Conversational assistant turn — per message (5 credits / 500 kopecks) */
	conversation_turn: BigInt(500),
} as const;

export type CreditOperation = keyof typeof CREDIT_RATES;
