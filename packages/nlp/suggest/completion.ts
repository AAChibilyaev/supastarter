/**
 * Completion Suggester for autocomplete.
 * Uses a WeightedTrie for prefix-based completions
 * with frequency ranking and context-awareness.
 */

import { WeightedTrie } from "./trie";

export interface CompletionResult {
	text: string;
	score: number;
	type: "word" | "phrase";
}

export interface CompletionOptions {
	/** Maximum number of completions to return */
	maxResults?: number;
	/** Minimum prefix length to trigger suggestions */
	minPrefix?: number;
	/** Whether to include fuzzy completions */
	fuzzy?: boolean;
	/** Maximum edit distance for fuzzy matching */
	fuzzyDistance?: number;
}

const DEFAULT_OPTIONS: Required<CompletionOptions> = {
	maxResults: 10,
	minPrefix: 2,
	fuzzy: false,
	fuzzyDistance: 2,
};

/**
 * Completion Suggester — provides prefix-based autocomplete suggestions
 * with frequency ranking.
 */
export class CompletionSuggester {
	private trie: WeightedTrie;
	private options: Required<CompletionOptions>;

	constructor(options?: CompletionOptions) {
		this.trie = new WeightedTrie();
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	/**
	 * Learn words from a text corpus.
	 */
	learn(text: string, frequency: number = 1): void {
		if (!text) return;
		const words = text
			.split(/\s+/)
			.map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
			.filter(Boolean);

		for (const word of words) {
			this.trie.insert(word.toLowerCase(), frequency);
		}
	}

	/**
	 * Learn a phrase (multi-word) as a single completion unit.
	 */
	learnPhrase(phrase: string, frequency: number = 1): void {
		if (!phrase) return;
		const normalized = phrase.toLowerCase().trim();
		// Index both the full phrase and individual words
		this.trie.insert(normalized, frequency * 2); // Phrase gets higher weight
		const words = normalized.split(/\s+/);
		for (const word of words) {
			this.trie.insert(word, frequency);
		}
	}

	/**
	 * Learn from a corpus of (word, frequency) pairs.
	 */
	learnFromFrequencyMap(frequencies: Record<string, number>): void {
		for (const [word, freq] of Object.entries(frequencies)) {
			this.trie.insert(word.toLowerCase(), freq);
		}
	}

	/**
	 * Get completion suggestions for a prefix.
	 */
	suggest(prefix: string, options?: CompletionOptions): CompletionResult[] {
		const opts = { ...this.options, ...options };
		const normalized = prefix.toLowerCase().trim();

		if (normalized.length < opts.minPrefix) {
			return [];
		}

		// Try exact prefix completions first
		const exactMatches = this.trie.completions(normalized, opts.maxResults);
		const results: CompletionResult[] = exactMatches.map((word) => ({
			text: word,
			score: 1.0,
			type: word.includes(" ") ? "phrase" : "word",
		}));

		// If enabled, add fuzzy completions
		if (opts.fuzzy && results.length < opts.maxResults) {
			const fuzzyMatches = this.trie.fuzzySearch(
				normalized,
				opts.fuzzyDistance,
				opts.maxResults - results.length,
			);
			for (const match of fuzzyMatches) {
				if (!results.some((r) => r.text === match)) {
					results.push({
						text: match,
						score: 0.7, // Fuzzy matches get lower score
						type: match.includes(" ") ? "phrase" : "word",
					});
				}
			}
		}

		return results.slice(0, opts.maxResults);
	}

	/**
	 * Build a frequency map from query log data.
	 */
	buildFromQueryLog(queries: Array<{ query: string; count: number }>): void {
		for (const { query, count } of queries) {
			const normalized = query.toLowerCase().trim();
			// Index the full query as a phrase
			this.trie.insert(normalized, count * 3);
			// Also index individual words
			const words = normalized.split(/\s+/);
			for (const word of words) {
				this.trie.insert(word, count);
			}
		}
	}

	/**
	 * Get context-aware suggestions (previous word + current prefix).
	 */
	suggestWithContext(
		previousWords: string[],
		currentPrefix: string,
		options?: CompletionOptions,
	): CompletionResult[] {
		const opts = { ...this.options, ...options };
		const context = previousWords.map((w) => w.toLowerCase().trim()).filter(Boolean);

		if (context.length === 0) {
			return this.suggest(currentPrefix, options);
		}

		const prefix = currentPrefix.toLowerCase().trim();

		if (prefix.length < opts.minPrefix && context.length > 0) {
			// Just a context word — suggest common next words
			return this.suggest("", { ...opts, minPrefix: 0 });
		}

		// Prefer completions that follow the last context word
		const lastWord = context[context.length - 1]!;
		const bigramPrefix = `${lastWord} ${prefix}`.toLowerCase();
		const bigramResults = this.trie.completions(bigramPrefix, opts.maxResults);

		if (bigramResults.length > 0) {
			return bigramResults.map((word) => ({
				text: word,
				score: 1.0,
				type: "phrase" as const,
			}));
		}

		// Fall back to simple prefix completion
		return this.suggest(prefix, options);
	}

	/**
	 * Serialize the suggestor's trie for persistence.
	 */
	toJSON(): Record<string, unknown> {
		return {
			options: this.options,
			trie: this.trie.toJSON(),
		};
	}

	/**
	 * Deserialize saved suggestor state.
	 */
	static fromJSON(data: Record<string, unknown>): CompletionSuggester {
		const suggester = new CompletionSuggester(data.options as CompletionOptions);
		suggester.trie = WeightedTrie.fromJSON(data.trie as Record<string, unknown>);
		return suggester;
	}
}
