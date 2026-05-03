/**
 * Keyboard Layout Swap — detect and fix text typed in the wrong keyboard layout.
 * Supports QWERTY, QWERTZ, AZERTY → ЙЦУКЕН (and reverse).
 */

export type KeyboardLayout = "qwerty" | "qwertz" | "azerty" | "йцукен" | "йцукенж" | "јцукенђ";

export interface KeyboardLayoutSwapConfig {
	/** Auto-detect: if text in layout A returns no search results, try layout B */
	autoDetect: boolean;
	/** Keyboard adjacency scoring weight */
	adjacencyWeight: number;
	/** Whether to also try Caps Lock / Shift fix */
	tryCapsLockFix: boolean;
}

export const DEFAULT_KEYBOARD_CONFIG: KeyboardLayoutSwapConfig = {
	autoDetect: true,
	adjacencyWeight: 0.5,
	tryCapsLockFix: true,
};

// QWERTY → ЙЦУКЕН mapping
const QWERTY_TO_JCUKEN: Record<string, string> = {
	q: "й",
	w: "ц",
	e: "у",
	r: "к",
	t: "е",
	y: "н",
	u: "г",
	i: "ш",
	o: "щ",
	p: "з",
	"[": "х",
	"]": "ъ",
	a: "ф",
	s: "ы",
	d: "в",
	f: "а",
	g: "п",
	h: "р",
	j: "о",
	k: "л",
	l: "д",
	";": "ж",
	"'": "э",
	z: "я",
	x: "ч",
	c: "с",
	v: "м",
	b: "и",
	n: "т",
	m: "ь",
	",": "б",
	".": "ю",
	"/": ".",
	// Shift variants (uppercase)
	Q: "Й",
	W: "Ц",
	E: "У",
	R: "К",
	T: "Е",
	Y: "Н",
	U: "Г",
	I: "Ш",
	O: "Щ",
	P: "З",
	"{": "Х",
	"}": "Ъ",
	A: "Ф",
	S: "Ы",
	D: "В",
	F: "А",
	G: "П",
	H: "Р",
	J: "О",
	K: "Л",
	L: "Д",
	":": "Ж",
	'"': "Э",
	Z: "Я",
	X: "Ч",
	C: "С",
	V: "М",
	B: "И",
	N: "Т",
	M: "Ь",
	"<": "Б",
	">": "Ю",
	"?": ",",
};

// Reverse: ЙЦУКЕН → QWERTY
const JCUKEN_TO_QWERTY: Record<string, string> = {};
for (const [en, ru] of Object.entries(QWERTY_TO_JCUKEN)) {
	JCUKEN_TO_QWERTY[ru] = en;
}

// AZERTY → ЙЦУКЕН
const AZERTY_TO_JCUKEN: Record<string, string> = {
	a: "ф",
	z: "я",
	e: "у",
	r: "к",
	t: "е",
	y: "н",
	u: "г",
	i: "ш",
	o: "щ",
	p: "з",
	"^": "х",
	$: "ъ",
	q: "й",
	s: "ы",
	d: "в",
	f: "а",
	g: "п",
	h: "р",
	j: "о",
	k: "л",
	l: "д",
	m: "ь",
	ù: "ж",
	w: "ц",
	x: "ч",
	c: "с",
	v: "м",
	b: "и",
	n: "т",
	",": "б",
	";": "ж",
	":": "ж",
	"!": "ю",
	// Uppercase
	A: "Ф",
	Z: "Я",
	E: "У",
	R: "К",
	T: "Е",
	Y: "Н",
	U: "Г",
	I: "Ш",
	O: "Щ",
	P: "З",
	Q: "Й",
	S: "Ы",
	D: "В",
	F: "А",
	G: "П",
	H: "Р",
	J: "О",
	K: "Л",
	L: "Д",
	M: "Ь",
	W: "Ц",
	X: "Ч",
	C: "С",
	V: "М",
	B: "И",
	N: "Т",
};

// QWERTZ → ЙЦУКЕН
const QWERTZ_TO_JCUKEN: Record<string, string> = {
	...QWERTY_TO_JCUKEN,
	// QWERTZ differs from QWERTY in z/y swap position
	z: "я",
	y: "н",
	Z: "Я",
	Y: "Н",
};

function detectLayout(text: string): KeyboardLayout | null {
	if (!text) return null;

	// Check if text has significant Cyrillic content
	const cyrillicRatio = (text.match(/[\u0400-\u04FF]/g) || []).length / text.length;
	if (cyrillicRatio > 0.3) {
		return "йцукен";
	}

	// Check for layout-specific characters
	const lowercase = text.toLowerCase();
	const hasEnglish = /[a-z]/.test(lowercase);

	if (!hasEnglish) return null;

	// Detect by unique character sequences
	const qwertyChars = lowercase.match(/[qwertyuiop[\]asdfghjkl;'zxcvbnm,./]/g)?.length ?? 0;
	const azertyChars = lowercase.match(/[azertyuiop^$qsdfghjklmùwxcvbn,;:!]/g)?.length ?? 0;
	const qwertzChars = lowercase.match(/[qwertzuiop[\]asdfghjkl;'yxcvbnm,./]/g)?.length ?? 0;

	const total = lowercase.replace(/[^a-z]/g, "").length;
	if (total === 0) return null;

	const qwertyScore = qwertyChars / total;
	const azertyScore = azertyChars / total;
	const qwertzScore = qwertzChars / total;

	if (qwertyScore > 0.8 && qwertyScore >= azertyScore && qwertyScore >= qwertzScore)
		return "qwerty";
	if (azertyScore > 0.8 && azertyScore >= qwertyScore && azertyScore >= qwertzScore)
		return "azerty";
	if (qwertzScore > 0.8 && qwertzScore >= qwertyScore && qwertzScore >= azertyScore)
		return "qwertz";

	return null;
}

/**
 * Swap keyboard layout: attempts to convert text typed in wrong layout.
 *
 * @param text - Text typed in wrong layout
 * @param from - Detected source layout (default: auto-detect)
 * @param to - Target layout (default: auto-detect the opposite)
 */
export function swapKeyboardLayout(
	text: string,
	from?: KeyboardLayout,
	to?: KeyboardLayout,
): string {
	if (!text) return text;

	const srcLayout = from ?? detectLayout(text);
	if (!srcLayout) return text;

	// If source is Cyrillic, target is QWERTY
	// If source is Latin, target is ЙЦУКЕН
	let targetLayout: KeyboardLayout;
	if (srcLayout === "йцукен" || srcLayout === "йцукенж" || srcLayout === "јцукенђ") {
		targetLayout = to ?? "qwerty";
	} else {
		targetLayout = to ?? "йцукен";
	}

	// Select mapping based on source → target
	if (targetLayout === "йцукен") {
		// Latin → Cyrillic
		if (srcLayout === "azerty") {
			return applyMapping(text, AZERTY_TO_JCUKEN);
		}
		if (srcLayout === "qwertz") {
			return applyMapping(text, QWERTZ_TO_JCUKEN);
		}
		return applyMapping(text, QWERTY_TO_JCUKEN);
	}

	// Cyrillic → Latin
	return applyMapping(text, JCUKEN_TO_QWERTY);
}

function applyMapping(text: string, mapping: Record<string, string>): string {
	let result = "";
	for (const char of text) {
		result += mapping[char] ?? char;
	}
	return result;
}

/**
 * Fix Caps Lock typo (e.g. "GHBDTN" → "ghbdt" → "привет").
 * Caps Lock produces the opposite case of intended.
 */
export function fixCapsLock(text: string): string {
	if (!text) return text;

	const upperCount = (text.match(/[A-ZА-ЯЁ]/g) || []).length;
	const lowerCount = (text.match(/[a-zа-яё]/g) || []).length;

	// If most letters are uppercase, it's likely Caps Lock was on
	if (upperCount > 0 && lowerCount === 0 && upperCount >= 3) {
		return text.toLowerCase();
	}

	// Mixed case but starts with lowercase and has many uppercase letters
	if (upperCount > lowerCount && upperCount > 3 && lowerCount > 0) {
		return text.toLowerCase();
	}

	return text;
}

/**
 * Full keyboard layout correction pipeline.
 * 1. Fix Caps Lock
 * 2. Detect and swap wrong keyboard layout
 * 3. Return the fixed text
 */
export function fixKeyboardLayout(
	text: string,
	config?: Partial<KeyboardLayoutSwapConfig>,
): string {
	const cfg = { ...DEFAULT_KEYBOARD_CONFIG, ...config };

	let result = text;

	if (cfg.tryCapsLockFix) {
		result = fixCapsLock(result);
	}

	if (cfg.autoDetect) {
		result = swapKeyboardLayout(result);
	}

	return result;
}
