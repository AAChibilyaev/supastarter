/**
 * Text normalization utilities: diacritics removal, Unicode normalization, punctuation stripping.
 */

/**
 * Unicode normalization modes for AACSearch.
 * NFC is the default for most use cases; NFD is used before diacritics removal.
 */
export type UnicodeNormalization = "NFC" | "NFD" | "NFKC" | "NFKD";

const DIACRITICS_MAP: Record<string, string> = {
	// Latin
	à: "a",
	á: "a",
	â: "a",
	ã: "a",
	ä: "a",
	å: "a",
	æ: "ae",
	ç: "c",
	è: "e",
	é: "e",
	ê: "e",
	ë: "e",
	ì: "i",
	í: "i",
	î: "i",
	ï: "i",
	ð: "d",
	ñ: "n",
	ò: "o",
	ó: "o",
	ô: "o",
	õ: "o",
	ö: "o",
	ø: "o",
	ù: "u",
	ú: "u",
	û: "u",
	ü: "u",
	ý: "y",
	þ: "th",
	ÿ: "y",
	// Latin uppercase
	À: "A",
	Á: "A",
	Â: "A",
	Ã: "A",
	Ä: "A",
	Å: "A",
	Æ: "AE",
	Ç: "C",
	È: "E",
	É: "E",
	Ê: "E",
	Ë: "E",
	Ì: "I",
	Í: "I",
	Î: "I",
	Ï: "I",
	Ð: "D",
	Ñ: "N",
	Ò: "O",
	Ó: "O",
	Ô: "O",
	Õ: "O",
	Ö: "O",
	Ø: "O",
	Ù: "U",
	Ú: "U",
	Û: "U",
	Ü: "U",
	Ý: "Y",
	Þ: "TH",
	ß: "ss",
	// German special
	ẞ: "SS",
};

/**
 * Remove diacritics from text (e.g. é → e, ü → u, ñ → n).
 * Uses explicit mapping for common accented characters and NFD decomposition as fallback.
 */
export function removeDiacritics(text: string): string {
	if (!text) return text;

	let result = "";
	for (const char of text) {
		result += DIACRITICS_MAP[char] ?? char;
	}

	// Fallback: NFD decomposition removes combining diacritical marks
	result = result.normalize("NFD").replace(/[\u0300-\u036f\u0483-\u0489]/g, "");

	return result;
}

/**
 * Normalize Unicode text to the specified form.
 * NFC (Canonical Composition) — default, preferred for storage
 * NFD (Canonical Decomposition) — for analysis before diacritics removal
 * NFKC (Compatibility Composition) — for search indexing (converts ﬁ → fi)
 * NFKD (Compatibility Decomposition) — max decomposition
 */
export function normalizeUnicode(text: string, form: UnicodeNormalization = "NFC"): string {
	if (!text) return text;
	return text.normalize(form);
}

/**
 * Remove punctuation characters from text.
 * Keeps letters, numbers, spaces, hyphens within words, and apostrophes within words.
 */
export function removePunctuation(text: string, keepHyphen = true, keepApostrophe = true): string {
	if (!text) return text;

	// Build a character class of punctuation to remove
	const toRemove = [
		".",
		",",
		"!",
		"?",
		":",
		";",
		'"',
		"'",
		"(",
		")",
		"[",
		"]",
		"{",
		"}",
		"@",
		"#",
		"$",
		"%",
		"^",
		"&",
		"*",
		"+",
		"=",
		"<",
		">",
		"/",
		"\\",
		"|",
		"~",
		"`",
	];

	if (!keepHyphen) toRemove.push("-");
	if (!keepApostrophe) toRemove.push("'", "`");

	// Escape special regex chars and create pattern
	const escaped = toRemove.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("");
	const pattern = new RegExp(`[${escaped}]`, "g");

	return text.replace(pattern, " ");
}

/**
 * Collapse multiple whitespace characters into a single space and trim.
 */
export function collapseWhitespace(text: string): string {
	if (!text) return text;
	return text.replace(/\s+/g, " ").trim();
}

/**
 * Full normalization pipeline: normalize → remove diacritics → remove punctuation → collapse whitespace.
 */
export function normalize(
	text: string,
	options?: {
		unicodeForm?: UnicodeNormalization;
		keepHyphen?: boolean;
		keepApostrophe?: boolean;
	},
): string {
	const { unicodeForm = "NFC", keepHyphen = true, keepApostrophe = true } = options ?? {};

	let result = normalizeUnicode(text, unicodeForm);
	result = removeDiacritics(result);
	result = removePunctuation(result, keepHyphen, keepApostrophe);
	result = collapseWhitespace(result);

	return result;
}
