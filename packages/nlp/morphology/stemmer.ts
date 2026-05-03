/**
 * Multi-language stemmer for AACsearch NLP pipeline.
 * Implements Porter Stemmer (EN) and a rule-based stemmer (RU)
 * with a unified interface.
 */

export type StemmerLanguage = "en" | "ru" | "de" | "es" | "fr";

/** Porter Stemmer for English (standard algorithm) */
function porterStemmer(word: string): string {
	if (word.length < 3) return word;

	const w = word.toLowerCase();
	let stem = w;

	// Step 1a: plurals and -ed/-ing
	stem = stem.replace(/sses$/g, "ss");
	stem = stem.replace(/ies$/g, "i");
	stem = stem.replace(/ss$/g, "ss");
	stem = stem.replace(/s$/g, "");

	// Step 1b: -eed, -ed, -ing
	if (/eed$/.test(stem)) {
		stem = stem.replace(/eed$/, "ee");
	} else if (/([aeiouy].*)(ed|ing)$/i.test(stem)) {
		stem = stem.replace(/ed$/, "");
		stem = stem.replace(/ing$/, "");
		if (/(at|bl|iz)$/.test(stem)) {
			stem += "e";
		} else if (/([^aeiouylsz])\1$/.test(stem)) {
			stem = stem.slice(0, -1);
		} else if (/^[^aeiouy][aeiouy][^aeiouywx]$/.test(stem)) {
			stem += "e";
		}
	}

	// Step 1c: -y → -i
	if (/[aeiouy].*y$/.test(stem)) {
		stem = stem.replace(/y$/, "i");
	}

	// Step 2: common suffixes
	const step2: [RegExp, string][] = [
		[/ational$/, "ate"],
		[/tional$/, "tion"],
		[/enci$/, "ence"],
		[/anci$/, "ance"],
		[/izer$/, "ize"],
		[/abli$/, "able"],
		[/alli$/, "al"],
		[/entli$/, "ent"],
		[/eli$/, "e"],
		[/ousli$/, "ous"],
		[/ization$/, "ize"],
		[/ation$/, "ate"],
		[/ator$/, "ate"],
		[/alism$/, "al"],
		[/iveness$/, "ive"],
		[/fulness$/, "ful"],
		[/ousness$/, "ous"],
		[/aliti$/, "al"],
		[/iviti$/, "ive"],
		[/biliti$/, "ble"],
	];

	for (const [pattern, replacement] of step2) {
		if (pattern.test(stem)) {
			stem = stem.replace(pattern, replacement);
			break;
		}
	}

	// Step 3: -icate → -ic, etc.
	const step3: [RegExp, string][] = [
		[/icate$/, "ic"],
		[/ative$/, ""],
		[/alize$/, "al"],
		[/iciti$/, "ic"],
		[/ical$/, "ic"],
		[/ful$/, ""],
		[/ness$/, ""],
	];

	for (const [pattern, replacement] of step3) {
		if (pattern.test(stem)) {
			stem = stem.replace(pattern, replacement);
			break;
		}
	}

	// Step 4: -ment, -ence, etc.
	const step4: RegExp[] = [
		/ement$/,
		/ment$/,
		/ance$/,
		/ence$/,
		/able$/,
		/ible$/,
		/ant$/,
		/ent$/,
		/ion$/,
		/ism$/,
		/ate$/,
		/iti$/,
		/ous$/,
		/ive$/,
		/ize$/,
	];

	for (const pattern of step4) {
		if (pattern.test(stem) && stem.length >= 5) {
			stem = stem.replace(pattern, "");
			break;
		}
	}

	// Step 5a: -e removal
	if (/e$/.test(stem)) {
		if (stem.length >= 4 && /[^aeiouy][aeiouy][^aeiouy]e$/.test(stem)) {
			// keep -e for short stems
		} else {
			stem = stem.replace(/e$/, "");
		}
	}

	// Step 5b: -ll → -l
	if (/ll$/.test(stem) && stem.length >= 4) {
		stem = stem.replace(/l$/, "");
	}

	return stem;
}

/** Common Russian suffixes for stemming */
const RUSSIAN_SUFFIXES = [
	// Adjective suffixes (longest first)
	"ейшими",
	"ейшего",
	"ейшему",
	"ейшими",
	"ейшем",
	"ейшая",
	"ейшее",
	"ейшие",
	"ейших",
	"ейшим",
	"ейшую",
	"ейше",
	"айшими",
	"айшего",
	"айшему",
	"айшими",
	"айшем",
	"айшая",
	"айшее",
	"айшие",
	"айших",
	"айшим",
	"айшую",
	"яйшими",
	"яйшего",
	"яйшему",
	"яйшими",
	"яйшем",
	"яйшая",
	"яйшее",
	"яйшие",
	"яйших",
	"яйшим",
	"яйшую",
	// Participle suffixes
	"вшимися",
	"вшимся",
	"вшемся",
	"вшаяся",
	"вшееся",
	"вшими",
	"нными",
	"нного",
	"нному",
	"нная",
	"нное",
	"нные",
	"нных",
	"тыми",
	"того",
	"тому",
	"тая",
	"тое",
	"тые",
	"тых",
	// Verb suffixes
	"ывали",
	"ивали",
	"ывать",
	"ивать",
	"овали",
	"овала",
	"овало",
	"овали",
	"овать",
	"овал",
	"ываю",
	"ывае",
	"ыва",
	"иваю",
	"ивае",
	"ива",
	"оваю",
	"овае",
	"ова",
	// Noun suffixes
	"ения",
	"ение",
	"ений",
	"енью",
	"енье",
	"ации",
	"ация",
	"аций",
	"ости",
	"ость",
	"теля",
	"тель",
	"телю",
	"телем",
	"ника",
	"нику",
	"ником",
	"нике",
	"ства",
	"ство",
	"ством",
	"стве",
	"цами",
	"цами",
	"цами",
	// Common case endings
	"ами",
	"ями",
	"его",
	"ему",
	"ими",
	"ыми",
	"ая",
	"яя",
	"ое",
	"ее",
	"ие",
	"ые",
	"ого",
	"его",
	"ому",
	"ему",
	"им",
	"ым",
	"ую",
	"юю",
	"ом",
	"ем",
	"ой",
	"ей",
	"ых",
	"их",
	"ый",
	"ий",
	"ой",
	// Short endings
	"ах",
	"ях",
	"ам",
	"ям",
	"ой",
	"ей",
	"ой",
	"ей",
	"ов",
	"ев",
	"а",
	"я",
	"о",
	"е",
	"у",
	"ю",
	"и",
	"ы",
];

/** Simple Russian stemmer using suffix stripping */
function russianStemmer(word: string): string {
	const w = word.toLowerCase();
	if (w.length < 3) return w;

	let stem = w;

	// Remove reflexive suffix
	stem = stem.replace(/(сь|ся)$/, "");

	// Remove superlative
	stem = stem.replace(/(ейш|айш|яйш)$/, "");

	// Apply longest-matching suffix removal (up to 3 attempts)
	for (let attempt = 0; attempt < 3 && stem.length > 3; attempt++) {
		let removed = false;
		for (const suffix of RUSSIAN_SUFFIXES) {
			if (stem.endsWith(suffix) && stem.length - suffix.length >= 2) {
				stem = stem.slice(0, -suffix.length);
				removed = true;
				break;
			}
		}
		if (!removed) break;
	}

	return stem;
}

/** Basic German stemmer using suffix stripping */
function germanStemmer(word: string): string {
	const w = word.toLowerCase();
	let stem = w;

	// Remove common German suffixes
	stem = stem.replace(/(nissen|nisse|nisse)$/, "nis");
	stem = stem.replace(/(erinnen|erinn|innen)$/, "");
	stem = stem.replace(/(lichkeit|lichkeit|lich)$/, "");
	stem = stem.replace(/(ischen|ische|isch)$/, "");
	stem = stem.replace(/(ungen|ung)$/, "");
	stem = stem.replace(/(heiten|heit)$/, "");
	stem = stem.replace(/(keiten|keit)$/, "");
	stem = stem.replace(/(ungen|ung)$/, "");
	stem = stem.replace(/(tionen|tion)$/, "");
	stem = stem.replace(/(schaften|schaft)$/, "");
	stem = stem.replace(/(tums|tum)$/, "");
	stem = stem.replace(/(nten|nte|nd)$/, "");
	stem = stem.replace(/(ten|te)$/, "");
	stem = stem.replace(/(en|e|n|s)$/, "");

	return stem;
}

/** Basic Spanish/French stemmer */
function romanceStemmer(word: string): string {
	const w = word.toLowerCase();
	let stem = w;

	// Remove common Romance suffixes
	stem = stem.replace(/(mente)$/, "");
	stem = stem.replace(/(ciones|ción)$/, "");
	stem = stem.replace(/(mientos|miento)$/, "");
	stem = stem.replace(/(mientas|mienta)$/, "");
	stem = stem.replace(/(adores|ador)$/, "");
	stem = stem.replace(/(dores|dor)$/, "");
	stem = stem.replace(/(eras|era)$/, "");
	stem = stem.replace(/(istas|ista)$/, "");
	stem = stem.replace(/(ciones)$/, "");
	stem = stem.replace(/(siones|sión)$/, "");
	stem = stem.replace(/(ando|iendo)$/, "");
	stem = stem.replace(/(ados|ada|ado)$/, "");
	stem = stem.replace(/(idos|ida|ido)$/, "");
	stem = stem.replace(/(aba|ían|ía)$/, "");
	stem = stem.replace(/(aban|ían)$/, "");
	stem = stem.replace(/(aste|iste|ó)$/, "");
	stem = stem.replace(/(emos|imos)$/, "");
	stem = stem.replace(/(abas|ías)$/, "");
	stem = stem.replace(/(es|as|os|a|o|e)$/, "");

	return stem;
}

/**
 * Stem a word in the given language.
 * Falls back to the input word if language is unsupported.
 */
export function stem(word: string, language: StemmerLanguage = "en"): string {
	if (!word || word.length < 2) return word;

	switch (language) {
		case "en":
			return porterStemmer(word);
		case "ru":
			return russianStemmer(word);
		case "de":
			return germanStemmer(word);
		case "es":
		case "fr":
			return romanceStemmer(word);
		default:
			return word;
	}
}

/**
 * Detect the most likely language for stemming based on character range.
 */
export function detectStemmerLanguage(text: string): StemmerLanguage {
	// Count Cyrillic characters
	const cyrillicCount = (text.match(/[\u0400-\u04FF]/g) || []).length;
	if (cyrillicCount > text.length * 0.3) return "ru";

	// Simple detection for European languages via common patterns
	const lower = text.toLowerCase();
	if (/ß|ä|ö|ü|sch|cht/.test(lower)) return "de";
	if (/ñ|ó|é|í|qu|gu[aeio]/.test(lower)) return "es";
	if (/œ|æ|é|è|ê|ç|ui|eu/.test(lower)) return "fr";

	return "en";
}

export const SUPPORTED_STEMMER_LANGUAGES: StemmerLanguage[] = ["en", "ru", "de", "es", "fr"];
