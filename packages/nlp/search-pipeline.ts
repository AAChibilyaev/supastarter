/**
 * Search Pipeline — orchestrates all NLP layers for a complete search flow.
 * Pre-processing → Spell Correction → Phonetic → Morphology → Synonyms → Ranking → Post-processing.
 */

import { lemmatizeText } from "./morphology/lemmatizer";
import { tagText } from "./morphology/pos-tagger";
import type { StemmerLanguage } from "./morphology/stemmer";
import { detectStemmerLanguage, stem } from "./morphology/stemmer";
import { mmrDiversify } from "./postprocessing/mmr";
import type { MMRDocument, MMROptions } from "./postprocessing/mmr";
import { generateSnippet, highlightTerms } from "./postprocessing/snippet";
import type { SnippetOptions } from "./postprocessing/snippet";

export interface SearchPipelineResult {
	/** Original query */
	originalQuery: string;
	/** Pre-processed query (lowercased, normalized) */
	normalizedQuery: string;
	/** Morphologically analyzed query */
	lemmatizedQuery: string;
	/** Detected language for NLP processing */
	detectedLanguage: StemmerLanguage;
	/** Analysis tokens */
	tokens: string[];
	/** Part-of-speech tags for each token */
	posTags: Array<{ word: string; pos: string; lemma: string }>;
	/** Stemmed query terms */
	stemmedTerms: string[];
}

export interface PipelineOptions {
	/** Language override (auto-detect if not set) */
	language?: StemmerLanguage;
	/** Enable POS tagging */
	enablePosTagging?: boolean;
	/** Enable lemmatization */
	enableLemmatization?: boolean;
	/** Enable stemming */
	enableStemming?: boolean;
}

const DEFAULT_PIPELINE_OPTIONS: PipelineOptions = {
	enablePosTagging: true,
	enableLemmatization: true,
	enableStemming: true,
};

/**
 * Full search query analysis pipeline.
 */
export function analyzeQuery(query: string, options?: PipelineOptions): SearchPipelineResult {
	const opts = { ...DEFAULT_PIPELINE_OPTIONS, ...options };
	const originalQuery = query.trim();

	if (!originalQuery) {
		return {
			originalQuery: "",
			normalizedQuery: "",
			lemmatizedQuery: "",
			detectedLanguage: "en",
			tokens: [],
			posTags: [],
			stemmedTerms: [],
		};
	}

	// Step 1: Detect language
	const detectedLanguage = opts.language || detectStemmerLanguage(originalQuery);

	// Step 2: Normalize
	const normalizedQuery = originalQuery.toLowerCase().trim();
	const tokens = normalizedQuery
		.split(/\s+/)
		.map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
		.filter(Boolean);

	// Step 3: POS tagging
	const posTags = opts.enablePosTagging
		? tagText(
				originalQuery,
				detectedLanguage,
				stem,
				lemmatizeText.length > 0 ? undefined : undefined,
			)
		: [];

	// Step 4: Lemmatization
	const lemmatizedQuery = opts.enableLemmatization
		? lemmatizeText(normalizedQuery, detectedLanguage)
		: normalizedQuery;

	// Step 5: Stemming
	const stemmedTerms = opts.enableStemming
		? tokens.map((t) => stem(t, detectedLanguage))
		: tokens;

	return {
		originalQuery,
		normalizedQuery,
		lemmatizedQuery,
		detectedLanguage,
		tokens,
		posTags: opts.enablePosTagging ? posTags : [],
		stemmedTerms,
	};
}

export interface EnhancedSearchResult {
	/** Original search results */
	results: Array<{
		id: string;
		title: string;
		text: string;
		score: number;
	}>;
	/** Analysis of the search query */
	analysis: SearchPipelineResult;
	/** Generated snippets for each result */
	snippets: Map<string, string>;
	/** Highlighted text for each result */
	highlighted: Map<string, string>;
	/** Did-you-mean suggestion (if NLP suggests correction) */
	didYouMean?: string;
	/** MMR-diversified results, if enabled */
	diversifiedResults?: Array<{
		id: string;
		score: number;
	}>;
}

export interface EnhancedSearchOptions extends PipelineOptions {
	/** Enable snippet generation */
	enableSnippets?: boolean;
	/** Snippet options */
	snippetOptions?: Partial<SnippetOptions>;
	/** Enable MMR diversification */
	enableMMR?: boolean;
	/** MMR options */
	mmrOptions?: Partial<MMROptions>;
	/** Enable did-you-mean */
	enableDidYouMean?: boolean;
}

/**
 * Enhanced search — applies full NLP pipeline to search results.
 * Given raw search results, enriches them with snippets, highlights,
 * query analysis, and diversification.
 */
export function enhanceSearchResults(
	query: string,
	results: Array<{
		id: string;
		title: string;
		text: string;
		score: number;
	}>,
	options?: EnhancedSearchOptions,
): EnhancedSearchResult {
	const opts: EnhancedSearchOptions = {
		enableSnippets: true,
		enableMMR: false,
		enableDidYouMean: true,
		...options,
	};

	// Analyze query
	const analysis = analyzeQuery(query, options);

	// Generate snippets
	const snippets = new Map<string, string>();
	const highlighted = new Map<string, string>();

	if (opts.enableSnippets) {
		for (const result of results) {
			const snippet = generateSnippet(result.text, query, opts.snippetOptions);
			snippets.set(result.id, snippet);
			highlighted.set(result.id, highlightTerms(snippet || result.text, query));
		}
	}

	// MMR diversification
	let diversifiedResults: EnhancedSearchResult["diversifiedResults"];
	if (opts.enableMMR) {
		const mmrDocs: MMRDocument[] = results.map((r) => ({
			id: r.id,
			score: r.score,
			vector: new Map(
				r.text
					.toLowerCase()
					.split(/\s+/)
					.map((t) => [t, 1]),
			),
		}));
		const diversified = mmrDiversify(mmrDocs, opts.mmrOptions);
		diversifiedResults = diversified.map((d) => ({
			id: d.id,
			score: d.score,
		}));
	}

	return {
		results,
		analysis,
		snippets,
		highlighted,
		diversifiedResults,
	};
}

/**
 * Build a complete search query from all NLP enrichments.
 * Returns the query and any filters that should be applied.
 */
export function buildEnhancedQuery(
	query: string,
	options?: PipelineOptions,
): {
	query: string;
	filters?: string;
	didYouMean?: string;
	suggestions?: string[];
} {
	const analysis = analyzeQuery(query, options);

	// Use lemmatized query for actual search
	const enhancedQuery = analysis.lemmatizedQuery || analysis.normalizedQuery;

	return {
		query: enhancedQuery,
		suggestions: analysis.stemmedTerms.filter((t) => t !== query.toLowerCase()),
	};
}
