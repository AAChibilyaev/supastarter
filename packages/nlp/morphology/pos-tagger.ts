/**
 * Rule-based POS tagger for AACsearch NLP pipeline.
 * Pure TypeScript — no external dependencies.
 */

import type { StemmerLanguage } from "./stemmer";

export type PartOfSpeech =
	| "noun"
	| "verb"
	| "adjective"
	| "adverb"
	| "preposition"
	| "conjunction"
	| "pronoun"
	| "determiner"
	| "numeral"
	| "particle"
	| "interjection"
	| "unknown";

export interface TaggedWord {
	word: string;
	pos: PartOfSpeech;
	lemma: string;
}

/** English closed-class words */
const EN_CLOSED: Record<string, PartOfSpeech> = {
	the: "determiner",
	a: "determiner",
	an: "determiner",
	this: "determiner",
	that: "determiner",
	these: "determiner",
	those: "determiner",
	my: "determiner",
	your: "determiner",
	his: "determiner",
	her: "determiner",
	its: "determiner",
	our: "determiner",
	their: "determiner",
	in: "preposition",
	on: "preposition",
	at: "preposition",
	to: "preposition",
	for: "preposition",
	with: "preposition",
	by: "preposition",
	from: "preposition",
	of: "preposition",
	about: "preposition",
	into: "preposition",
	through: "preposition",
	during: "preposition",
	before: "preposition",
	after: "preposition",
	between: "preposition",
	under: "preposition",
	over: "preposition",
	and: "conjunction",
	or: "conjunction",
	but: "conjunction",
	nor: "conjunction",
	yet: "conjunction",
	so: "conjunction",
	because: "conjunction",
	if: "conjunction",
	when: "conjunction",
	while: "conjunction",
	although: "conjunction",
	since: "conjunction",
	unless: "conjunction",
	i: "pronoun",
	you: "pronoun",
	he: "pronoun",
	she: "pronoun",
	it: "pronoun",
	we: "pronoun",
	they: "pronoun",
	me: "pronoun",
	him: "pronoun",
	us: "pronoun",
	them: "pronoun",
	who: "pronoun",
	whom: "pronoun",
	which: "pronoun",
	what: "pronoun",
};

/** English suffix → POS patterns */
const EN_SUFFIX_RULES: [RegExp, PartOfSpeech][] = [
	[/tion$/, "noun"],
	[/sion$/, "noun"],
	[/ment$/, "noun"],
	[/ness$/, "noun"],
	[/ity$/, "noun"],
	[/ance$/, "noun"],
	[/ence$/, "noun"],
	[/ship$/, "noun"],
	[/dom$/, "noun"],
	[/ist$/, "noun"],
	[/ism$/, "noun"],
	[/er$/, "noun"],
	[/or$/, "noun"],
	[/ee$/, "noun"],
	[/ing$/, "noun"],
	[/logy$/, "noun"],
	[/able$/, "adjective"],
	[/ible$/, "adjective"],
	[/al$/, "adjective"],
	[/ful$/, "adjective"],
	[/less$/, "adjective"],
	[/ous$/, "adjective"],
	[/ive$/, "adjective"],
	[/ic$/, "adjective"],
	[/ical$/, "adjective"],
	[/ent$/, "adjective"],
	[/ant$/, "adjective"],
	[/ary$/, "adjective"],
	[/ish$/, "adjective"],
	[/like$/, "adjective"],
	[/some$/, "adjective"],
	[/ly$/, "adverb"],
	[/ward$/, "adverb"],
	[/wise$/, "adverb"],
	[/ize$/, "verb"],
	[/ise$/, "verb"],
	[/ate$/, "verb"],
	[/ify$/, "verb"],
	[/en$/, "verb"],
];

/** Russian suffix → POS patterns */
const RU_SUFFIX_RULES: [RegExp, PartOfSpeech][] = [
	// Nouns
	[/ость$/, "noun"],
	[/ение$/, "noun"],
	[/ание$/, "noun"],
	[/ция$/, "noun"],
	[/ство$/, "noun"],
	[/тель$/, "noun"],
	[/ник$/, "noun"],
	[/щик$/, "noun"],
	[/чик$/, "noun"],
	[/ок$/, "noun"],
	[/ец$/, "noun"],
	[/ица$/, "noun"],
	[/ист$/, "noun"],
	[/изм$/, "noun"],
	[/лог$/, "noun"],
	// Adjectives
	[/ый$/, "adjective"],
	[/ий$/, "adjective"],
	[/ой$/, "adjective"],
	[/ая$/, "adjective"],
	[/яя$/, "adjective"],
	[/ое$/, "adjective"],
	[/ее$/, "adjective"],
	[/ые$/, "adjective"],
	[/ие$/, "adjective"],
	[/ский$/, "adjective"],
	[/ический$/, "adjective"],
	[/овый$/, "adjective"],
	[/евый$/, "adjective"],
	[/альный$/, "adjective"],
	[/ильный$/, "adjective"],
	// Verbs (infinitive)
	[/ить$/, "verb"],
	[/ать$/, "verb"],
	[/ять$/, "verb"],
	[/еть$/, "verb"],
	[/оть$/, "verb"],
	[/уть$/, "verb"],
	[/ыть$/, "verb"],
	[/сти$/, "verb"],
	[/зти$/, "verb"],
	[/чь$/, "verb"],
	// Adverbs
	[/о$/, "adverb"],
	[/е$/, "adverb"],
	[/ски$/, "adverb"],
	[/ому$/, "adverb"],
];

/** Common Russian function words */
const RU_CLOSED: Record<string, PartOfSpeech> = {
	и: "conjunction",
	в: "preposition",
	на: "preposition",
	с: "preposition",
	к: "preposition",
	у: "preposition",
	о: "preposition",
	по: "preposition",
	за: "preposition",
	из: "preposition",
	от: "preposition",
	до: "preposition",
	без: "preposition",
	для: "preposition",
	через: "preposition",
	между: "preposition",
	над: "preposition",
	перед: "preposition",
	при: "preposition",
	об: "preposition",
	про: "preposition",
	но: "conjunction",
	а: "conjunction",
	да: "conjunction",
	или: "conjunction",
	если: "conjunction",
	что: "conjunction",
	чтобы: "conjunction",
	потому: "conjunction",
	так: "conjunction",
	как: "conjunction",
	когда: "conjunction",
	хотя: "conjunction",
	я: "pronoun",
	ты: "pronoun",
	он: "pronoun",
	она: "pronoun",
	оно: "pronoun",
	мы: "pronoun",
	вы: "pronoun",
	они: "pronoun",
	меня: "pronoun",
	тебя: "pronoun",
	его: "pronoun",
	её: "pronoun",
	нас: "pronoun",
	вас: "pronoun",
	них: "pronoun",
	этот: "determiner",
	эта: "determiner",
	это: "determiner",
	эти: "determiner",
	тот: "determiner",
	та: "determiner",
	те: "determiner",
	мой: "determiner",
	твой: "determiner",
	наш: "determiner",
	ваш: "determiner",
	не: "particle",
	ни: "particle",
	же: "particle",
	ли: "particle",
	бы: "particle",
	ведь: "particle",
	вот: "particle",
	даже: "particle",
	уже: "particle",
	только: "particle",
};

/**
 * Tag a single word with its part of speech.
 */
export function tagWord(word: string, language: StemmerLanguage = "en"): PartOfSpeech {
	if (!word || word.length < 2) return "unknown";

	const w = word.toLowerCase();

	// Check closed-class dictionaries first
	if (language === "en" && EN_CLOSED[w]) return EN_CLOSED[w];
	if (language === "ru" && RU_CLOSED[w]) return RU_CLOSED[w];

	// Check suffix rules
	const rules = language === "ru" ? RU_SUFFIX_RULES : EN_SUFFIX_RULES;
	for (const [pattern, pos] of rules) {
		if (pattern.test(w)) return pos;
	}

	// Numerals
	if (/^\d+/.test(w)) return "numeral";

	return "noun";
}

/**
 * Tag all words in a text with parts of speech.
 */
export function tagText(
	text: string,
	language: StemmerLanguage = "en",
	stem?: (word: string, lang: StemmerLanguage) => string,
	lem?: (word: string, lang: StemmerLanguage) => string,
): TaggedWord[] {
	if (!text) return [];

	const words = text.split(/\s+/).filter(Boolean);

	return words.map((w) => {
		const clean = w.replace(/[^\p{L}\p{N}]/gu, "");
		if (!clean) return { word: w, pos: "unknown" as PartOfSpeech, lemma: w };

		return {
			word: clean,
			pos: tagWord(clean, language),
			lemma: lem ? lem(clean, language) : clean,
		};
	});
}
