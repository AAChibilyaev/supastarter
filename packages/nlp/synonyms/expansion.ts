/**
 * SynonymExpander — orchestrates synonym expansion across multiple sources:
 * WordNet (EN), RuWordNet (RU), embedding-based (Word2Vec), and manual entries.
 * Merges, deduplicates, and ranks results.
 */

import { WordNet, type SynonymResult, type WordNetOptions } from "./wordnet";
import { RuWordNet, type RuWordNetOptions } from "./ruwordnet";
import {
	WordEmbeddingStore,
	type EmbeddingProvider,
} from "./embeddings";

export interface SynonymSource {
	readonly name: string;
	lookup(word: string): SynonymResult[];
}

export interface SynonymExpanderConfig {
	/** Enable English WordNet thesaurus */
	enableWordNet?: boolean;
	/** Enable Russian RuWordNet thesaurus */
	enableRuWordNet?: boolean;
	/** Enable embedding-based similarity */
	enableEmbeddings?: boolean;
	/** WordNet options */
	wordNetOptions?: WordNetOptions;
	/** RuWordNet options */
	ruWordNetOptions?: RuWordNetOptions;
	/** Embedding store options */
	embeddingOptions?: { minSimilarity?: number };
	/** Maximum results overall */
	maxResults?: number;
	/** Minimum combined similarity score (0.0-1.0) */
	minScore?: number;
	/** Language hint for source selection */
	language?: "auto" | "ru" | "en" | "de" | "es" | "fr";
}

/**
 * Simple Latin/Cyrillic detection for language routing.
 */
function detectScript(text: string): "latin" | "cyrillic" | "mixed" {
	const latin = text.match(/[a-zA-Z]/g)?.length ?? 0;
	const cyrillic = text.match(/[а-яА-ЯёЁ]/g)?.length ?? 0;

	if (latin > 0 && cyrillic === 0) return "latin";
	if (cyrillic > 0 && latin === 0) return "cyrillic";
	return "mixed";
}

/**
 * Combined result from SynonymExpander with source tracking.
 */
export interface ExpandedSynonym extends SynonymResult {
	/** Which sources contributed this synonym */
	fromSources: string[];
}

/**
 * SynonymExpander orchestrator.
 * Combines multiple synonym sources and produces ranked, deduplicated results.
 */
export class SynonymExpander {
	private wordNet?: WordNet;
	private ruWordNet?: RuWordNet;
	private embeddingStore?: WordEmbeddingStore;

	private config: Required<SynonymExpanderConfig>;

	constructor(config: SynonymExpanderConfig = {}) {
		this.config = {
			enableWordNet: config.enableWordNet ?? true,
			enableRuWordNet: config.enableRuWordNet ?? true,
			enableEmbeddings: config.enableEmbeddings ?? false,
			wordNetOptions: config.wordNetOptions ?? {},
			ruWordNetOptions: config.ruWordNetOptions ?? {},
			embeddingOptions: config.embeddingOptions ?? {},
			maxResults: config.maxResults ?? 15,
			minScore: config.minScore ?? 0.3,
			language: config.language ?? "auto",
		};

		if (this.config.enableWordNet) {
			this.wordNet = new WordNet(this.config.wordNetOptions);
		}

		if (this.config.enableRuWordNet) {
			this.ruWordNet = new RuWordNet(this.config.ruWordNetOptions);
		}

		if (this.config.enableEmbeddings) {
			this.embeddingStore = new WordEmbeddingStore(
				this.config.embeddingOptions,
			);
		}
	}

	/**
	 * Set the embedding store for embedding-based synonym expansion.
	 */
	setEmbeddingStore(store: WordEmbeddingStore): void {
		this.embeddingStore = store;
		this.config.enableEmbeddings = true;
	}

	/**
	 * Load embeddings from a provider into the embedding store.
	 */
	async loadEmbeddings(
		provider: EmbeddingProvider,
		words: string[],
	): Promise<number> {
		if (!this.embeddingStore) {
			this.embeddingStore = new WordEmbeddingStore();
		}
		this.config.enableEmbeddings = true;
		return this.embeddingStore.loadFromProvider(provider, words);
	}

	/**
	 * Expand a word into synonyms from all enabled sources.
	 */
	expand(word: string, overrides?: Partial<SynonymExpanderConfig>): ExpandedSynonym[] {
		const config = { ...this.config, ...overrides };
		const normalized = word.toLowerCase().trim();

		if (!normalized) {
			return [];
		}

		const allResults: Map<string, ExpandedSynonym> = new Map();
		const script = detectScript(normalized);
		const lang = config.language === "auto"
			? (script === "cyrillic" ? "ru" : "en")
			: config.language;

		// 1. WordNet (English) — use for Latin script or explicit EN
		if (config.enableWordNet && this.wordNet && (lang === "en" || script !== "cyrillic")) {
			const results = this.wordNet.lookup(normalized, config.wordNetOptions);
			for (const r of results) {
				const key = r.word.toLowerCase();
				if (allResults.has(key)) {
					if (!allResults.get(key)!.fromSources.includes("wordnet")) {
						allResults.get(key)!.fromSources.push("wordnet");
					}
				} else {
					allResults.set(key, { ...r, fromSources: ["wordnet"] });
				}
			}
		}

		// 2. RuWordNet (Russian) — use for Cyrillic script or explicit RU
		if (config.enableRuWordNet && this.ruWordNet && (lang === "ru" || script === "cyrillic")) {
			const results = this.ruWordNet.lookup(normalized, config.ruWordNetOptions);
			for (const r of results) {
				const key = r.word.toLowerCase();
				if (allResults.has(key)) {
					if (!allResults.get(key)!.fromSources.includes("wordnet")) {
						allResults.get(key)!.fromSources.push("wordnet");
					}
				} else {
					allResults.set(key, { ...r, fromSources: ["ruwordnet"] });
				}
			}
		}

		// 3. Embedding-based nearest neighbors
		if (config.enableEmbeddings && this.embeddingStore) {
			const results = this.embeddingStore.findNearest(
				normalized,
				{ maxResults: config.maxResults, minSimilarity: config.minScore },
			);
			for (const r of results) {
				const key = r.word.toLowerCase();
				if (allResults.has(key)) {
					if (!allResults.get(key)!.fromSources.includes("embeddings")) {
						allResults.get(key)!.fromSources.push("embeddings");
					}
					// Take the higher similarity
					if (r.similarity > allResults.get(key)!.similarity) {
						allResults.get(key)!.similarity = r.similarity;
					}
				} else {
					allResults.set(key, { ...r, fromSources: ["embeddings"] });
				}
			}
		}

		// Convert to array, filter by minScore, sort by similarity descending
		let results = Array.from(allResults.values())
			.filter((r) => r.similarity >= config.minScore)
			.sort((a, b) => b.similarity - a.similarity);

		// Limit results
		if (results.length > config.maxResults!) {
			results = results.slice(0, config.maxResults);
		}

		return results;
	}

	/**
	 * Batch expand multiple words.
	 */
	expandBatch(
		words: string[],
		overrides?: Partial<SynonymExpanderConfig>,
	): Map<string, ExpandedSynonym[]> {
		const results = new Map<string, ExpandedSynonym[]>();
		for (const word of words) {
			results.set(word, this.expand(word, overrides));
		}
		return results;
	}

	/**
	 * Check if a word has synonyms in any enabled source.
	 */
	hasSynonyms(word: string): boolean {
		const normalized = word.toLowerCase().trim();
		if (this.wordNet?.has(normalized)) return true;
		if (this.ruWordNet?.has(normalized)) return true;
		if (this.embeddingStore?.has(normalized)) return true;
		return false;
	}

	/**
	 * Add custom synonym entries (domain-specific terms).
	 * For English: adds to WordNet. For Russian: adds to RuWordNet.
	 */
	addCustomEntries(
		entries: Record<string, Record<string, string[]>>,
		language: "en" | "ru" = "en",
	): void {
		if (language === "ru" && this.ruWordNet) {
			this.ruWordNet.addEntries(entries);
		} else if (this.wordNet) {
			this.wordNet.addEntries(entries);
		}
	}

	/**
	 * Expand a query string into all possible synonym forms.
	 * Replaces expandable words with their synonyms and generates
	 * expanded query variations.
	 */
	expandQuery(
		query: string,
		overrides?: Partial<SynonymExpanderConfig>,
	): string[] {
		const words = query.toLowerCase().split(/\s+/).filter(Boolean);
		const expandedWords: string[][] = [];

		for (const word of words) {
			const synonyms = this.expand(word, overrides);
			if (synonyms.length > 0) {
				// Keep original word + top 2 synonyms
				const alternatives = [
					word,
					...synonyms.slice(0, 2).map((s) => s.word),
				];
				expandedWords.push(alternatives);
			} else {
				expandedWords.push([word]);
			}
		}

		// Generate all combinations (Cartesian product)
		if (expandedWords.length === 0) return [];

		return cartesianProduct(expandedWords).map(
			(combo) => combo.join(" "),
		);
	}
}

/**
 * Cartesian product of arrays. Generates all combinations.
 */
function cartesianProduct<T>(arrays: T[][]): T[][] {
	return arrays.reduce<T[][]>(
		(acc, curr) => {
			return acc.flatMap((a) => curr.map((b) => [...a, b]));
		},
		[[]],
	);
}
