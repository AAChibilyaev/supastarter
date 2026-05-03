import { logger } from "@repo/logs";

// Detects potential hallucination patterns in service mode responses
const SERVICE_HALLUCINATION_PATTERNS = [
	/ваш заказ.*доставлен/i,
	/заказ.*прибудет.*\d+/i,
	/возврат.*\d+\s*(руб|₽|rub)/i,
	/доставка.*\d+\s*(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/i,
	/your order.*delivered/i,
	/order.*arrives.*\d+/i,
	/refund.*\$\d+/i,
];

// PII patterns to scrub from outputs
const PII_PATTERNS = [
	/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // card numbers
	/\b\+7[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g, // RU phone
	/\b\+1[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}\b/g, // US phone
	/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // email
];

// Off-topic redirect patterns
const OFF_TOPIC_PATTERNS = [
	/политик/i,
	/выборы/i,
	/война/i,
	/секс/i,
	/наркотик/i,
	/оружи/i,
	/politics/i,
	/election/i,
	/weapon/i,
	/drug/i,
	/porn/i,
];

export interface SafetyCheckResult {
	safe: boolean;
	reason?: string;
	sanitizedContent?: string;
}

/**
 * Checks user message for off-topic content before calling LLM.
 * Returns early redirect without LLM call if off-topic detected.
 */
export function checkUserMessage(message: string): SafetyCheckResult {
	for (const pattern of OFF_TOPIC_PATTERNS) {
		if (pattern.test(message)) {
			logger.info({ pattern: pattern.toString() }, "Off-topic message detected");
			return {
				safe: false,
				reason: "off_topic",
				sanitizedContent:
					"Я здесь, чтобы помочь с покупками и ответами на вопросы о товарах, заказах и доставке. Чем могу помочь?",
			};
		}
	}
	return { safe: true };
}

/**
 * Validates assistant output in service mode for hallucination patterns.
 * If hallucination detected, replaces with honest error message.
 */
export function validateServiceOutput(output: string): SafetyCheckResult {
	for (const pattern of SERVICE_HALLUCINATION_PATTERNS) {
		if (pattern.test(output)) {
			logger.warn({ pattern: pattern.toString() }, "Potential service hallucination detected");
			return {
				safe: false,
				reason: "hallucination",
				sanitizedContent:
					"Дайте мне секунду, проверю актуальную информацию по вашему запросу.",
			};
		}
	}
	return { safe: true };
}

/**
 * Scrubs PII patterns from assistant output.
 */
export function sanitizeOutput(content: string): string {
	let result = content;
	for (const pattern of PII_PATTERNS) {
		result = result.replace(pattern, "[REDACTED]");
	}
	return result;
}

/**
 * Validates tool call arguments for security issues.
 */
export function validateToolCallArgs(
	toolName: string,
	args: Record<string, unknown>,
	sessionUserId: string | undefined,
): SafetyCheckResult {
	// IDOR protection: order/return tools must use the session user's ID
	if (toolName === "get_order_status" || toolName === "get_return_status") {
		const requestedUserId = args.userId as string | undefined;
		if (requestedUserId && sessionUserId && requestedUserId !== sessionUserId) {
			logger.warn(
				{ toolName, requestedUserId, sessionUserId },
				"IDOR attempt in tool call blocked",
			);
			return { safe: false, reason: "idor_attempt" };
		}
	}

	// Typesense filter injection prevention
	if (toolName === "search_products" && typeof args.filters === "string") {
		const filters = args.filters;
		// Block attempts to inject dangerous filter expressions
		if (/[;|]|--|\bOR\b|\bAND\b.*\bOR\b/i.test(filters)) {
			return { safe: false, reason: "filter_injection" };
		}
	}

	return { safe: true };
}
