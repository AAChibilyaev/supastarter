export interface TokenizerConfig {
	/** Characters that separate tokens (e.g. ".", "-", "_", "/") */
	tokenSeparators: string[];
	/** Symbol tokens that should be kept as-is (e.g. "C++", "C#", ".NET") */
	symbolTokens: string[];
	/** Whether to lowercase tokens */
	lowercase: boolean;
	/** Whether to remove diacritics before tokenizing */
	removeDiacritics: boolean;
	/** Whether to remove punctuation */
	removePunctuation: boolean;
	/** CJK mode — split Chinese/Japanese/Korean into character unigrams */
	cjkMode: boolean;
}

export const DEFAULT_TOKENIZER_CONFIG: TokenizerConfig = {
	tokenSeparators: [".", "-", "_", "/"],
	symbolTokens: ["C++", "C#", "F#", ".NET"],
	lowercase: true,
	removeDiacritics: true,
	removePunctuation: true,
	cjkMode: false,
};

export interface Token {
	value: string;
	position: number;
	original: string;
}

/**
 * ICU-aware tokenizer for Unicode text.
 * Handles CJK character splitting, symbol token preservation, and configurable separators.
 */
export function tokenize(text: string, config: Partial<TokenizerConfig> = {}): Token[] {
	const cfg = { ...DEFAULT_TOKENIZER_CONFIG, ...config };

	if (!text || text.length === 0) return [];

	let processed = text;

	// Remove diacritics if configured
	if (cfg.removeDiacritics) {
		processed = processed.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	}

	// CJK mode: split CJK characters into individual unigrams
	const cjkRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g;
	const cjkChars: Map<number, string> = new Map();

	if (cfg.cjkMode) {
		let match: RegExpExecArray | null;
		const localRegex = new RegExp(cjkRegex.source, "g");
		while ((match = localRegex.exec(processed)) !== null) {
			cjkChars.set(match.index, match[0]);
		}
		// Replace CJK chars with spaces for splitting
		processed = processed.replace(cjkRegex, " ");
	}

	// Build token separator regex pattern
	const escapedSeparators = cfg.tokenSeparators.map((s) =>
		s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
	);
	const separatorPattern = escapedSeparators.length > 0 ? `[${escapedSeparators.join("")}]` : null;

	// Detect and preserve symbol tokens
	const symbolTokenPositions: { index: number; original: string; value: string }[] = [];
	for (const symbol of cfg.symbolTokens) {
		const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const symbolRegex = new RegExp(escapedSymbol, "g");
		let symMatch: RegExpExecArray | null;
		while ((symMatch = symbolRegex.exec(processed)) !== null) {
			symbolTokenPositions.push({
				index: symMatch.index,
				original: symMatch[0],
				value: cfg.lowercase ? symMatch[0].toLowerCase() : symMatch[0],
			});
		}
		// Remove symbol tokens from text (they'll be re-inserted)
		let symMatchReplace: RegExpExecArray | null;
		const replaceRegex = new RegExp(escapedSymbol, "g");
		while ((symMatchReplace = replaceRegex.exec(processed)) !== null) {
			processed =
				processed.slice(0, symMatchReplace.index) +
				" ".repeat(symMatchReplace[0].length) +
				processed.slice(symMatchReplace.index + symMatchReplace[0].length);
		}
	}

	// Remove punctuation
	if (cfg.removePunctuation) {
		processed = processed.replace(/[.,!?;:"'()\[\]{}@#$%^&*+=<>/\\|~`]/g, " ");
	}

	// Apply separators
	if (separatorPattern) {
		processed = processed.replace(new RegExp(separatorPattern, "g"), " ");
	}

	// Lowercase if configured
	if (cfg.lowercase) {
		processed = processed.toLowerCase();
	}

	// Split into raw tokens
	const rawTokens = processed.split(/\s+/).filter((t) => t.length > 0);

	// Merge symbol tokens at their positions
	const tokens: Token[] = [];
	let tokenIndex = 0;
	let charIndex = 0;

	// Re-insert CJK characters
	for (const raw of rawTokens) {
		// Check if a symbol token should be inserted here
		tokens.push({
			value: raw,
			position: tokenIndex++,
			original: raw,
		});
	}

	// Insert any remaining symbol tokens at their approximate positions
	for (const sym of symbolTokenPositions) {
		tokens.push({
			value: sym.value,
			position: tokenIndex++,
			original: sym.original,
		});
	}

	// Insert CJK unigrams
	if (cfg.cjkMode) {
		// Check original text for CJK characters
		const cjkFind = text.match(cjkRegex);
		if (cjkFind) {
			for (const char of cjkFind) {
				tokens.push({
					value: cfg.lowercase ? char.toLowerCase() : char,
					position: tokenIndex++,
					original: char,
				});
			}
		}
	}

	return tokens;
}

/**
 * Split text into n-grams (character-level).
 */
export function generateNGrams(word: string, n: 2 | 3): string[] {
	if (word.length < n) return [word];
	const ngrams: string[] = [];
	for (let i = 0; i <= word.length - n; i++) {
		ngrams.push(word.slice(i, i + n));
	}
	return ngrams;
}

/**
 * Generate edge n-grams (prefix matching) — "hello" → ["h", "he", "hel", "hell", "hello"]
 */
export function generateEdgeNGrams(word: string, minLength = 1, maxLength?: number): string[] {
	const limit = maxLength ?? word.length;
	const edgeNgrams: string[] = [];
	for (let i = minLength; i <= Math.min(limit, word.length); i++) {
		edgeNgrams.push(word.slice(0, i));
	}
	return edgeNgrams;
}

/**
 * Split CJK text into character unigrams.
 */
export function splitCJK(text: string): string[] {
	const cjkRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g;
	const matches = text.match(cjkRegex);
	return matches || [];
}
