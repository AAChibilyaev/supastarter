import { logger } from "@repo/logs";

export type AssistantMode =
	| "product_consultation"
	| "service"
	| "expert_advice"
	| "outfit"
	| "size_help"
	| "bundle";

interface ClassificationResult {
	mode: AssistantMode;
	confidence: number;
	source: "rule" | "llm" | "default";
}

// Russian + English keyword patterns for fast-path classification
const SERVICE_PATTERNS = [
	/заказ\s*[№#\d]/i,
	/мой заказ/i,
	/где.*заказ/i,
	/статус.*заказ/i,
	/возврат/i,
	/вернуть/i,
	/доставк/i,
	/трекинг/i,
	/отслеживани/i,
	/оплат/i,
	/списали/i,
	/бонус/i,
	/промокод/i,
	/скидк.*карт/i,
	/order\s*(#|\d)/i,
	/my order/i,
	/where.*order/i,
	/return/i,
	/delivery/i,
	/tracking/i,
	/payment/i,
	/bonus/i,
	/promo.*code/i,
];

const SIZE_PATTERNS = [
	/какой размер/i,
	/подойдёт.*размер/i,
	/подойдет.*размер/i,
	/размерная сетка/i,
	/как выбрать размер/i,
	/мне размер/i,
	/размер.*подойдет/i,
	/what size/i,
	/size guide/i,
	/which size/i,
	/fits me/i,
	/my size/i,
];

const OUTFIT_PATTERNS = [
	/подбери образ/i,
	/собери образ/i,
	/что надеть/i,
	/как одеться/i,
	/спортивный стиль/i,
	/look/i,
	/outfit/i,
	/what to wear/i,
	/style me/i,
	/put together/i,
];

const BUNDLE_PATTERNS = [
	/что нужно.*для/i,
	/комплект.*для/i,
	/набор.*для/i,
	/список.*для/i,
	/всё что нужно/i,
	/what.*need.*for/i,
	/kit for/i,
	/gear for/i,
	/set.*for/i,
];

function applyRules(message: string): ClassificationResult | null {
	for (const pattern of SERVICE_PATTERNS) {
		if (pattern.test(message)) {
			return { mode: "service", confidence: 0.95, source: "rule" };
		}
	}
	for (const pattern of SIZE_PATTERNS) {
		if (pattern.test(message)) {
			return { mode: "size_help", confidence: 0.95, source: "rule" };
		}
	}
	for (const pattern of OUTFIT_PATTERNS) {
		if (pattern.test(message)) {
			return { mode: "outfit", confidence: 0.92, source: "rule" };
		}
	}
	for (const pattern of BUNDLE_PATTERNS) {
		if (pattern.test(message)) {
			return { mode: "bundle", confidence: 0.90, source: "rule" };
		}
	}
	return null;
}

let openaiModule: typeof import("openai") | null = null;

async function getOpenAI() {
	if (!openaiModule) {
		openaiModule = await import("openai");
	}
	return openaiModule;
}

async function classifyWithLLM(message: string): Promise<ClassificationResult> {
	try {
		const { default: OpenAI } = await getOpenAI();
		const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

		const response = await client.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: `Classify the user's intent into exactly one category. Return JSON only.

Categories:
- product_consultation: shopping for products, asking what to buy, choosing between items
- service: order status, returns, delivery, payment, bonuses, promo codes, customer support
- expert_advice: how-to questions, technical/sport expertise, product explanations
- outfit: building outfits, style recommendations, what to wear together
- size_help: size selection, fit questions, size guides
- bundle: building a kit/set for an activity, "what do I need for X"

Respond with: {"mode": "<category>", "confidence": <0.0-1.0>}`,
				},
				{ role: "user", content: message },
			],
			temperature: 0,
			max_tokens: 60,
			response_format: { type: "json_object" },
		});

		const text = response.choices[0]?.message?.content ?? "{}";
		const parsed = JSON.parse(text) as { mode?: string; confidence?: number };

		const validModes = new Set<string>([
			"product_consultation",
			"service",
			"expert_advice",
			"outfit",
			"size_help",
			"bundle",
		]);

		const mode = validModes.has(parsed.mode ?? "") ? (parsed.mode as AssistantMode) : "product_consultation";
		const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.6;

		return { mode, confidence, source: "llm" };
	} catch (err) {
		logger.warn({ err }, "Intent classification LLM call failed, using default");
		return { mode: "product_consultation", confidence: 0.5, source: "default" };
	}
}

export interface IntentClassifierOptions {
	/** Cached mode from previous messages in this session */
	cachedMode?: AssistantMode;
	/** Whether to allow LLM fallback (default: true) */
	useLLM?: boolean;
}

/**
 * Classifies user message intent. Uses keyword rules first (fast, free),
 * falls back to LLM classification only for ambiguous cases.
 */
export async function classifyIntent(
	message: string,
	options: IntentClassifierOptions = {},
): Promise<ClassificationResult> {
	// If session already has a mode established and message is short clarification, keep it
	if (options.cachedMode && message.length < 30) {
		return { mode: options.cachedMode, confidence: 0.8, source: "rule" };
	}

	// Fast path: keyword rules
	const ruleResult = applyRules(message);
	if (ruleResult) {
		return ruleResult;
	}

	// Slow path: LLM classification
	if (options.useLLM !== false) {
		return classifyWithLLM(message);
	}

	return { mode: "product_consultation", confidence: 0.5, source: "default" };
}
