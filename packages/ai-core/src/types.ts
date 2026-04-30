export type AiProvider =
	| "openai"
	| "anthropic"
	| "groq"
	| "deepseek"
	| "yandexgpt"
	| "gigachat"
	| "openrouter"
	| (string & {});

export type AiOperation =
	| "chat"
	| "completion"
	| "embedding"
	| "rewrite"
	| "rerank"
	| "rag_answer"
	| "answer_summarization"
	| "classification"
	| "auto_synonym_generation"
	| "ai_crawler_extraction"
	| "conversation_turn";

export interface PricingRuleSnapshot {
	id: string;
	provider: AiProvider;
	model: string;
	operation: AiOperation;
	currency: "RUB";
	inputPer1MTokensKopecks: bigint | null;
	outputPer1MTokensKopecks: bigint | null;
	embeddingPer1MTokensKopecks: bigint | null;
	flatFeeKopecks: bigint;
	markupBps: number;
	effectiveFrom: Date;
	effectiveTo: Date | null;
}

export interface CostEstimateInput {
	promptTokens: number;
	maxOutputTokens: number;
	flatFeeKopecks?: bigint;
}

export interface CostBreakdown {
	inputCostKopecks: bigint;
	outputCostKopecks: bigint;
	flatFeeKopecks: bigint;
	markupBps: number;
	totalChargeKopecks: bigint;
	providerCostUsdMicros: bigint;
	fxRateRubPerUsdMicros: bigint;
}

export interface AiCallContext {
	walletId: string;
	userId: string | null;
	organizationId: string | null;
	projectId?: string | null;
	apiKeyId?: string | null;
	operation: AiOperation;
	provider: AiProvider;
	model: string;
	requestId: string;
	idempotencyKey: string;
	flatFeeKopecks?: bigint;
}
