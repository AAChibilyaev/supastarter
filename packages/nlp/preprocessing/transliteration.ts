/**
 * Transliteration: Cyrillic ↔ Latin conversion.
 * Supports ISO 9:1995, GOST 7.79-2000 (System A/B), and Volapuk (Yoficon).
 */

export type TransliterationStandard = "iso9" | "gost_a" | "gost_b" | "volapuk";

// ISO 9:1995 — unidirectional Cyrillic → Latin (reversible)
const ISO9_CYR_TO_LAT: Record<string, string> = {
	А: "A",
	а: "a",
	Б: "B",
	б: "b",
	В: "V",
	в: "v",
	Г: "G",
	г: "g",
	Д: "D",
	д: "d",
	Е: "E",
	е: "e",
	Ё: "Ë",
	ё: "ë",
	Ж: "Ž",
	ж: "ž",
	З: "Z",
	з: "z",
	И: "I",
	и: "i",
	Й: "J",
	й: "j",
	К: "K",
	к: "k",
	Л: "L",
	л: "l",
	М: "M",
	м: "m",
	Н: "N",
	н: "n",
	О: "O",
	о: "o",
	П: "P",
	п: "p",
	Р: "R",
	р: "r",
	С: "S",
	с: "s",
	Т: "T",
	т: "t",
	У: "U",
	у: "u",
	Ф: "F",
	ф: "f",
	Х: "H",
	х: "h",
	Ц: "C",
	ц: "c",
	Ч: "Č",
	ч: "č",
	Ш: "Š",
	ш: "š",
	Щ: "Ŝ",
	щ: "ŝ",
	Ъ: "ʺ",
	ъ: "ʺ",
	Ы: "Y",
	ы: "y",
	Ь: "ʹ",
	ь: "ʹ",
	Э: "È",
	э: "è",
	Ю: "Û",
	ю: "û",
	Я: "Â",
	я: "â",
	"№": "#",
};

// Reverse mapping: Latin → Cyrillic (ISO 9)
const ISO9_LAT_TO_CYR: Record<string, string> = {};
for (const [cyr, lat] of Object.entries(ISO9_CYR_TO_LAT)) {
	ISO9_LAT_TO_CYR[lat] = cyr;
}

// GOST 7.79-2000 System A
const GOST_A_CYR_TO_LAT: Record<string, string> = {
	А: "A",
	а: "a",
	Б: "B",
	б: "b",
	В: "V",
	в: "v",
	Г: "G",
	г: "g",
	Д: "D",
	д: "d",
	Е: "E",
	е: "e",
	Ё: "Yo",
	ё: "yo",
	Ж: "Zh",
	ж: "zh",
	З: "Z",
	з: "z",
	И: "I",
	и: "i",
	Й: "J",
	й: "j",
	К: "K",
	к: "k",
	Л: "L",
	л: "l",
	М: "M",
	м: "m",
	Н: "N",
	н: "n",
	О: "O",
	о: "o",
	П: "P",
	п: "p",
	Р: "R",
	р: "r",
	С: "S",
	с: "s",
	Т: "T",
	т: "t",
	У: "U",
	у: "u",
	Ф: "F",
	ф: "f",
	Х: "Kh",
	х: "kh",
	Ц: "Cz",
	ц: "cz",
	Ч: "Ch",
	ч: "ch",
	Ш: "Sh",
	ш: "sh",
	Щ: "Shh",
	щ: "shh",
	Ъ: "``",
	ъ: "``",
	Ы: "Y`",
	ы: "y`",
	Ь: "`",
	ь: "`",
	Э: "E`",
	э: "e`",
	Ю: "Yu",
	ю: "yu",
	Я: "Ya",
	я: "ya",
};

// GOST 7.79-2000 System B (simplified — no diacritics, uses digraphs)
const GOST_B_CYR_TO_LAT: Record<string, string> = {
	А: "A",
	а: "a",
	Б: "B",
	б: "b",
	В: "V",
	в: "v",
	Г: "G",
	г: "g",
	Д: "D",
	д: "d",
	Е: "E",
	е: "e",
	Ё: "Yo",
	ё: "yo",
	Ж: "Zh",
	ж: "zh",
	З: "Z",
	з: "z",
	И: "I",
	и: "i",
	Й: "Y",
	й: "y",
	К: "K",
	к: "k",
	Л: "L",
	л: "l",
	М: "M",
	м: "m",
	Н: "N",
	н: "n",
	О: "O",
	о: "o",
	П: "P",
	п: "p",
	Р: "R",
	р: "r",
	С: "S",
	с: "s",
	Т: "T",
	т: "t",
	У: "U",
	у: "u",
	Ф: "F",
	ф: "f",
	Х: "Kh",
	х: "kh",
	Ц: "Ts",
	ц: "ts",
	Ч: "Ch",
	ч: "ch",
	Ш: "Sh",
	ш: "sh",
	Щ: "Shch",
	щ: "shch",
	Ъ: "",
	ъ: "",
	Ы: "Y",
	ы: "y",
	Ь: "",
	ь: "",
	Э: "E",
	э: "e",
	Ю: "Yu",
	ю: "yu",
	Я: "Ya",
	я: "ya",
};

// Volapuk (Yoficon) — informal Cyrillic → Latin mapping used in early internet / SMS
const VOLAPUK_CYR_TO_LAT: Record<string, string> = {
	А: "A",
	а: "a",
	Б: "B",
	б: "b",
	"6": "b",
	В: "V",
	в: "v",
	Г: "G",
	г: "g",
	Д: "D",
	д: "d",
	Е: "E",
	е: "e",
	Ё: "Yo",
	ё: "yo",
	Ж: "Zh",
	ж: "zh",
	"}|{": "zh",
	З: "Z",
	з: "z",
	"3": "z",
	И: "I",
	и: "i",
	Й: "Y",
	й: "y",
	К: "K",
	к: "k",
	Л: "L",
	л: "l",
	М: "M",
	м: "m",
	Н: "H",
	н: "h",
	О: "O",
	о: "o",
	"0": "o",
	П: "P",
	п: "p",
	n: "p",
	Р: "R",
	р: "r",
	С: "C",
	с: "c",
	Т: "T",
	т: "t",
	У: "U",
	у: "u",
	Ф: "F",
	ф: "f",
	Х: "X",
	х: "x",
	Ц: "C",
	ц: "c",
	Ч: "Ch",
	ч: "ch",
	"4": "ch",
	Ш: "Sh",
	ш: "sh",
	Щ: "Shch",
	щ: "shch",
	Ъ: "",
	ъ: "",
	Ы: "Y",
	ы: "y",
	Ь: "",
	ь: "",
	Э: "E",
	э: "e",
	Ю: "Yu",
	ю: "yu",
	Я: "Ya",
	я: "ya",
};

function applyTransliteration(text: string, mapping: Record<string, string>): string {
	let result = "";
	for (const char of text) {
		result += mapping[char] ?? char;
	}
	return result;
}

/**
 * Detect if Latin text looks like Russian transliterated text.
 * Heuristic: if the text matches common Russian word patterns written in Latin letters.
 */
export function looksLikeRussianTranslit(text: string): boolean {
	if (!text || /[\u0400-\u04FF]/.test(text)) return false;

	// Only check Latin text
	const latinOnly = text.replace(/[^a-zA-Z\s]/g, "").toLowerCase();
	if (latinOnly.length < 4) return false;

	// Common transliteration patterns that indicate Russian origin
	const russianTranslitPatterns = [
		/\bprivet\b/,
		/\bzdravstvuyte\b/,
		/\bzdraste\b/,
		/\bspasibo\b/,
		/\bposhaluista\b/,
		/\bpzhalsta\b/,
		/\bhorosho\b/,
		/\bploho\b/,
		/\bkrasivo\b/,
		/\bbolshoy\b/,
		/\bmalenkiy\b/,
		/\bochen\b/,
		/\bkak\b/,
		/\bchto\b/,
		/\bkogda\b/,
		/\bgde\b/,
		/\bpochemu\b/,
		/\bzachem\b/,
		/\bkotoryy\b/,
		/\bdobryy\b/,
		/\bnovyy\b/,
		/\bstaryy\b/,
		/\brabota\b/,
		/\bchelovek\b/,
		/\bvremya\b/,
		/\bden\b/,
		/\bnoch\b/,
		/\butro\b/,
		/zavtra\b/,
		/\bsegodnya\b/,
		/\bvchera\b/,
		/\bteper\b/,
		/\bnuzhno\b/,
		/\bmozhno\b/,
		/\bnelzya\b/,
		/\bya\b/,
		/\bty\b/,
		/\boni\b/,
		/\bmy\b/,
		/\bona\b/,
		/\bono\b/,
		/\bon\b/,
		/\bshto\b/,
		/\bisho\b/,
		/\btolko\b/,
		/\bzdes\b/,
		/\btut\b/,
		/\btam\b/,
		/\bvoobshche\b/,
		/\buzhe\b/,
		/\byzhe\b/,
		/\beschyo\b/,
		/shch/gi,
		/kh\w/gi,
		/zh\w/gi,
		/yu\w/gi,
		/ya\w/gi,
		/ye\w/gi,
		/yo\w/gi,
		/ts\w/gi,
		/ch\w/gi,
	];

	let score = 0;
	for (const pattern of russianTranslitPatterns) {
		if (pattern.test(latinOnly)) score++;
	}

	return score >= 2;
}

/**
 * Auto-detect the most likely transliteration direction based on text content.
 * Returns "cyr_to_lat" if cyrillic, "lat_to_cyr" if Latin but looks like Russian translit, or null.
 */
export function detectTransliterationDirection(text: string): "cyr_to_lat" | "lat_to_cyr" | null {
	if (!text) return null;

	// Check for Cyrillic characters
	const hasCyrillic = /[\u0400-\u04FF]/.test(text);
	if (hasCyrillic) return "cyr_to_lat";

	// Check if Latin text looks like Russian transliteration
	if (looksLikeRussianTranslit(text)) return "lat_to_cyr";

	return null;
}

/**
 * Transliterate text between Cyrillic and Latin scripts.
 *
 * @param text - The text to transliterate
 * @param from - Source script ("lat" | "cyr")
 * @param to - Target script ("lat" | "cyr")
 * @param standard - Transliteration standard (default: "gost_b")
 */
export function transliterate(
	text: string,
	from: "lat" | "cyr",
	to: "lat" | "cyr",
	standard: TransliterationStandard = "gost_b",
): string {
	if (!text || from === to) return text;

	// Cyrillic → Latin
	if (from === "cyr" && to === "lat") {
		switch (standard) {
			case "iso9":
				return applyTransliteration(text, ISO9_CYR_TO_LAT);
			case "gost_a":
				return applyTransliteration(text, GOST_A_CYR_TO_LAT);
			case "gost_b":
				return applyTransliteration(text, GOST_B_CYR_TO_LAT);
			case "volapuk":
				return applyTransliteration(text, VOLAPUK_CYR_TO_LAT);
		}
	}

	// Latin → Cyrillic (reverse transliteration — best-effort)
	if (from === "lat" && to === "cyr") {
		// Multi-character mappings first (longest match)
		const multiCharMap: Record<string, Record<string, string>> = {
			iso9: {
				Zh: "Ж",
				zh: "ж",
				Kh: "Х",
				kh: "х",
				Sh: "Ш",
				sh: "ш",
				Ch: "Ч",
				ch: "ч",
				Shh: "Щ",
				shh: "щ",
				Yo: "Ё",
				yo: "ё",
				Yu: "Ю",
				yu: "ю",
				Ya: "Я",
				ya: "я",
			},
			gost_a: {
				Shh: "Щ",
				shh: "щ",
				Yo: "Ё",
				yo: "ё",
				Zh: "Ж",
				zh: "ж",
				Kh: "Х",
				kh: "х",
				Cz: "Ц",
				cz: "ц",
				Ch: "Ч",
				ch: "ч",
				Sh: "Ш",
				sh: "ш",
				Yu: "Ю",
				yu: "ю",
				Ya: "Я",
				ya: "я",
			},
			gost_b: {
				Shch: "Щ",
				shch: "щ",
				Yo: "Ё",
				yo: "ё",
				Zh: "Ж",
				zh: "ж",
				Kh: "Х",
				kh: "х",
				Ts: "Ц",
				ts: "ц",
				Ch: "Ч",
				ch: "ч",
				Sh: "Ш",
				sh: "ш",
				Yu: "Ю",
				yu: "ю",
				Ya: "Я",
				ya: "я",
			},
			volapuk: {
				Shch: "Щ",
				shch: "щ",
				Yo: "Ё",
				yo: "ё",
				Zh: "Ж",
				zh: "ж",
				"}|{": "ж",
				Ch: "Ч",
				ch: "ч",
				"4": "ч",
				Sh: "Ш",
				sh: "ш",
				Yu: "Ю",
				yu: "ю",
				Ya: "Я",
				ya: "я",
			},
		};

		const multiMap = multiCharMap[standard] ?? multiCharMap.gost_b;

		// Sort by length descending to match longer sequences first
		const sortedMappings = Object.entries(multiMap).sort(([a], [b]) => b.length - a.length);

		let result = text;
		for (const [lat, cyr] of sortedMappings) {
			result = result.replace(new RegExp(lat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), cyr);
		}

		// Single character mapping
		if (standard === "iso9") {
			result = applyTransliteration(result, ISO9_LAT_TO_CYR);
		}

		return result;
	}

	return text;
}

/**
 * Convenience: transliterate Cyrillic to Latin (GOST B default).
 */
export function transliterateToLatin(
	text: string,
	standard: TransliterationStandard = "gost_b",
): string {
	return transliterate(text, "cyr", "lat", standard);
}

/**
 * Convenience: transliterate Latin to Cyrillic (GOST B default).
 */
export function transliterateToCyrillic(
	text: string,
	standard: TransliterationStandard = "gost_b",
): string {
	return transliterate(text, "lat", "cyr", standard);
}
