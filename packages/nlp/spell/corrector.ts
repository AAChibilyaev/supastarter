/**
 * Spell Corrector — provides spelling correction suggestions using
 * configurable distance algorithms and language-specific dictionaries.
 */
import {
	levenshteinDistance,
	damerauLevenshteinDistance,
	jaroWinklerDistance,
	type DistanceType,
	type DistanceResult,
} from "./distances";

export interface CorrectionOptions {
	/** Maximum edit distance (default: 2) */
	maxDistance?: number;
	/** Algorithms to use, ordered by priority (default: [levenshtein, damerau-levenshtein, jaro-winkler]) */
	algorithms?: DistanceType[];
	/** Minimum similarity score (0.0 to 1.0, default: 0.6) */
	minScore?: number;
	/** Maximum number of candidates to return (default: 10) */
	maxResults?: number;
	/** Language for dictionary selection */
	language?: "ru" | "en";
}

export interface CorrectionResult {
	original: string;
	suggestion: string;
	distance: number;
	similarity: number;
	algorithm: DistanceType;
	score: number; // Combined confidence score (0.0 to 1.0)
}

export class SpellCorrector {
	private readonly dictionary: Set<string>;
	private readonly wordFrequencies: Map<string, number>;

	/**
	 * @param dictionary - List of known words (e.g. from an index or dictionary file)
	 * @param frequencies - Optional word frequency map for ranking (higher = more common)
	 */
	constructor(dictionary: string[], frequencies?: Map<string, number>) {
		this.dictionary = new Set(dictionary.map((w) => w.toLowerCase()));
		this.wordFrequencies = frequencies ?? new Map();
	}

	/**
	 * Check if a word is in the dictionary.
	 */
	public isCorrect(word: string): boolean {
		return this.dictionary.has(word.toLowerCase());
	}

	/**
	 * Generate spelling correction suggestions for a word.
	 */
	public correct(word: string, options?: CorrectionOptions): CorrectionResult[] {
		const cfg: Required<CorrectionOptions> = {
			maxDistance: options?.maxDistance ?? 2,
			algorithms: options?.algorithms ?? [
				"levenshtein",
				"damerau-levenshtein",
				"jaro-winkler",
			],
			minScore: options?.minScore ?? 0.6,
			maxResults: options?.maxResults ?? 10,
			language: options?.language ?? "en",
		};

		if (!word || word.trim().length === 0) return [];
		if (this.isCorrect(word)) {
			return [
				{
					original: word,
					suggestion: word,
					distance: 0,
					similarity: 1,
					algorithm: "levenshtein",
					score: 1,
				},
			];
		}

		const candidates = new Map<
			string,
			{ totalDistance: number; totalSimilarity: number; count: number }
		>();

		for (const algo of cfg.algorithms) {
			this.findCandidates(word, algo, cfg.maxDistance, cfg.minScore, candidates);
		}

		// Score and rank candidates
		const results: CorrectionResult[] = [];
		for (const [suggestion, stats] of candidates) {
			const avgDistance = stats.totalDistance / stats.count;
			const avgSimilarity = stats.totalSimilarity / stats.count;

			// Frequency bonus: words seen more often get a small score boost
			const freq = this.wordFrequencies.get(suggestion) ?? 0;
			const maxFreq = Math.max(...Array.from(this.wordFrequencies.values()), 1);
			const frequencyBonus = 0.1 * Math.min(1, freq / maxFreq);

			// Length proximity bonus: similar length to original is better
			const lengthRatio =
				Math.min(word.length, suggestion.length) / Math.max(word.length, suggestion.length);
			const lengthBonus = 0.05 * lengthRatio;

			// Combined score
			const score = Math.min(1, avgSimilarity + frequencyBonus + lengthBonus);

			results.push({
				original: word,
				suggestion,
				distance: avgDistance,
				similarity: avgSimilarity,
				algorithm: cfg.algorithms[0],
				score,
			});
		}

		// Sort by score descending, then distance ascending
		results.sort((a, b) => {
			if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
			return a.distance - b.distance;
		});

		return results.slice(0, cfg.maxResults);
	}

	/**
	 * Specialized correction for Russian text with morphological awareness.
	 */
	public correctRussian(word: string, options?: CorrectionOptions): CorrectionResult[] {
		return this.correct(word, {
			...options,
			language: "ru",
			algorithms: options?.algorithms ?? [
				"levenshtein",
				"damerau-levenshtein",
				"jaro-winkler",
			],
		});
	}

	/**
	 * Specialized correction for text that may be transliterated Russian.
	 */
	public correctTranslit(word: string, options?: CorrectionOptions): CorrectionResult[] {
		return this.correct(word, {
			...options,
			maxDistance: (options?.maxDistance ?? 2) + 1, // Transliteration adds ambiguity
			algorithms: options?.algorithms ?? [
				"jaro-winkler",
				"levenshtein",
				"damerau-levenshtein",
			],
		});
	}

	/**
	 * Specialized correction for text typed in wrong keyboard layout (already converted to correct script).
	 */
	public correctKeyboard(word: string, options?: CorrectionOptions): CorrectionResult[] {
		return this.correct(word, {
			...options,
			maxDistance: (options?.maxDistance ?? 2) + 1,
			algorithms: options?.algorithms ?? ["damerau-levenshtein", "levenshtein"],
		});
	}

	/**
	 * Add words to the dictionary at runtime.
	 */
	public addToDictionary(words: string[]): void {
		for (const w of words) {
			this.dictionary.add(w.toLowerCase());
		}
	}

	/**
	 * Set word frequencies for better ranking.
	 */
	public setFrequencies(frequencies: Map<string, number>): void {
		for (const [word, freq] of frequencies) {
			this.wordFrequencies.set(word.toLowerCase(), freq);
		}
	}

	/**
	 * Get dictionary size.
	 */
	public get dictionarySize(): number {
		return this.dictionary.size;
	}

	private findCandidates(
		word: string,
		algorithm: DistanceType,
		maxDistance: number,
		minScore: number,
		candidates: Map<string, { totalDistance: number; totalSimilarity: number; count: number }>,
	): void {
		const lowerWord = word.toLowerCase();
		const maxLen = Math.max(word.length, 1);

		for (const dictWord of this.dictionary) {
			// Quick filter: length difference
			const lenDiff = Math.abs(dictWord.length - lowerWord.length);
			if (lenDiff > maxDistance) continue;

			let distance: number;
			let similarity: number;

			switch (algorithm) {
				case "levenshtein": {
					distance = levenshteinDistance(lowerWord, dictWord);
					similarity = Math.max(0, 1 - distance / maxLen);
					break;
				}
				case "damerau-levenshtein": {
					distance = damerauLevenshteinDistance(lowerWord, dictWord);
					similarity = Math.max(0, 1 - distance / maxLen);
					break;
				}
				case "jaro-winkler": {
					distance = jaroWinklerDistance(lowerWord, dictWord);
					similarity = Math.max(0, 1 - distance);
					break;
				}
				default: {
					// Generic fallback for other algorithms
					const dv = levenshteinDistance(lowerWord, dictWord);
					distance = dv;
					similarity = Math.max(0, 1 - dv / maxLen);
				}
			}

			if (distance > maxDistance || similarity < minScore) continue;

			const existing = candidates.get(dictWord);
			if (existing) {
				existing.totalDistance += distance;
				existing.totalSimilarity += similarity;
				existing.count += 1;
			} else {
				candidates.set(dictWord, {
					totalDistance: distance,
					totalSimilarity: similarity,
					count: 1,
				});
			}
		}
	}
}
