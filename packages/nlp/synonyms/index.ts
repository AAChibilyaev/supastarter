/**
 * Synonym expansion module for AACsearch NLP pipeline.
 * Supports English WordNet, Russian RuWordNet, embedding-based (Word2Vec),
 * and custom synonym sources.
 */

export { WordNet } from "./wordnet";
export type { SynonymResult, WordNetOptions } from "./wordnet";

export { RuWordNet, BUILTIN_RU_ENTRY_COUNT } from "./ruwordnet";
export type { RuWordNetOptions } from "./ruwordnet";

export {
	WordEmbeddingStore,
	cosineSimilarity,
	euclideanDistance,
	wordMoversDistance,
} from "./embeddings";
export type { EmbeddingVector, EmbeddingProvider } from "./embeddings";

export { SynonymExpander } from "./expansion";
export type { SynonymSource, SynonymExpanderConfig, ExpandedSynonym } from "./expansion";
