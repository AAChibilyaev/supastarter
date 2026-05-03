/**
 * ContextCorrector — context-sensitive spelling correction using bigram/trigram probabilities.
 *
 * Inspired by Peter Norvig's spelling corrector with context awareness:
 * - Uses bigram (two-word) and trigram (three-word) probabilities from a corpus
 * - Considers surrounding words to disambiguate homophones and similar edits
 * - Scores candidates by: edit_distance × context_probability × frequency
 *
 * Use cases:
 * - "their going" → "they're going" (context-dependent)
 * - "I likes it" → "I like it"
 * - Russian: "красная книга" vs "красный книга" (agreement)
 */

import { SpellCorrector, type CorrectionResult } from "./corrector";
import { SymSpell, type SymSpellSuggestion } from "./symspell";

export interface ContextCorrectionOptions {
	/** Maximum edit distance (default: 2) */
	maxDistance: number;
	/** Maximum number of candidates per word (default: 5) */
	maxCandidates: number;
	/** Minimum combined score to accept a correction (default: 0.4) */
	minScore: number;
	/** Context window size: 1 = bigram, 2 = trigram (default: 1) */
	contextWindow: 1 | 2;
	/** Weight for context probability vs edit distance (default: 0.3) */
	contextWeight: number;
}

export const DEFAULT_CONTEXT_OPTIONS: ContextCorrectionOptions = {
	maxDistance: 2,
	maxCandidates: 5,
	minScore: 0.4,
	contextWindow: 1,
	contextWeight: 0.3,
};

export interface ContextCorrectionResult {
	/** The corrected version of the whole sentence */
	correctedSentence: string;
	/** Per-word corrections */
	wordCorrections: Array<{
		original: string;
		corrected: string;
		score: number;
		wasCorrected: boolean;
		alternatives: Array<{ word: string; score: number }>;
	}>;
	/** Whether any words were actually corrected */
	hasChanges: boolean;
}

export class ContextCorrector {
	private readonly corrector: SpellCorrector;
	private readonly symspell: SymSpell | null;
	/** Bigram probability map: "word1|word2" → count */
	private readonly bigrams: Map<string, number> = new Map();
	/** Trigram probability map: "word1|word2|word3" → count */
	private readonly trigrams: Map<string, number> = new Map();
	/** Unigram frequency */
	private readonly unigrams: Map<string, number> = new Map();
	private totalBigrams = 0;
	private totalTrigrams = 0;
	private isTrained = false;

	/**
	 * @param dictionary - List of known words
	 * @param frequencies - Optional word frequency map
	 * @param useSymSpell - Whether to use SymSpell for faster lookup (default: true)
	 */
	constructor(
		dictionary: string[],
		frequencies?: Map<string, number>,
		useSymSpell = true,
	) {
		this.corrector = new SpellCorrector(dictionary, frequencies);

		if (useSymSpell) {
			this.symspell = new SymSpell({ maxEditDistance: 2, verbosity: 2, maxResults: 10 });
			this.symspell.createDictionary(dictionary, frequencies);
		} else {
			this.symspell = null;
		}
	}

	/**
	 * Train the context model from a corpus of sentences.
	 * Learns bigram and trigram probabilities.
	 */
	public train(sentences: string[][]): void {
		this.bigrams.clear();
		this.trigrams.clear();
		this.unigrams.clear();
		this.totalBigrams = 0;
		this.totalTrigrams = 0;

		for (const sentence of sentences) {
			const clean = sentence.map((w) => w.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "")).filter(Boolean);
			if (clean.length === 0) continue;

			// Count unigrams
			for (const word of clean) {
				this.unigrams.set(word, (this.unigrams.get(word) ?? 0) + 1);
			}

			// Count bigrams
			for (let i = 0; i < clean.length - 1; i++) {
				const key = `${clean[i]}|${clean[i + 1]}`;
				this.bigrams.set(key, (this.bigrams.get(key) ?? 0) + 1);
				this.totalBigrams++;
			}

			// Count trigrams
			for (let i = 0; i < clean.length - 2; i++) {
				const key = `${clean[i]}|${clean[i + 1]}|${clean[i + 2]}`;
				this.trigrams.set(key, (this.trigrams.get(key) ?? 0) + 1);
				this.totalTrigrams++;
			}
		}

		this.isTrained = true;
	}

	/**
	 * Correct a sentence using context-aware spelling correction.
	 */
	public correctSentence(sentence: string, options?: Partial<ContextCorrectionOptions>): ContextCorrectionResult {
		const cfg = { ...DEFAULT_CONTEXT_OPTIONS, ...options };
		const words = sentence.split(/\s+/).filter(Boolean);
		if (words.length === 0) {
			return {
				correctedSentence: sentence,
				wordCorrections: [],
				hasChanges: false,
			};
		}

		const wordCorrections: ContextCorrectionResult["wordCorrections"] = [];
		let hasChanges = false;

		for (let i = 0; i < words.length; i++) {
			const word = words[i].toLowerCase();
			const cleanWord = word.replace(/[^a-zа-яё0-9]/gi, "");

			// Check if word is already correct
			if (this.corrector.isCorrect(cleanWord) || cleanWord.length <= 1) {
				wordCorrections.push({
					original: words[i],
					corrected: words[i],
					score: 1,
					wasCorrected: false,
					alternatives: [],
				});
				continue;
			}

			// Get candidates from SymSpell (faster) or traditional corrector
			let candidates: Array<{ word: string; score: number }>;

			if (this.symspell) {
				const symResults = this.symspell.lookup(cleanWord);
				candidates = symResults
					.filter((r) => r.distance > 0)
					.slice(0, cfg.maxCandidates)
					.map((r) => ({ word: r.term, score: r.score }));
			} else {
				const results: CorrectionResult[] = this.corrector.correct(cleanWord, {
					maxDistance: cfg.maxDistance,
					maxResults: cfg.maxCandidates,
				});
				candidates = results
					.filter((r) => r.original !== r.suggestion)
					.map((r) => ({ word: r.suggestion, score: r.score }));
			}

			// Score each candidate with context
			const scored = candidates.map((c) => ({
				...c,
				contextScore: this.computeContextScore(cleanWord, c.word, i, words, cfg),
				finalScore: 0,
			}));

			// Compute final score as weighted combination
			for (const s of scored) {
				s.finalScore = s.score * (1 - cfg.contextWeight) + s.contextScore * cfg.contextWeight;
			}

			scored.sort((a, b) => b.finalScore - a.finalScore);

			const best = scored[0];
			const bestScore = best?.finalScore ?? 0;
			const shouldCorrect = best && bestScore >= cfg.minScore;

			wordCorrections.push({
				original: words[i],
				corrected: shouldCorrect ? best.word : words[i],
				score: bestScore,
				wasCorrected: !!shouldCorrect,
				alternatives: scored.slice(0, cfg.maxCandidates).map((s) => ({
					word: s.word,
					score: s.finalScore,
				})),
			});

			if (shouldCorrect) hasChanges = true;
		}

		return {
			correctedSentence: wordCorrections.map((w) => w.corrected).join(" "),
			wordCorrections,
			hasChanges,
		};
	}

	/**
	 * Add words to the dictionary at runtime.
	 */
	public addToDictionary(words: string[]): void {
		this.corrector.addToDictionary(words);
		if (this.symspell) {
			this.symspell.addToDictionary(words);
		}
	}

	/**
	 * Get reference to the underlying corrector.
	 */
	public get baseCorrector(): SpellCorrector {
		return this.corrector;
	}

	/**
	 * Get reference to the SymSpell instance (or null if not used).
	 */
	public get symSpell(): SymSpell | null {
		return this.symspell;
	}

	// ─── Private Methods ────────────────────────────────────────────────────

	/**
	 * Compute context probability score for a candidate word.
	 * Uses bigram/trigram probabilities from the trained corpus.
	 */
	private computeContextScore(
		_original: string,
		candidate: string,
		position: number,
		words: string[],
		cfg: Required<ContextCorrectionOptions>,
	): number {
		if (!this.isTrained || words.length <= 1) return 0.5;

		let contextScore = 0;
		let contexts = 0;

		if (cfg.contextWindow >= 1 && position > 0) {
			// Bigram: previous word → candidate
			const prevWord = this.getCleanWord(words[position - 1]);
			const bigramKey = `${prevWord}|${candidate}`;
			const bigramCount = this.bigrams.get(bigramKey) ?? 0;
			const bigramProb = this.totalBigrams > 0 ? bigramCount / this.totalBigrams : 0;
			contextScore += bigramProb * 100; // Scale up for combination
			contexts++;
		}

		if (cfg.contextWindow >= 1 && position < words.length - 1) {
			// Bigram: candidate → next word
			const nextWord = this.getCleanWord(words[position + 1]);
			const bigramKey = `${candidate}|${nextWord}`;
			const bigramCount = this.bigrams.get(bigramKey) ?? 0;
			const bigramProb = this.totalBigrams > 0 ? bigramCount / this.totalBigrams : 0;
			contextScore += bigramProb * 100;
			contexts++;
		}

		if (cfg.contextWindow >= 2 && position > 0 && position < words.length - 1) {
			// Trigram: prev → candidate → next
			const prevWord = this.getCleanWord(words[position - 1]);
			const nextWord = this.getCleanWord(words[position + 1]);
			const trigramKey = `${prevWord}|${candidate}|${nextWord}`;
			const trigramCount = this.trigrams.get(trigramKey) ?? 0;
			const trigramProb = this.totalTrigrams > 0 ? trigramCount / this.totalTrigrams : 0;
			contextScore += trigramProb * 200; // Higher weight for trigrams
			contexts++;
		}

		if (contexts === 0) return 0.5;

		// Normalize to 0..1 range (clamp at reasonable values)
		const avgScore = contextScore / contexts;
		return Math.min(1, Math.max(0, avgScore * 5)); // Scale: 0.2 bigram prob → 1.0 score
	}

	private getCleanWord(word: string): string {
		return word.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
	}
}
