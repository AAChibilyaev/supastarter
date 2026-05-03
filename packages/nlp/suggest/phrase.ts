/**
 * Phrase Suggester — multi-word completion suggestions.
 * Suggests full phrases based on prefix and context.
 * Pure TypeScript — no external dependencies.
 */

export interface PhraseSuggestion {
	phrase: string;
	score: number;
	/** How the suggestion was generated */
	source: "popular" | "completion" | "next_word";
	/** Frequency bucket for display */
	frequency: "high" | "medium" | "low";
}

export interface PhraseSuggesterOptions {
	/** Maximum number of phrase suggestions */
	maxResults?: number;
	/** Minimum phrase length in characters */
	minPhraseLength?: number;
	/** Whether to include single-word completions */
	includeSingleWords?: boolean;
}

const DEFAULT_OPTIONS: Required<PhraseSuggesterOptions> = {
	maxResults: 5,
	minPhraseLength: 2,
	includeSingleWords: true,
};

/**
 * Phrase Suggester — learns common multi-word patterns from query logs
 * and suggests complete phrases.
 */
export class PhraseSuggester {
	private phrases: Map<string, number> = new Map();
	private bigrams: Map<string, Map<string, number>> = new Map();
	private options: Required<PhraseSuggesterOptions>;

	constructor(options?: PhraseSuggesterOptions) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	/**
	 * Learn a phrase with optional frequency weight.
	 */
	learn(phrase: string, frequency: number = 1): void {
		if (!phrase || phrase.length < this.options.minPhraseLength) return;

		const normalized = phrase.toLowerCase().trim();
		const current = this.phrases.get(normalized) || 0;
		this.phrases.set(normalized, current + frequency);

		// Build bigram model
		const words = normalized.split(/\s+/);
		for (let i = 0; i < words.length - 1; i++) {
			const first = words[i]!;
			const second = words[i + 1]!;

			if (!this.bigrams.has(first)) {
				this.bigrams.set(first, new Map());
			}
			const nextWords = this.bigrams.get(first)!;
			const currentCount = nextWords.get(second) || 0;
			nextWords.set(second, currentCount + frequency);
		}
	}

	/**
	 * Learn multiple phrases at once.
	 */
	learnMany(phrases: Array<{ phrase: string; frequency: number }>): void {
		for (const { phrase, frequency } of phrases) {
			this.learn(phrase, frequency);
		}
	}

	/**
	 * Suggest phrases starting with the given prefix.
	 */
	suggest(prefix: string, maxResults?: number): PhraseSuggestion[] {
		const limit = maxResults ?? this.options.maxResults;
		const normalized = prefix.toLowerCase().trim();

		if (!normalized) return [];

		const results: PhraseSuggestion[] = [];

		// 1. Find matching phrases
		for (const [phrase, freq] of this.phrases.entries()) {
			if (
				phrase.startsWith(normalized) &&
				phrase !== normalized &&
				phrase.length >= this.options.minPhraseLength
			) {
				const score = this.calculateScore(freq, phrase.length);
				results.push({
					phrase,
					score,
					source: "popular",
					frequency: this.frequencyBucket(freq),
				});
			}
		}

		// 2. Add bigram-based predictions (next word after last token)
		if (normalized.includes(" ")) {
			const words = normalized.split(/\s+/);
			const lastWord = words[words.length - 1]!;
			const context = words.slice(0, -1).join(" ");
			const nextWords = this.bigrams.get(lastWord);

			if (nextWords) {
				for (const [nextWord, freq] of nextWords.entries()) {
					const fullPhrase = `${context} ${lastWord} ${nextWord}`.trim();
					if (!results.some((r) => r.phrase === fullPhrase)) {
						const score = this.calculateScore(freq, fullPhrase.length);
						results.push({
							phrase: fullPhrase,
							score: score * 0.9, // Slightly lower priority than exact prefix
							source: "next_word",
							frequency: this.frequencyBucket(freq),
						});
					}
				}
			}
		}

		// Sort by score descending
		results.sort((a, b) => b.score - a.score);

		return results.slice(0, limit);
	}

	/**
	 * Calculate suggestion score based on frequency and phrase length.
	 */
	private calculateScore(frequency: number, phraseLength: number): number {
		const freqScore = Math.log2(frequency + 1);
		const lengthBonus = Math.min(phraseLength / 20, 1.0) * 0.2;
		return freqScore + lengthBonus;
	}

	/**
	 * Bucket frequency into qualitative levels.
	 */
	private frequencyBucket(frequency: number): "high" | "medium" | "low" {
		if (frequency >= 100) return "high";
		if (frequency >= 10) return "medium";
		return "low";
	}

	/**
	 * Get the most popular phrases overall.
	 */
	getPopularPhrases(limit: number = 10): PhraseSuggestion[] {
		const results: PhraseSuggestion[] = [];

		for (const [phrase, freq] of this.phrases.entries()) {
			if (phrase.split(/\s+/).length >= 2) {
				results.push({
					phrase,
					score: this.calculateScore(freq, phrase.length),
					source: "popular",
					frequency: this.frequencyBucket(freq),
				});
			}
		}

		results.sort((a, b) => b.score - a.score);
		return results.slice(0, limit);
	}

	/**
	 * Total number of learned phrases.
	 */
	get size(): number {
		return this.phrases.size;
	}

	/**
	 * Serialize for persistence.
	 */
	toJSON(): Record<string, unknown> {
		const phrases: Record<string, number> = {};
		for (const [phrase, freq] of this.phrases.entries()) {
			phrases[phrase] = freq;
		}

		const bigramsSerialized: Record<string, Record<string, number>> = {};
		for (const [word, nextWords] of this.bigrams.entries()) {
			const next: Record<string, number> = {};
			for (const [nextWord, freq] of nextWords.entries()) {
				next[nextWord] = freq;
			}
			bigramsSerialized[word] = next;
		}

		return {
			phrases,
			bigrams: bigramsSerialized,
			options: this.options,
		};
	}

	/**
	 * Deserialize saved state.
	 */
	static fromJSON(data: Record<string, unknown>): PhraseSuggester {
		const suggester = new PhraseSuggester(data.options as PhraseSuggesterOptions);

		const phrases = data.phrases as Record<string, number>;
		if (phrases) {
			for (const [phrase, freq] of Object.entries(phrases)) {
				suggester.phrases.set(phrase, freq);
			}
		}

		const bigramsData = data.bigrams as Record<string, Record<string, number>>;
		if (bigramsData) {
			for (const [word, nextWords] of Object.entries(bigramsData)) {
				const map = new Map(Object.entries(nextWords));
				suggester.bigrams.set(word, map);
			}
		}

		return suggester;
	}
}
