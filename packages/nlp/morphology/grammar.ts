/**
 * Basic grammar correction helpers for AACsearch NLP pipeline.
 * Focuses on common search-query grammar issues.
 */

import type { StemmerLanguage } from "./stemmer";

/** Known soft-sign errors in Russian (wrong -> correct) */
const RUSSIAN_SOFT_SIGN_FIXES: Record<string, string> = {
	// -тся vs -ться (third person vs infinitive)
	// Without context, prefer third person (more common in search)
};

/** Common Russian compound/split word fixes */
const RUSSIAN_COMPOUND_FIXES: Record<string, string> = {
	не: "", // "незнаю" → "не знаю" handled in text level
};

/**
 * Fix common soft-sign spelling errors in Russian text.
 * Pattern: words ending in -тся/-ться
 */
export function fixRussianSoftSign(text: string): string {
	if (!text) return text;

	// Fix -тся/-ться: if preceded by vowel or й, prefer -ться (infinitive)
	return text.replace(/([аеёиоуыэюяй])(тся|ться)\b/gi, (_match, before, ending) => {
		// Default to -ться (infinitive) after vowels
		return before + "ться";
	});
}

/** Common spelling errors from phonetic confusion */
const PHONETIC_FIXES: Record<string, string> = {
	// English
	teh: "the",
	recieve: "receive",
	wierd: "weird",
	beleive: "believe",
	acheive: "achieve",
	adress: "address",
	calender: "calendar",
	definately: "definitely",
	seperate: "separate",
	occured: "occurred",
	occurence: "occurrence",
	priviledge: "privilege",
	publically: "publicly",
	thier: "their",
	truely: "truly",
	untill: "until",
	wich: "which",
	// Russian common errors
	сдесь: "здесь",
	зделать: "сделать",
	здавать: "сдавать",
	збор: "сбор",
};

/**
 * Fix common phonetic spelling errors.
 */
export function fixPhoneticErrors(text: string): string {
	if (!text) return text;

	const words = text.split(/\s+/);
	return words
		.map((w) => {
			const lower = w.toLowerCase();
			if (PHONETIC_FIXES[lower]) {
				// Preserve original case for first letter if uppercase
				if (w[0]?.toUpperCase() === w[0] && w.length > 1) {
					return PHONETIC_FIXES[lower];
				}
				return PHONETIC_FIXES[lower];
			}
			return w;
		})
		.join(" ");
}

/**
 * Full grammar correction pipeline for a search query.
 */
export function correctGrammar(text: string, language: StemmerLanguage = "en"): string {
	if (!text) return text;

	let result = text;

	// Apply language-specific corrections
	if (language === "ru") {
		result = fixRussianSoftSign(result);
		result = fixPhoneticErrors(result);
	}

	if (language === "en") {
		result = fixPhoneticErrors(result);
	}

	return result;
}
