export {
	levenshteinDistance,
	damerauLevenshteinDistance,
	hammingDistance,
	jaroWinklerDistance,
	sorensenDiceCoefficient,
	jaccardDistance,
	tverskyDistance,
	smithWatermanDistance,
	needlemanWunschDistance,
	computeDistance,
	computeSimilarity,
	computeAllDistances,
	type DistanceType,
	type DistanceResult,
	DISTANCE_ALGORITHM_INFO,
} from "./distances";

export { SpellCorrector, type CorrectionOptions, type CorrectionResult } from "./corrector";

export { TrigramsIndex, ShingleMatcher } from "./ngrams";

export { SymSpell, type SymSpellOptions, type SymSpellSuggestion, DEFAULT_SYMSPELL_OPTIONS } from "./symspell";

export { ContextCorrector, type ContextCorrectionOptions, type ContextCorrectionResult, DEFAULT_CONTEXT_OPTIONS } from "./context-corrector";
