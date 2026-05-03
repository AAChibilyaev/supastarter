/**
 * AI-powered synonym suggestion engine.
 * Uses LLM to suggest synonyms based on document content context.
 * Includes in-memory LRU cache for rate limiting and deduplication.
 */

import { generateText, textModel } from "@repo/ai";

/**
 * A single synonym suggestion with a relevance score.
 */
export interface AISynonymSuggestion {
	/** The suggested synonym word */
	word: string;
	/** Relevance score 0.0-1.0 */
	score: number;
	/** Brief rationale for the suggestion */
	rationale: string;
}

/**
 * Result from the AI suggestion engine.
 */
export interface AISynonymSuggestionsResult {
	/** Ranked list of suggestions */
	suggestions: AISynonymSuggestion[];
	/** The root word that was expanded */
	rootWord: string;
	/** Locale used for generation */
	locale: string;
	/** Whether the result came from cache */
	cached: boolean;
}

/**
 * Simple LRU cache with TTL for synonym suggestions.
 */
class SynonymSuggestionCache {
	private cache: Map<string, { result: AISynonymSuggestion[]; expiresAt: number }> = new Map();
	private readonly maxSize: number;
	private readonly ttlMs: number;

	constructor(maxSize: number = 100, ttlMs: number = 3600_000) {
		this.maxSize = maxSize;
		this.ttlMs = ttlMs;
	}

	private makeKey(rootWord: string, locale: string): string {
		return `${locale}:${rootWord.toLowerCase().trim()}`;
	}

	get(rootWord: string, locale: string): AISynonymSuggestion[] | null {
		const key = this.makeKey(rootWord, locale);
		const entry = this.cache.get(key);
		if (!entry) return null;
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return null;
		}
		// LRU: move to end on access
		this.cache.delete(key);
		this.cache.set(key, entry);
		return entry.result;
	}

	set(rootWord: string, locale: string, suggestions: AISynonymSuggestion[]): void {
		const key = this.makeKey(rootWord, locale);
		// Evict oldest if at capacity
		if (this.cache.size >= this.maxSize) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey !== undefined) {
				this.cache.delete(oldestKey);
			}
		}
		this.cache.set(key, {
			result: suggestions,
			expiresAt: Date.now() + this.ttlMs,
		});
	}

	/** Clear all cached suggestions. */
	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}
}

/**
 * Global LRU cache for synonym suggestions.
 * Shared across all requests to enforce rate limits.
 */
export const suggestionCache = new SynonymSuggestionCache(200, 3600_000);

const SYSTEM_PROMPT = `You are a search relevance engineer specializing in synonym expansion for search engines.

Given a root word, a locale/language, and sample document text from a search collection, generate relevant synonym suggestions.

Rules:
1. Each suggestion must be a real word or commonly used phrase that could replace the root word in the given context
2. Score each suggestion 0.0-1.0 based on how semantically similar it is to the root word in the provided context
3. Include a brief rationale explaining why this synonym works in this context
4. Return suggestions ranked by score (highest first)
5. Return 3-10 suggestions
6. Consider industry-specific terminology from the document text
7. Do NOT suggest the root word itself as a synonym
8. Do NOT suggest words that have a completely different meaning
9. For multi-word phrases: prefer single-word synonyms unless the phrase is commonly used`;

const USER_PROMPT_TEMPLATE = `Root word: "{rootWord}"
Locale: {locale}

Sample document content from the collection:
---
{sampleText}
---

Return a JSON array of synonym suggestions: [{"word": "...", "score": 0.X, "rationale": "..."}]
Each word must be a valid synonym for "{rootWord}" in the context of the provided documents.`;

/**
 * Parse the LLM response text into structured suggestion objects.
 * Handles JSON arrays with or without markdown fences.
 */
function parseSuggestions(text: string, rootWord: string): AISynonymSuggestion[] {
	// Strip markdown code fences if present
	const cleaned = text
		.replace(/```json\s*/gi, "")
		.replace(/```\s*$/g, "")
		.trim();

	let parsed: unknown[];
	try {
		parsed = JSON.parse(cleaned) as unknown[];
	} catch {
		// Try to find a JSON array in the text
		const match = cleaned.match(/\[[\s\S]*\]/);
		if (match) {
			try {
				parsed = JSON.parse(match[0]) as unknown[];
			} catch {
				return [];
			}
		} else {
			return [];
		}
	}

	if (!Array.isArray(parsed)) return [];

	return parsed
		.filter(
			(item): item is Record<string, unknown> => typeof item === "object" && item !== null,
		)
		.map((item) => ({
			word: String(item.word ?? "").trim(),
			score: Math.min(1, Math.max(0, Number(item.score ?? 0))),
			rationale: String(item.rationale ?? "").trim(),
		}))
		.filter((s) => s.word.length > 0 && s.word.toLowerCase() !== rootWord.toLowerCase())
		.sort((a, b) => b.score - a.score)
		.slice(0, 10);
}

/**
 * Suggest synonyms for a root word using AI, based on document content context.
 *
 * @param rootWord - The root word to find synonyms for
 * @param sampleText - Document text content from the collection
 * @param locale - Locale/language code (e.g. "en", "ru", "de")
 * @param bypassCache - If true, bypass the in-memory cache
 * @returns Ranked synonym suggestions
 */
export async function suggestSynonyms(
	rootWord: string,
	sampleText: string,
	locale: string = "en",
	bypassCache: boolean = false,
): Promise<AISynonymSuggestionsResult> {
	const normalizedRoot = rootWord.toLowerCase().trim();

	if (!normalizedRoot) {
		return { suggestions: [], rootWord, locale, cached: false };
	}

	if (!sampleText || sampleText.trim().length < 10) {
		return {
			suggestions: [],
			rootWord,
			locale,
			cached: false,
		};
	}

	// Check cache first
	if (!bypassCache) {
		const cached = suggestionCache.get(normalizedRoot, locale);
		if (cached) {
			return { suggestions: cached, rootWord, locale, cached: true };
		}
	}

	// Truncate sample text to avoid excessive token usage (max ~4000 chars)
	const truncatedSample =
		sampleText.length > 4000
			? sampleText.slice(0, 2000) + "\n...\n" + sampleText.slice(-1900)
			: sampleText;

	const userPrompt = USER_PROMPT_TEMPLATE.replace("{rootWord}", normalizedRoot)
		.replace("{locale}", locale)
		.replace("{sampleText}", truncatedSample);

	try {
		const result = await generateText({
			model: textModel,
			system: SYSTEM_PROMPT,
			prompt: userPrompt,
		});

		const suggestions = parseSuggestions(result.text, normalizedRoot);

		// Cache the result (even if empty, to avoid repeated empty calls)
		suggestionCache.set(normalizedRoot, locale, suggestions);

		return { suggestions, rootWord, locale, cached: false };
	} catch (err) {
		return {
			suggestions: [],
			rootWord,
			locale,
			cached: false,
		};
	}
}

/**
 * Clear the suggestion cache.
 */
export function clearSuggestionCache(): void {
	suggestionCache.clear();
}
