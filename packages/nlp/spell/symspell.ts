/**
 * SymSpell — Fast spelling correction algorithm using precomputed edit operations.
 *
 * Key insight: precompute all possible deletion-only edits for each dictionary word
 * at build time, enabling O(1) lookup at query time instead of O(n) dictionary scan.
 *
 * Based on SymSpell by Wolf Garbe:
 * https://github.com/wolfgarbe/SymSpell
 *
 * Supports:
 * - Deletion-only edit distance (up to maxEditDistance)
 * - Verbose suggestion mode (all suggestions ranked by distance + frequency)
 * - Compound word splitting (German, Finnish, etc.)
 * - Custom dictionary (whitelist, no correction for brand names)
 */

import { damerauLevenshteinDistance } from "./distances";

export interface SymSpellOptions {
	/** Maximum edit distance for suggestions (default: 2, max: 4) */
	maxEditDistance: number;
	/**
	 * Verbosity of suggestions:
	 * - 0: top suggestion only
	 * - 1: all suggestions of same minimal distance
	 * - 2: all suggestions (default)
	 */
	verbosity: 0 | 1 | 2;
	/** Maximum number of suggestions to return (default: 10) */
	maxResults: number;
	/** Whether to try compound word splitting (default: false) */
	splitCompoundWords: boolean;
	/** Minimum word length for compound splitting (default: 4) */
	compoundMinLength: number;
	/** Maximum edit distance when checking compound parts (default: 1) */
	compoundMaxDistance: number;
}

export const DEFAULT_SYMSPELL_OPTIONS: SymSpellOptions = {
	maxEditDistance: 2,
	verbosity: 2,
	maxResults: 10,
	splitCompoundWords: false,
	compoundMinLength: 4,
	compoundMaxDistance: 1,
};

export interface SymSpellSuggestion {
	/** The suggested word */
	term: string;
	/** Edit distance from the input */
	distance: number;
	/** Word frequency (higher = more common) */
	frequency: number;
	/** Combined score (0.0 to 1.0) */
	score: number;
}

/**
 * Internal entry in the SymSpell dictionary.
 */
interface DictionaryEntry {
	term: string;
	frequency: number;
}

export class SymSpell {
	/** Main dictionary: word → frequency */
	private readonly dictionary: Map<string, DictionaryEntry> = new Map();
	/** Deletion index: deleted_substring → array of original words */
	private readonly deletionIndex: Map<string, string[]> = new Map();
	/** Whitelist: words that should never be corrected */
	private readonly whitelist: Set<string> = new Set();
	/** Total unique entries */
	private totalEntries = 0;
	/** Max length of words in the dictionary */
	private maxWordLength = 0;

	/**
	 * @param options - Configuration options
	 */
	constructor(private readonly options: Partial<SymSpellOptions> = {}) {}

	/**
	 * Create the dictionary from an array of words.
	 * @param words - Array of words to index
	 * @param frequencies - Optional word → frequency map
	 */
	public createDictionary(words: string[], frequencies?: Map<string, number>): void {
		this.dictionary.clear();
		this.deletionIndex.clear();
		this.totalEntries = 0;
		this.maxWordLength = 0;

		// Count word frequencies
		const freqMap = frequencies ?? new Map();
		if (!frequencies) {
			// Count occurrences if no frequencies provided
			for (const word of words) {
				const lower = word.toLowerCase().trim();
				if (!lower) continue;
				freqMap.set(lower, (freqMap.get(lower) ?? 0) + 1);
			}
		}

		const cfg = { ...DEFAULT_SYMSPELL_OPTIONS, ...this.options };
		const maxDist = cfg.maxEditDistance;

		for (const [term, freq] of freqMap) {
			const lower = term.toLowerCase().trim();
			if (!lower) continue;

			this.dictionary.set(lower, { term: lower, frequency: freq });
			this.totalEntries++;
			this.maxWordLength = Math.max(this.maxWordLength, lower.length);

			// Precompute all deletion edits (up to maxEditDistance deletions)
			const edits = this.generateDeletions(lower, maxDist);
			for (const edit of edits) {
				const existing = this.deletionIndex.get(edit);
				if (existing) {
					if (!existing.includes(lower)) {
						existing.push(lower);
					}
				} else {
					this.deletionIndex.set(edit, [lower]);
				}
			}
		}
	}

	/**
	 * Add a whitelist of words that should never be corrected.
	 * Useful for brand names, product SKUs, technical terms.
	 */
	public addToWhitelist(words: string[]): void {
		for (const w of words) {
			this.whitelist.add(w.toLowerCase().trim());
		}
	}

	/**
	 * Add words to the dictionary at runtime.
	 */
	public addToDictionary(words: string[]): void {
		const cfg = { ...DEFAULT_SYMSPELL_OPTIONS, ...this.options };

		for (const w of words) {
			const lower = w.toLowerCase().trim();
			if (!lower || this.dictionary.has(lower)) continue;

			this.dictionary.set(lower, { term: lower, frequency: 1 });
			this.totalEntries++;
			this.maxWordLength = Math.max(this.maxWordLength, lower.length);

			const edits = this.generateDeletions(lower, cfg.maxEditDistance);
			for (const edit of edits) {
				const existing = this.deletionIndex.get(edit);
				if (existing) {
					if (!existing.includes(lower)) existing.push(lower);
				} else {
					this.deletionIndex.set(edit, [lower]);
				}
			}
		}
	}

	/**
	 * Look up spelling corrections for a word.
	 * Returns suggestions sorted by distance (asc), then frequency (desc).
	 */
	public lookup(word: string): SymSpellSuggestion[] {
		const cfg = { ...DEFAULT_SYMSPELL_OPTIONS, ...this.options };
		const lower = word.toLowerCase().trim();

		if (!lower) return [];
		if (this.whitelist.has(lower)) {
			return [
				{
					term: lower,
					distance: 0,
					frequency: this.dictionary.get(lower)?.frequency ?? 1,
					score: 1,
				},
			];
		}

		// Exact match → no correction needed
		if (this.dictionary.has(lower)) {
			const entry = this.dictionary.get(lower)!;
			return [
				{
					term: lower,
					distance: 0,
					frequency: entry.frequency,
					score: 1,
				},
			];
		}

		// Collect candidate suggestions using deletion index
		const suggestions = new Map<string, { distance: number; frequency: number }>();

		// Add suggestions from deletion index
		const candidates = this.lookupCandidates(lower, cfg.maxEditDistance);

		for (const { term, distance } of candidates) {
			const entry = this.dictionary.get(term);
			if (!entry) continue;

			const freq = entry.frequency;
			const existing = suggestions.get(term);
			if (!existing || distance < existing.distance) {
				suggestions.set(term, { distance, frequency: freq });
			}
		}

		// Add the original word itself as a fallback (in case it's not in dictionary)
		suggestions.set(lower, { distance: cfg.maxEditDistance + 1, frequency: 0 });

		// Apply verbosity filter
		let filtered: Array<{ term: string; distance: number; frequency: number }>;

		switch (cfg.verbosity) {
			case 0: {
				// Top suggestion only
				const best = this.getBestSuggestion(suggestions);
				filtered = best ? [best] : [];
				break;
			}
			case 1: {
				// All suggestions of same minimal distance
				const minDist = Math.min(
					...Array.from(suggestions.values()).map((s) => s.distance),
				);
				filtered = Array.from(suggestions.entries())
					.filter(([, s]) => s.distance === minDist)
					.map(([term, s]) => ({ term, ...s }));
				break;
			}
			case 2: {
				// All suggestions
				filtered = Array.from(suggestions.entries()).map(([term, s]) => ({
					term,
					...s,
				}));
				break;
			}
		}

		// Sort by distance (asc), then frequency (desc)
		filtered.sort((a, b) => {
			if (a.distance !== b.distance) return a.distance - b.distance;
			return b.frequency - a.frequency;
		});

		// Score and limit results
		const maxFreq = Math.max(
			...Array.from(this.dictionary.values()).map((e) => e.frequency),
			1,
		);

		return filtered.slice(0, cfg.maxResults).map((s) => ({
			term: s.term,
			distance: s.distance,
			frequency: s.frequency,
			score: this.calculateScore(
				s.distance,
				s.frequency,
				maxFreq,
				lower.length,
				s.term.length,
			),
		}));
	}

	/**
	 * Find suggestions using SymSpell compound splitting.
	 * For compound words (common in German, Finnish), tries to split the
	 * input word into valid parts and find corrections for each part.
	 */
	public lookupCompound(word: string): SymSpellSuggestion[] {
		const cfg = { ...DEFAULT_SYMSPELL_OPTIONS, ...this.options };

		if (!cfg.splitCompoundWords) {
			return this.lookup(word);
		}

		const lower = word.toLowerCase().trim();
		if (!lower || lower.length < cfg.compoundMinLength) {
			return this.lookup(word);
		}

		// First, try direct lookup
		const directResults = this.lookup(word);
		if (directResults.length > 0 && directResults[0].distance === 0) {
			return directResults;
		}

		// Try to split the word into compound parts
		const splits = this.findCompounds(lower, cfg);
		if (splits.length === 0) {
			return directResults;
		}

		// Score each split
		const results: SymSpellSuggestion[] = [];
		const maxFreq = Math.max(
			...Array.from(this.dictionary.values()).map((e) => e.frequency),
			1,
		);

		for (const split of splits) {
			const compoundWord = split.join("");
			const totalFreq = split.reduce(
				(sum, part) => sum + (this.dictionary.get(part)?.frequency ?? 0),
				0,
			);

			results.push({
				term: compoundWord,
				distance: 0,
				frequency: totalFreq,
				score: this.calculateScore(
					0,
					totalFreq,
					maxFreq,
					lower.length,
					compoundWord.length,
				),
			});
		}

		return results.slice(0, cfg.maxResults);
	}

	/**
	 * Get the total number of unique words in the dictionary.
	 */
	public get size(): number {
		return this.totalEntries;
	}

	/**
	 * Check if a word is in the dictionary or whitelist.
	 */
	public isCorrect(word: string): boolean {
		const lower = word.toLowerCase().trim();
		return this.dictionary.has(lower) || this.whitelist.has(lower);
	}

	// ─── Private Methods ────────────────────────────────────────────────────

	/**
	 * Generate all deletion-only edits of a word up to `maxDistance` deletions.
	 */
	private generateDeletions(word: string, maxDistance: number): Set<string> {
		const edits = new Set<string>();

		if (maxDistance === 0) return edits;

		// Level 1 deletions
		for (let i = 0; i < word.length; i++) {
			edits.add(word.slice(0, i) + word.slice(i + 1));
		}

		if (maxDistance >= 2) {
			// Level 2 deletions: delete 2 characters
			const level1 = [...edits];
			for (const edit of level1) {
				for (let i = 0; i < edit.length; i++) {
					edits.add(edit.slice(0, i) + edit.slice(i + 1));
				}
			}
		}

		if (maxDistance >= 3) {
			// Level 3 deletions
			const level2 = [...edits];
			for (const edit of level2) {
				if (edit.length <= 1) continue;
				for (let i = 0; i < edit.length - 1; i++) {
					edits.add(edit.slice(0, i) + edit.slice(i + 1));
				}
			}
		}

		return edits;
	}

	/**
	 * Look up candidate words from the deletion index.
	 * Returns candidates with their exact edit distances.
	 */
	private lookupCandidates(
		word: string,
		maxDistance: number,
	): Array<{ term: string; distance: number }> {
		const candidates = new Set<string>();
		const results: Array<{ term: string; distance: number }> = [];

		// Generate all deletions of the input word
		const inputDeletions = this.generateDeletions(word, maxDistance);

		// Look up each deletion in the index
		for (const deletion of inputDeletions) {
			const matches = this.deletionIndex.get(deletion);
			if (!matches) continue;

			for (const match of matches) {
				if (candidates.has(match)) continue;
				candidates.add(match);

				// Calculate exact edit distance (using Damerau-Levenshtein for accuracy)
				const exactDist = this.calculateExactDistance(word, match, maxDistance);
				if (exactDist <= maxDistance) {
					results.push({ term: match, distance: exactDist });
				}
			}
		}

		// Also check: maybe the input word's deletions match the dictionary word's deletions
		for (const [deletion, matches] of this.deletionIndex) {
			if (inputDeletions.has(deletion)) {
				for (const match of matches) {
					if (candidates.has(match)) continue;
					candidates.add(match);

					const exactDist = this.calculateExactDistance(word, match, maxDistance);
					if (exactDist <= maxDistance) {
						results.push({ term: match, distance: exactDist });
					}
				}
			}
		}

		return results;
	}

	/**
	 * Calculate exact edit distance, with early exit if exceeding maxDistance.
	 */
	private calculateExactDistance(word: string, candidate: string, maxDistance: number): number {
		const diff = Math.abs(word.length - candidate.length);
		if (diff > maxDistance) return maxDistance + 1;

		// Use Damerau-Levenshtein for best accuracy
		// For longer words, use length difference as lower bound
		return damerauLevenshteinDistance(word, candidate);
	}

	/**
	 * Find the best suggestion from the candidates.
	 */
	private getBestSuggestion(
		suggestions: Map<string, { distance: number; frequency: number }>,
	): { term: string; distance: number; frequency: number } | null {
		let best: { term: string; distance: number; frequency: number } | null = null;

		for (const [term, s] of suggestions) {
			if (
				!best ||
				s.distance < best.distance ||
				(s.distance === best.distance && s.frequency > best.frequency)
			) {
				best = { term, ...s };
			}
		}

		return best;
	}

	/**
	 * Attempt to find compound word splits.
	 */
	private findCompounds(word: string, cfg: Required<SymSpellOptions>): string[][] {
		const validSplits: string[][] = [];

		this.findCompoundsRecursive(word, 0, [], validSplits, cfg);
		return validSplits;
	}

	private findCompoundsRecursive(
		word: string,
		start: number,
		current: string[],
		results: string[][],
		cfg: Required<SymSpellOptions>,
	): void {
		if (start >= word.length) {
			if (current.length >= 2) {
				results.push([...current]);
			}
			return;
		}

		// Try each possible split point
		for (let end = start + cfg.compoundMinLength; end <= word.length; end++) {
			const part = word.slice(start, end);
			if (this.dictionary.has(part)) {
				current.push(part);
				this.findCompoundsRecursive(word, end, current, results, cfg);
				current.pop();
			} else {
				// Try with correction (within compoundMaxDistance)
				const candidates = this.lookupCandidates(part, cfg.compoundMaxDistance);
				for (const { term } of candidates) {
					current.push(term);
					this.findCompoundsRecursive(word, end, current, results, cfg);
					current.pop();
				}
			}
		}
	}

	/**
	 * Calculate a combined score from edit distance and frequency.
	 * Returns 0.0 to 1.0 where 1.0 = perfect match.
	 */
	private calculateScore(
		distance: number,
		frequency: number,
		maxFreq: number,
		inputLen: number,
		candidateLen: number,
	): number {
		if (distance === 0) return 1.0;

		// Distance component: exponential decay
		const maxDist = 4;
		const distanceScore = Math.max(0, 1 - distance / maxDist);

		// Frequency component: logarithmic scaling
		const freqRatio = Math.min(1, Math.log(frequency + 1) / Math.log(maxFreq + 1));
		const frequencyScore = 0.3 * freqRatio;

		// Length proximity bonus
		const lengthRatio = Math.min(inputLen, candidateLen) / Math.max(inputLen, candidateLen);
		const lengthBonus = 0.05 * lengthRatio;

		return Math.min(1, distanceScore * 0.65 + frequencyScore + lengthBonus);
	}
}
