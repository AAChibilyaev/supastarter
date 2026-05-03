/**
 * Basic lemmatizer for AACsearch NLP pipeline.
 * Uses suffix-based rules and common word-form dictionaries.
 * Pure TypeScript — no external dependencies.
 */

import type { StemmerLanguage } from "./stemmer";

/**
 * Common English verb irregular forms.
 * Maps irregular past/past-participle → present.
 */
const ENGLISH_IRREGULAR: Record<string, string> = {
	ran: "run",
	running: "run",
	// Irregular - this is now a non-exhaustive sample showing patterns
	ate: "eat",
	eaten: "eat",
	drank: "drink",
	drunk: "drink",
	drove: "drive",
	driven: "drive",
	wrote: "write",
	written: "write",
	sang: "sing",
	sung: "sing",
	swam: "swim",
	swum: "swim",
	broke: "break",
	broken: "break",
	spoke: "speak",
	spoken: "speak",
	took: "take",
	taken: "take",
	began: "begin",
	begun: "begin",
	came: "come",
	became: "become",
	found: "find",
	gave: "give",
	given: "give",
	known: "know",
	went: "go",
	gone: "go",
	saw: "see",
	seen: "see",
	thought: "think",
	bought: "buy",
	brought: "bring",
	felt: "feel",
	kept: "keep",
	left: "leave",
	meant: "mean",
	met: "meet",
	paid: "pay",
	said: "say",
	sold: "sell",
	sent: "send",
	set: "set",
	showed: "show",
	shown: "show",
	spent: "spend",
	told: "tell",
	won: "win",
	understood: "understand",
};

/**
 * Common Russian word forms for lemmatization.
 * Maps inflected forms → dictionary form (infinitive/nominative).
 */
const RUSSIAN_WORD_FORMS: Record<string, string> = {
	// Sample common words — extensible dictionary
	люди: "человек",
	человека: "человек",
	человеку: "человек",
	человеком: "человек",
	человеке: "человек",
	детей: "ребенок",
	ребенка: "ребенок",
	ребенку: "ребенок",
	ребенком: "ребенок",
	детям: "ребенок",
	детьми: "ребенок",
	дети: "ребенок",
	годы: "год",
	года: "год",
	году: "год",
	годом: "год",
	годе: "год",
	лет: "год",
	// Verbs
	сказать: "говорить",
	сказал: "говорить",
	сказала: "говорить",
	сказали: "говорить",
	сделать: "делать",
	сделал: "делать",
	сделала: "делать",
	сделали: "делать",
	найти: "искать",
	нашел: "искать",
	нашла: "искать",
	нашли: "искать",
	// Adjectives
	большой: "большой",
	большая: "большой",
	большое: "большой",
	большие: "большой",
	большого: "большой",
	большому: "большой",
	большим: "большой",
	больших: "большой",
	маленький: "маленький",
	маленькая: "маленький",
	маленькое: "маленький",
	маленькие: "маленький",
};

/** English suffix-based lemmatization rules: [suffix, replacement] */
const ENGLISH_LEMMA_RULES: [RegExp, string][] = [
	[/sses$/, "ss"],
	[/ies$/, "y"],
	[/ves$/, "f"],
	[/xes$/, "x"],
	[/ches$/, "ch"],
	[/shes$/, "sh"],
	[/s$/, ""],
	[/ing$/, ""],
	[/ed$/, ""],
	[/en$/, ""],
	[/er$/, ""],
	[/est$/, ""],
	[/ly$/, ""],
	[/ness$/, ""],
	[/ment$/, ""],
	[/tion$/, "te"],
	[/sion$/, "de"],
	[/able$/, ""],
];

/** Russian suffix-based lemmatization rules */
const RUSSIAN_LEMMA_RULES: [RegExp, string][] = [
	[/ами$/, "а"],
	[/ями$/, "я"],
	[/ов$/, ""],
	[/ев$/, ""],
	[/ей$/, "я"],
	[/ем$/, "о"],
	[/ом$/, "о"],
	[/ам$/, "а"],
	[/ям$/, "я"],
	[/ах$/, "а"],
	[/ях$/, "я"],
	[/ой$/, "а"],
	[/ую$/, "а"],
	[/его$/, "ый"],
	[/ого$/, "ый"],
	[/ему$/, "ый"],
	[/ому$/, "ый"],
	[/им$/, "ый"],
	[/ым$/, "ый"],
	[/их$/, "ый"],
	[/ых$/, "ый"],
	[/ая$/, "ый"],
	[/яя$/, "ий"],
	[/ое$/, "ый"],
	[/ее$/, "ий"],
	[/ые$/, "ый"],
	[/ие$/, "ий"],
	[/ла$/, "ть"],
	[/ла$/, "ть"],
	[/ло$/, "ть"],
	[/ли$/, "ть"],
	[/л$/, "ть"],
	[/ет$/, "ть"],
	[/ит$/, "ть"],
	[/ат$/, "ть"],
	[/ят$/, "ть"],
	[/ут$/, "ть"],
	[/ют$/, "ть"],
	[/ешь$/, "ть"],
	[/ишь$/, "ть"],
	[/ете$/, "ть"],
	[/ите$/, "ть"],
	[/ем$/, "ть"],
	[/им$/, "ть"],
	[/ут$/, "ть"],
	[/ют$/, "ть"],
];

/**
 * Lemmatize a word — return its dictionary/canonical form.
 */
export function lemmatize(word: string, language: StemmerLanguage = "en"): string {
	if (!word || word.length < 2) return word;

	const w = word.toLowerCase();

	// Check irregular forms first
	if (language === "en" && ENGLISH_IRREGULAR[w]) {
		return ENGLISH_IRREGULAR[w];
	}
	if (language === "ru" && RUSSIAN_WORD_FORMS[w]) {
		return RUSSIAN_WORD_FORMS[w];
	}

	// Apply suffix rules
	const rules = language === "ru" ? RUSSIAN_LEMMA_RULES : ENGLISH_LEMMA_RULES;
	for (const [pattern, replacement] of rules) {
		if (pattern.test(w) && w.replace(pattern, replacement).length >= 2) {
			return w.replace(pattern, replacement);
		}
	}

	return w;
}

/**
 * Lemmatize a multi-word query or text.
 */
export function lemmatizeText(text: string, language?: StemmerLanguage): string {
	if (!text) return text;

	return text
		.split(/\s+/)
		.map((w) => lemmatize(w.replace(/[^\p{L}\p{N}]/gu, ""), language))
		.join(" ");
}
