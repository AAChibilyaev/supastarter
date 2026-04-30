/**
 * Rough token estimator.
 *
 * Uses a heuristic of 1 token ≈ 4 chars for Latin text and 1 token ≈ 2 chars
 * for CJK/Cyrillic — close enough for pre-call cost reservation. After the
 * provider responds with actual `usage`, the difference is reconciled in
 * `commitAiUsage`.
 *
 * For exact counts use `tiktoken` (OpenAI) or provider-specific tokenizers
 * inside the actual AI procedure — but DO NOT block reservation on that.
 */
export function estimateTokens(
	text: string | string[] | { role: string; content: string }[],
): number {
	if (Array.isArray(text)) {
		return text.reduce<number>((sum, item) => {
			if (typeof item === "string") return sum + estimateOne(item);
			return sum + estimateOne(item.content) + 4; // role/turn overhead
		}, 0);
	}
	return estimateOne(text);
}

function estimateOne(s: string): number {
	if (!s) return 0;
	const cyrillicCjk = (s.match(/[Ѐ-ӿ　-鿿]/g) ?? []).length;
	const rest = s.length - cyrillicCjk;
	return Math.ceil(cyrillicCjk / 2 + rest / 4);
}
