/**
 * Phonetic algorithms for fuzzy matching by sound.
 * Includes standard algorithms (Soundex, Metaphone, Cologne) and
 * Russian-adapted versions (Russian Soundex, Russian Metaphone).
 */

export interface PhoneticResult {
	code: string;
	algorithm: string;
}

// ─── 1. SOUNDEX (RP1000) ──────────────────────────────────────────────────────

const SOUNDEX_MAP: Record<string, string> = {
	b: "1",
	f: "1",
	p: "1",
	v: "1",
	c: "2",
	g: "2",
	j: "2",
	k: "2",
	q: "2",
	s: "2",
	x: "2",
	z: "2",
	d: "3",
	t: "3",
	l: "4",
	m: "5",
	n: "5",
	r: "6",
};

/**
 * Soundex algorithm (RP1000 variant). Produces a 4-character code.
 * Example: "Robert" → "R163", "Rupert" → "R163", "Ashcraft" → "A261"
 */
export function soundex(word: string): string {
	if (!word) return "";

	const upper = word.toUpperCase();
	const first = upper[0];

	// Encode remaining letters
	let code = "";
	for (let i = 1; i < upper.length; i++) {
		const lower = upper[i].toLowerCase();
		const mapped = SOUNDEX_MAP[lower] ?? "";
		if (mapped && mapped !== code[code.length - 1]) {
			// Skip vowels and H/W (they separate same-code consonants)
			if (["a", "e", "i", "o", "u", "y", "h", "w"].includes(lower)) {
				continue;
			}
			if (mapped !== code.slice(-1)) {
				code += mapped;
			}
		}
	}

	// Pad or truncate to 3 digits
	code = code.padEnd(3, "0").slice(0, 3);

	return first + code;
}

// ─── 2. METAPHONE ─────────────────────────────────────────────────────────────

/**
 * Basic Metaphone algorithm. Produces a variable-length phonetic code.
 * Example: "Knight" → "NKT", "Smith" → "SM0"
 */
export function metaphone(word: string): string {
	if (!word) return "";

	let s = word.toUpperCase();
	let result = "";
	let pos = 0;

	// Drop duplicate adjacent letters (except C)
	let deduped = "";
	for (let i = 0; i < s.length; i++) {
		if (i > 0 && s[i] === s[i - 1] && s[i] !== "C") continue;
		deduped += s[i];
	}
	s = deduped;

	while (pos < s.length && result.length < 6) {
		const ch = s[pos];
		const next = s[pos + 1] ?? "";
		const prev = s[pos - 1] ?? "";

		// Skip vowels at start
		if (pos === 0 && /[AEIOU]/.test(ch)) {
			result += ch;
			pos++;
			continue;
		}

		// Skip non-letter
		if (!/[A-Z]/.test(ch)) {
			pos++;
			continue;
		}

		switch (ch) {
			case "B":
				if (pos > 0 || next === "B") break;
				result += "B";
				break;
			case "C":
				if (next === "H") {
					result += "X";
					pos++;
					break;
				}
				if (next === "K" || prev === "S") break;
				if (/[IEY]/.test(next) && prev !== "S") {
					result += "S";
					break;
				}
				result += "K";
				break;
			case "D":
				if (next === "G" && /[IEY]/.test(s[pos + 2] ?? "")) {
					result += "J";
					pos++;
					break;
				}
				result += "T";
				break;
			case "F":
				result += "F";
				break;
			case "G":
				if (next === "H" && !/[AEIOU]/.test(s[pos + 2] ?? "")) break;
				if (next === "N" && pos > 0 && pos < s.length - 1) break;
				if (next === "N" && pos === 0) {
					result += "N";
					pos++;
					break;
				}
				if (next === "E" || next === "I" || next === "Y") {
					result += "J";
					break;
				}
				result += "K";
				break;
			case "H":
				if (/[AEIOU]/.test(next) && !/[AEIOU]/.test(prev)) result += "H";
				break;
			case "J":
				result += "J";
				break;
			case "K":
				if (prev === "C") break;
				result += "K";
				break;
			case "L":
				result += "L";
				break;
			case "M":
				result += "M";
				break;
			case "N":
				result += "N";
				break;
			case "P":
				if (next === "H") {
					result += "F";
					pos++;
					break;
				}
				result += "P";
				break;
			case "Q":
				result += "K";
				break;
			case "R":
				result += "R";
				break;
			case "S":
				if (next === "H") {
					result += "X";
					pos++;
					break;
				}
				if (next === "I" && (s[pos + 2] ?? "") === "O" && (s[pos + 3] ?? "") === "N") {
					result += "X";
					pos += 2;
					break;
				}
				result += "S";
				break;
			case "T":
				if (next === "I" && (s[pos + 2] ?? "") === "O" && (s[pos + 3] ?? "") === "N") {
					result += "X";
					pos += 2;
					break;
				}
				if (next === "H") {
					result += "0";
					pos++;
					break;
				}
				result += "T";
				break;
			case "V":
				result += "F";
				break;
			case "W":
				if (/[AEIOU]/.test(next)) result += "W";
				break;
			case "X":
				result += "KS";
				pos++;
				break;
			case "Y":
				if (/[AEIOU]/.test(next)) result += "Y";
				break;
			case "Z":
				result += "S";
				break;
			default:
				// Skip (A, E, I, O, U)
				break;
		}
		pos++;
	}

	return result;
}

// ─── 3. DOUBLE METAPHONE ──────────────────────────────────────────────────────

/**
 * Double Metaphone: returns primary and secondary phonetic codes.
 * Secondary code handles alternative pronunciations.
 */
export function doubleMetaphone(word: string): { primary: string; secondary: string } {
	if (!word) return { primary: "", secondary: "" };

	let s = word.toUpperCase();
	let primary = "";
	let secondary = "";
	let pos = 0;
	const maxCode = 4;

	// Special Slavic/Germanic prefix handling
	if (s.startsWith("SCH")) {
		primary += "X";
		secondary += "X";
		pos = 2;
	}
	if (s.startsWith("CZ")) {
		primary += "X";
		secondary += "X";
		pos = 1;
	}
	if (s.startsWith("WR")) {
		primary += "R";
		secondary += "R";
		pos = 1;
	}

	while (pos < s.length) {
		const ch = s[pos];
		const next = s[pos + 1] ?? "";
		const next2 = s[pos + 2] ?? "";
		const prev = s[pos - 1] ?? "";

		if (primary.length >= maxCode && secondary.length >= maxCode) break;

		switch (ch) {
			case "A":
			case "E":
			case "I":
			case "O":
			case "U":
			case "Y":
				if (pos === 0) {
					primary += "A";
					secondary += "A";
				}
				break;
			case "B":
				primary += "P";
				secondary += "P";
				if (next === "B") pos++;
				break;
			case "C":
				// Handle various C patterns
				if (pos > 1 && prev === "A" && next === "C" && next2 === "H") {
					primary += "K";
					secondary += "K";
					break;
				}
				if (pos === 0 && (s.startsWith("CAES") || s.startsWith("CISO"))) {
					primary += "S";
					secondary += "S";
					break;
				}
				if (next === "H") {
					if (pos === 0 && /[AEIOU]/.test(next2) && s.length > 3) {
						primary += "K";
						secondary += "K";
					} else {
						primary += "X";
						secondary += "X";
					}
					break;
				}
				if (next === "K" || next === "Q") {
					primary += "K";
					secondary += "K";
					pos++;
					break;
				}
				if (/[IEY]/.test(next)) {
					primary += "S";
					secondary += "S";
					break;
				}
				primary += "K";
				secondary += "K";
				break;
			case "D":
				if (next === "G" && /[IEY]/.test(next2)) {
					primary += "J";
					secondary += "J";
					pos++;
				} else {
					primary += "T";
					secondary += "T";
				}
				break;
			case "F":
				primary += "F";
				secondary += "F";
				break;
			case "G":
				if (next === "H") {
					if (pos > 0 && /[AEIOU]/.test(prev)) break;
					break;
				}
				if (next === "N") {
					if (pos === 1 && /[AEIOU]/.test(prev)) {
						primary += "KN";
						secondary += "KN";
					} else {
						primary += "N";
						secondary += "N";
					}
					pos++;
					break;
				}
				if (/[IEY]/.test(next)) {
					primary += "J";
					secondary += "J";
					break;
				}
				primary += "K";
				secondary += "K";
				break;
			case "H":
				if (/[AEIOU]/.test(next) && !/[AEIOU]/.test(prev)) {
					primary += "H";
					secondary += "H";
				}
				break;
			case "J":
				primary += "J";
				secondary += "J";
				break;
			case "K":
				if (prev === "C") break;
				primary += "K";
				secondary += "K";
				break;
			case "L":
				primary += "L";
				secondary += "L";
				break;
			case "M":
				primary += "M";
				secondary += "M";
				if (next === "B" && pos === s.length - 2) pos++;
				break;
			case "N":
				primary += "N";
				secondary += "N";
				break;
			case "P":
				if (next === "H") {
					primary += "F";
					secondary += "F";
					pos++;
					break;
				}
				primary += "P";
				secondary += "P";
				if (next === "P") pos++;
				break;
			case "Q":
				primary += "K";
				secondary += "K";
				break;
			case "R":
				primary += "R";
				secondary += "R";
				break;
			case "S":
				if (next === "H") {
					primary += "X";
					secondary += "X";
					break;
				}
				if (next === "I" && next2 === "O") {
					primary += "X";
					secondary += "X";
					pos++;
					break;
				}
				primary += "S";
				secondary += "S";
				break;
			case "T":
				if (next === "I" && next2 === "O") {
					primary += "X";
					secondary += "X";
					pos++;
					break;
				}
				if (next === "H") {
					primary += "0";
					secondary += "0";
					break;
				}
				primary += "T";
				secondary += "T";
				break;
			case "V":
				primary += "F";
				secondary += "F";
				break;
			case "W":
				if (/[AEIOU]/.test(next)) primary += "W";
				secondary += "W";
				break;
			case "X":
				primary += "KS";
				secondary += "KS";
				break;
			case "Z":
				primary += "S";
				secondary += "S";
				break;
			default:
				break;
		}
		pos++;
	}

	return {
		primary: primary.slice(0, maxCode),
		secondary: secondary.slice(0, maxCode),
	};
}

// ─── 4. NYSIIS ────────────────────────────────────────────────────────────────

const NYSIIS_MAP: [RegExp, string][] = [
	[/^MAC/, "MCC"],
	[/^KN/, "NN"],
	[/^K/, "C"],
	[/^PH/, "FF"],
	[/^PF/, "FF"],
	[/^SCH/, "SSS"],
	[/^WR/, "RR"],
];

const NYSIIS_RULES: [RegExp, string][] = [
	[/EE$/, "Y"],
	[/IE$/, "Y"],
	[/DT|RT|RD|NT|ND/, "D"],
	[/EV([^AEIOU])/, "AF$1"],
	[/E([AEIOU])/, "A$1"],
	[/[AEIOU]/, "A"],
];

/**
 * NYSIIS (New York State Identification and Intelligence System) phonetic algorithm.
 * Produces a 5-6 character code.
 */
export function nysiis(word: string): string {
	if (!word) return "";

	let s = word.toUpperCase().replace(/[^A-Z]/g, "");

	// Apply prefix rules
	for (const [pattern, replacement] of NYSIIS_MAP) {
		if (pattern.test(s)) {
			s = s.replace(pattern, replacement);
			break;
		}
	}

	// Apply general rules iteratively
	for (const [pattern, replacement] of NYSIIS_RULES) {
		s = s.replace(pattern, replacement);
	}

	// Remove trailing S
	s = s.replace(/S$/, "");

	// Replace AY → Y at end
	s = s.replace(/AY$/, "Y");

	// Remove trailing A
	s = s.replace(/A$/, "");

	// Apply suffix rules
	s = s.replace(/[AEIOU]/g, "A");

	// Collapse repeated characters
	let collapsed = "";
	for (let i = 0; i < s.length; i++) {
		if (i > 0 && s[i] === s[i - 1]) continue;
		collapsed += s[i];
	}

	return collapsed.slice(0, 6);
}

// ─── 5. COLOGNE PHONETICS (Kölner Phonetik) ───────────────────────────────────

const COLOGNE_MAP: Record<string, string> = {
	a: "0",
	e: "0",
	i: "0",
	o: "0",
	u: "0",
	j: "0",
	y: "0",
	b: "1",
	p: "1",
	d: "2",
	t: "2",
	f: "3",
	v: "3",
	w: "3",
	g: "4",
	k: "4",
	q: "4",
	c: "4",
	l: "5",
	m: "6",
	n: "6",
	r: "7",
	s: "8",
	z: "8",
	ß: "8",
};

/**
 * Cologne Phonetics (Kölner Phonetik) — German phonetic algorithm.
 * Example: "Müller" → "657", "Schmidt" → "862"
 */
export function colognePhonetics(word: string): string {
	if (!word) return "";

	const lower = word.toLowerCase();

	let result = "";

	for (let i = 0; i < lower.length; i++) {
		const ch = lower[i];
		const prev = lower[i - 1] ?? "";
		const next = lower[i + 1] ?? "";

		// Special handling for 'C'
		if (ch === "c") {
			if (i === 0 && /[ahkloqrux]/.test(next)) {
				result += "4";
			} else if (i === 0 && /[aeiou]/.test(next)) {
				result += "8";
			} else if (i > 0 && /[sz]/.test(prev) && next === "h") {
				// ch after s/z = 8
				result += "8";
			} else if (next === "h") {
				result += "4";
			} else if (prev === "s" || prev === "z") {
				result += "8";
			} else {
				result += "4";
			}
			continue;
		}

		// Special handling for 'S'
		if (ch === "s" && next === "c" && lower[i + 2] === "h") {
			result += "8";
			continue;
		}

		const mapped = COLOGNE_MAP[ch];
		if (mapped !== undefined) {
			// Skip consecutive same-coded letters
			if (mapped !== result[result.length - 1]) {
				result += mapped;
			}
		}
	}

	// Remove trailing zeros (A, E, I, O, U at end are silent)
	result = result.replace(/0+$/, "");

	return result;
}

// ─── 6. RUSSIAN SOUNDEX ───────────────────────────────────────────────────────

const RUSSIAN_SOUNDEX_MAP: Record<string, string> = [
	// Labial: б, п, в, ф → 1
	["б", "1"],
	["п", "1"],
	["в", "1"],
	["ф", "1"],
	// Dental: д, т → 3 (soft: дь, ть → 3 as well)
	["д", "3"],
	["т", "3"],
	// Sibilant/Hissing: с, з, ш, щ, ж, ч, ц → 4
	["с", "4"],
	["з", "4"],
	["ш", "4"],
	["щ", "4"],
	["ж", "4"],
	["ч", "4"],
	["ц", "4"],
	// Velar: к, г, х → 5
	["к", "5"],
	["г", "5"],
	["х", "5"],
	// Sonorant: л, р → 6
	["л", "6"],
	["р", "6"],
	// Nasal: м, н → 7
	["м", "7"],
	["н", "7"],
].reduce(
	(map, [k, v]) => {
		map[k] = v;
		return map;
	},
	{} as Record<string, string>,
);

/**
 * Russian Soundex — adapted for Cyrillic phonetics.
 * Maps phonetically similar Russian consonants to the same digit.
 * Handles: voiced/devoiced pairs (б/п, в/ф, д/т, з/с, г/к/х), palatalization.
 */
export function russianSoundex(word: string): string {
	if (!word) return "";

	const lower = word.toLowerCase();
	const first = lower[0];

	let code = "";
	let prevCode = "";

	for (let i = 0; i < lower.length; i++) {
		const ch = lower[i];

		// Handle yo (ё) — normalize to e
		const normalized = ch === "ё" ? "е" : ch;

		// Get phonetic code
		const mapped = RUSSIAN_SOUNDEX_MAP[normalized] ?? "";
		const isVowel = /[аеёиоуыэюя]/.test(normalized);

		if (mapped && (i === 0 || mapped !== prevCode)) {
			code += mapped;
			prevCode = mapped;
		} else if (isVowel && i === 0) {
			// Keep first vowel
			code += "0";
		} else if (isVowel && code.length > 1) {
			// Vowel between same-code consonants separates them
			prevCode = "";
		}
	}

	// Keep first char + 3 digits of code (Soundex standard)
	code = code.padEnd(3, "0").slice(0, 3);

	return first.toUpperCase() + code;
}

// ─── 7. RUSSIAN METAPHONE ─────────────────────────────────────────────────────

/**
 * Russian Metaphone — adapted for Russian phonetics.
 * Handles: softening (ь), vowel reduction (о→а, е→и), voiced/devoiced assimilation.
 */
export function russianMetaphone(word: string): string {
	if (!word) return "";

	let s = word.toLowerCase();

	// Normalize ё → е
	s = s.replace(/ё/g, "е");

	// Remove ь (soft sign) — it primarily softens the preceding consonant
	s = s.replace(/ь/g, "");

	// Remove ъ (hard sign)
	s = s.replace(/ъ/g, "");

	// Vowel reduction: unstressed-like normalization for search
	// о → а (in non-first syllable)
	// е → и (in non-stressed positions — simplified)
	// я → а
	// ю → у

	// For search purposes, we normalize vowels conservatively
	s = s.replace(/[я]/g, "а");
	s = s.replace(/[ю]/g, "у");
	s = s.replace(/[ы]/g, "и");
	s = s.replace(/[э]/g, "е");

	// Map consonant groups to single codes
	const consonantMap: [RegExp, string][] = [
		[/[бп]/g, "B"], // bilabial stops
		[/[вф]/g, "V"], // labiodental fricatives
		[/[гкх]/g, "K"], // velar
		[/[дз]/g, "Z"], // dental fricatives (з, д mapped to Z for search)
		[/[ст]/g, "S"], // dental (с, т → S)
		[/[жшщчц]/g, "C"], // sibilants
		[/[л]/g, "L"],
		[/[м]/g, "M"],
		[/[н]/g, "N"],
		[/[р]/g, "R"],
	];

	for (const [pattern, replacement] of consonantMap) {
		s = s.replace(pattern, replacement);
	}

	// Reduce vowel groups to a single marker
	s = s.replace(/[аеиоуэ]/g, "0");

	// Collapse consecutive identical codes
	let collapsed = "";
	for (let i = 0; i < s.length; i++) {
		if (i > 0 && s[i] === s[i - 1]) continue;
		collapsed += s[i];
	}

	// Keep first 6 chars
	return collapsed.slice(0, 6).toUpperCase();
}

/**
 * Compare two words phonetically and return similarity score (0.0 - 1.0).
 */
export function phoneticSimilarity(word1: string, word2: string): number {
	const algorithms = [
		{ name: "soundex", fn: (w: string) => soundex(w) },
		{ name: "metaphone", fn: (w: string) => metaphone(w) },
		{ name: "cologne", fn: (w: string) => colognePhonetics(w) },
		{ name: "russian-soundex", fn: (w: string) => russianSoundex(w) },
		{ name: "russian-metaphone", fn: (w: string) => russianMetaphone(w) },
	];

	let matches = 0;
	const total = algorithms.length;

	for (const algo of algorithms) {
		const code1 = algo.fn(word1);
		const code2 = algo.fn(word2);
		if (code1 === code2 || code1.slice(0, 3) === code2.slice(0, 3)) {
			matches++;
		}
	}

	return matches / total;
}

/**
 * Generate all phonetic codes for a word.
 */
export function allPhoneticCodes(word: string): PhoneticResult[] {
	if (!word) return [];

	const dm = doubleMetaphone(word);

	return [
		{ code: soundex(word), algorithm: "Soundex" },
		{ code: metaphone(word), algorithm: "Metaphone" },
		{ code: dm.primary, algorithm: "DoubleMetaphone (primary)" },
		{ code: dm.secondary, algorithm: "DoubleMetaphone (secondary)" },
		{ code: nysiis(word), algorithm: "NYSIIS" },
		{ code: colognePhonetics(word), algorithm: "ColognePhonetics" },
		{ code: russianSoundex(word), algorithm: "RussianSoundex" },
		{ code: russianMetaphone(word), algorithm: "RussianMetaphone" },
	];
}

/**
 * Get algorithm descriptions and language applicability.
 */
export const PHONETIC_ALGORITHM_INFO = {
	soundex: "English (RP1000) — 4-char code for Anglo-American names",
	metaphone: "English — variable-length, improved phonetic accuracy over Soundex",
	doubleMetaphone:
		"English + Slavic/Germanic — primary + secondary codes for alternate pronunciations",
	nysiis: "English — NY State identification system, 6-char code",
	colognePhonetics: "German (Kölner Phonetik) — optimized for German pronunciation",
	russianSoundex:
		"Russian — adapted Soundex for Cyrillic phonetics, handles voiced/devoiced pairs",
	russianMetaphone:
		"Russian — handles vowel reduction, soft signs, consonant group normalization",
} as const;
