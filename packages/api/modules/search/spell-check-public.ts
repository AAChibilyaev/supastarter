import {
	SymSpell,
	detectLanguage,
	fixKeyboardLayout,
	fixCapsLock,
	normalize,
	normalizeYo,
	transliterate,
} from "@repo/nlp";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { gatePublicSearchRequest } from "./lib/public-auth";

const spellCheckInput = z.object({
	/** The search query text to check */
	q: z.string().min(1).max(1000),
	/** Optional language hint (auto-detected if omitted) */
	language: z.enum(["ru", "en", "de", "es", "fr"]).optional(),
	/**
	 * Correction mode:
	 * - "auto" (default): auto-correct
	 * - "suggest": return suggestions only
	 */
	mode: z.enum(["auto", "suggest"]).default("auto"),
	/** Max suggestions per word (default: 5) */
	maxSuggestions: z.number().int().min(1).max(20).default(5),
	/** Whitelist of words to never correct */
	whitelist: z.array(z.string()).max(100).optional(),
});

/**
 * Common dictionary words for public spell-check.
 * Smaller subset than the protected version to keep it efficient.
 */
const COMMON_EN = [
	"the",
	"and",
	"for",
	"are",
	"but",
	"not",
	"you",
	"all",
	"can",
	"had",
	"her",
	"was",
	"one",
	"our",
	"out",
	"has",
	"have",
	"been",
	"some",
	"them",
	"than",
	"what",
	"when",
	"which",
	"will",
	"with",
	"your",
	"about",
	"their",
	"would",
	"could",
	"should",
	"there",
	"where",
	"search",
	"find",
	"query",
	"result",
	"index",
	"product",
	"price",
	"name",
	"title",
	"description",
	"category",
	"brand",
	"hello",
	"world",
	"test",
	"data",
	"user",
	"account",
];

const COMMON_RU = [
	"и",
	"в",
	"не",
	"на",
	"я",
	"он",
	"с",
	"что",
	"а",
	"по",
	"это",
	"она",
	"они",
	"мы",
	"как",
	"из",
	"у",
	"к",
	"от",
	"за",
	"так",
	"но",
	"его",
	"ее",
	"все",
	"или",
	"же",
	"то",
	"о",
	"для",
	"еще",
	"товар",
	"цена",
	"название",
	"описание",
	"категория",
	"бренд",
	"поиск",
	"результат",
	"запрос",
	"документ",
	"коллекция",
	"продукт",
	"имя",
	"привет",
	"мир",
	"тест",
	"данные",
	"пользователь",
	"админ",
	"ключ",
];

export const publicSpellCheckApp = new Hono()
	.use(
		"*",
		cors({
			origin: "*",
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["POST", "OPTIONS"],
			maxAge: 600,
		}),
	)
	.post("/spell-check/public/:slug", async (c) => {
		const slug = c.req.param("slug");
		const gated = await gatePublicSearchRequest(c, new Set([slug]));
		if (gated instanceof Response) return gated;

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json_body" }, 400);
		}

		const parsed = spellCheckInput.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: "invalid_input", details: parsed.error.issues }, 400);
		}

		const { q, language: langHint, mode, maxSuggestions, whitelist } = parsed.data;

		try {
			// Language detection
			const detectedLanguage = langHint ?? detectLanguage(q) ?? "en";
			const isRussian = detectedLanguage === "ru" || /[а-яё]/i.test(q);

			// Pre-processing pipeline
			let processed = q;

			// Normalize
			processed = normalize(processed, { unicodeForm: "NFD" });

			// Yo/ё fix
			if (isRussian) {
				processed = normalizeYo(processed, "search");
			}

			// Keyboard layout
			if (isRussian && /[a-zA-Z]/.test(processed)) {
				const fixed = fixKeyboardLayout(processed, {
					autoDetect: true,
					tryCapsLockFix: true,
				});
				if (fixed !== processed) processed = fixed;
			}

			// Caps Lock
			if (isRussian && /[A-ZА-ЯЁ]{3,}/.test(processed)) {
				const capsFixed = fixCapsLock(processed);
				if (capsFixed !== processed) processed = capsFixed;
			}

			// Transliteration
			if (isRussian && /[a-zA-Z]/.test(processed) && !/[а-яё]/i.test(processed)) {
				const translitResult = transliterate(processed, "lat", "cyr");
				if (translitResult !== processed) processed = translitResult;
			}

			// Build SymSpell dictionary
			const lang = isRussian ? "ru" : "en";
			const commonWords = lang === "ru" ? COMMON_RU : COMMON_EN;
			const freqs = new Map<string, number>();
			for (const w of commonWords) {
				freqs.set(w, (freqs.get(w) ?? 0) + 100);
			}

			const symspell = new SymSpell({
				maxEditDistance: 2,
				verbosity: 2,
				maxResults: maxSuggestions,
			});
			symspell.createDictionary(commonWords, freqs);

			if (whitelist && whitelist.length > 0) {
				symspell.addToWhitelist(whitelist);
			}

			// Correct each word
			const words = processed.split(/\s+/).filter(Boolean);
			const wordSuggestions: Array<{
				word: string;
				corrected: string;
				options: Array<{ text: string; score: number }>;
			}> = [];

			const correctedWords: string[] = [];
			let hasChanges = false;

			for (const word of words) {
				const results = symspell.lookup(word);
				const exactMatch = results.find((r) => r.distance === 0);
				const bestResult = results[0];
				const isCorrect = !!exactMatch;

				const options = results
					.filter((r) => r.distance > 0)
					.slice(0, maxSuggestions)
					.map((r) => ({ text: r.term, score: r.score }));

				wordSuggestions.push({
					word,
					corrected: bestResult && !isCorrect ? bestResult.term : word,
					options,
				});

				if (bestResult && !isCorrect && mode === "auto") {
					correctedWords.push(bestResult.term);
					hasChanges = true;
				} else {
					correctedWords.push(word);
				}
			}

			const corrected = correctedWords.join(" ");

			return c.json({
				original: q,
				corrected: mode === "auto" ? corrected : q,
				didYouMean: hasChanges && mode === "auto" ? corrected : undefined,
				suggestions: wordSuggestions,
				detectedLanguage,
				mode,
				dictionarySize: symspell.size,
			});
		} catch {
			return c.json({ error: "spell_check_failed" }, 502);
		}
	});
