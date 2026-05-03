/**
 * V1 Spell Check endpoint.
 *
 *   POST /v1/projects/:projectId/spell-check — spell correction for search queries
 *
 * Uses AACSearch's NLP pipeline: language detection, keyboard layout fix,
 * transliteration, diacritics normalization, Yo/ё normalization,
 * SymSpell dictionary correction, and context-aware correction.
 *
 * Returns suggestions ranked by similarity + frequency.
 * Requires a search-scoped API key.
 */
import {
	SymSpell,
	ContextCorrector,
	detectLanguage,
	fixKeyboardLayout,
	fixCapsLock,
	normalize,
	normalizeYo,
	transliterate,
} from "@repo/nlp";
import { getTypesenseClient } from "@repo/search";
import { Hono } from "hono";
import { z } from "zod";

import { requireScope } from "./auth";

// ── Locale constants ──────────────────────────────────────────────

const SUPPORTED_LANGUAGES = ["ru", "en", "de", "es", "fr"] as const;
type SpellLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// ── Common word dictionaries ──────────────────────────────────────

const COMMON_ENGLISH = [
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
	"after",
	"before",
	"between",
	"through",
	"during",
	"without",
	"because",
	"however",
	"therefore",
	"moreover",
	"search",
	"find",
	"query",
	"result",
	"index",
	"document",
	"collection",
	"product",
	"price",
	"name",
	"title",
	"description",
	"category",
	"brand",
	"aacsearch",
	"engine",
	"widget",
	"dashboard",
	"page",
	"home",
	"login",
	"signup",
	"register",
	"email",
	"password",
	"settings",
	"profile",
	"account",
	"help",
	"support",
	"contact",
	"about",
	"blog",
	"news",
	"shop",
	"store",
	"cart",
	"checkout",
	"order",
	"payment",
	"shipping",
	"address",
	"phone",
];

const COMMON_RUSSIAN = [
	"и",
	"в",
	"не",
	"на",
	"я",
	"быть",
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
	"те",
	"когда",
	"где",
	"кто",
	"что",
	"есть",
	"нет",
	"да",
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
	"пользователь",
	"админ",
	"ключ",
	"поисковый",
	"движок",
	"панель",
	"управления",
	"страница",
	"настройки",
	"профиль",
	"аккаунт",
	"помощь",
	"поддержка",
	"контакты",
	"русский",
	"английский",
	"работа",
	"человек",
	"время",
	"день",
	"ночь",
	"утро",
	"завтра",
	"сегодня",
	"вчера",
	"теперь",
	"нужно",
	"можно",
	"нельзя",
	"спасибо",
	"пожалуйста",
	"здравствуйте",
	"до",
	"свидания",
];

// ── Zod Schemas ───────────────────────────────────────────────────

const SPELL_MODES = ["auto", "suggest"] as const;

const spellCheckInputSchema = z.object({
	/** The search query text to check */
	text: z.string().min(1).max(1000),
	/** Optional language hint (auto-detected if omitted) */
	language: z.enum(SUPPORTED_LANGUAGES).optional(),
	/**
	 * Correction mode:
	 * - "auto" (default): auto-correct the query and return fixed version
	 * - "suggest": return suggestions without auto-correction
	 */
	mode: z.enum(SPELL_MODES).default("auto"),
	/** Maximum number of suggestions per word (default: 5) */
	maxSuggestions: z.number().int().min(1).max(20).default(5),
	/**
	 * Optional index slug — if provided, builds dictionary from the
	 * index's documents for better corrections.
	 */
	indexSlug: z.string().min(1).max(64).optional(),
	/** Use context-aware correction (default: false) */
	useContextCorrection: z.boolean().default(false),
	/** Whitelist of words to never correct */
	whitelist: z.array(z.string()).max(100).optional(),
	/** Try compound word splitting (German, Finnish). Default: false */
	splitCompounds: z.boolean().default(false),
});

// ── Helpers ───────────────────────────────────────────────────────

async function buildIndexDictionary(
	_organizationId: string,
	indexSlug: string,
): Promise<{ dictionary: string[]; frequencies: Map<string, number> }> {
	const client = getTypesenseClient();
	const dictionary: string[] = [];
	const frequencies = new Map<string, number>();

	try {
		const schema = (await (client as any).collections(indexSlug).retrieve()) as any;
		if (schema?.fields) {
			const stringFields = (schema.fields as any[])
				.filter((f: any) => f.type === "string")
				.map((f: any) => f.name) as string[];

			for (const field of stringFields.slice(0, 5)) {
				const docs = (await (client as any).collections(indexSlug).documents().search({
					q: "*",
					query_by: field,
					limit: 200,
				})) as any;

				if (docs?.hits) {
					for (const hit of docs.hits) {
						const val = hit?.document?.[field];
						if (typeof val === "string") {
							const words = val.split(/\s+/).filter(Boolean);
							for (const w of words) {
								const lower = w.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
								if (lower) {
									dictionary.push(lower);
									frequencies.set(lower, (frequencies.get(lower) ?? 0) + 1);
								}
							}
						}
					}
				}
			}
		}
	} catch {
		// Proceed without index-specific dictionary
	}

	return { dictionary, frequencies };
}

// ── Router ────────────────────────────────────────────────────────

export const spellCheckApp = new Hono()

	// ── POST /v1/projects/:projectId/spell-check ─────────────────
	.post("/projects/:projectId/spell-check", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;
		const { verified } = gated;

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json", message: "Request body must be valid JSON" }, 400);
		}

		const parsed = spellCheckInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: "invalid_input",
					message: "Validation failed",
					details: parsed.error.issues,
				},
				400,
			);
		}

		const {
			text,
			language: langHint,
			mode,
			maxSuggestions,
			indexSlug,
			useContextCorrection,
			whitelist,
			splitCompounds,
		} = parsed.data;

		const fixes: Array<{
			type: string;
			description: string;
			original: string;
			result: string;
		}> = [];

		// Step 1: Language detection
		const detectedLanguage: SpellLanguage =
			langHint ?? (detectLanguage(text) as SpellLanguage) ?? "en";
		const isRussian = detectedLanguage === "ru" || (text.match(/[а-яё]/i)?.length ?? 0) > 0;
		const lang = isRussian ? "ru" : "en";

		// Step 2: Unicode normalization
		const normalized = normalize(text, { unicodeForm: "NFD" });
		if (normalized !== text) {
			fixes.push({
				type: "normalization",
				description: "Unicode normalization and diacritics removal",
				original: text,
				result: normalized,
			});
		}

		let processedText = normalized;

		// Step 2b: Yo/ё normalization (Russian)
		if (isRussian) {
			const yoNormalized = normalizeYo(processedText, "search");
			if (yoNormalized !== processedText) {
				fixes.push({
					type: "yo-normalization",
					description: "Yo/ё normalization (ё → е for search)",
					original: processedText,
					result: yoNormalized,
				});
				processedText = yoNormalized;
			}
		}

		// Step 3: Keyboard layout fix
		if (isRussian && /[a-zA-Z]/.test(processedText)) {
			const fixed = fixKeyboardLayout(processedText, {
				autoDetect: true,
				tryCapsLockFix: true,
			});
			if (fixed !== processedText) {
				fixes.push({
					type: "keyboard-layout",
					description: "Detected wrong keyboard layout (Latin → Cyrillic)",
					original: processedText,
					result: fixed,
				});
				processedText = fixed;
			}
		}

		// Step 3b: Caps Lock fix
		if (isRussian && /[A-ZА-ЯЁ]{3,}/.test(processedText)) {
			const capsFixed = fixCapsLock(processedText);
			if (capsFixed !== processedText) {
				fixes.push({
					type: "caps-lock",
					description: "Detected Caps Lock typo",
					original: processedText,
					result: capsFixed,
				});
				processedText = capsFixed;
			}
		}

		// Step 4: Transliteration detection
		if (isRussian && /[a-zA-Z]/.test(processedText) && !/[а-яё]/i.test(processedText)) {
			const translitResult = transliterate(processedText, "lat", "cyr");
			if (translitResult !== processedText) {
				fixes.push({
					type: "transliteration",
					description: "Detected transliterated Russian text (Latin → Cyrillic)",
					original: processedText,
					result: translitResult,
				});
				processedText = translitResult;
			}
		}

		// Step 5: Build SymSpell dictionary
		const { dictionary: indexWords, frequencies: indexFreqs } = indexSlug
			? await buildIndexDictionary(verified.organizationId, indexSlug)
			: { dictionary: [], frequencies: new Map<string, number>() };

		const commonWords = lang === "ru" ? COMMON_RUSSIAN : COMMON_ENGLISH;
		const allWords = [...commonWords, ...indexWords];
		const allFreqs = new Map<string, number>();

		for (const w of commonWords) {
			allFreqs.set(w, (allFreqs.get(w) ?? 0) + 100);
		}
		for (const [w, f] of indexFreqs) {
			allFreqs.set(w, (allFreqs.get(w) ?? 0) + f);
		}

		const symspell = new SymSpell({
			maxEditDistance: 2,
			verbosity: 2,
			maxResults: maxSuggestions,
			splitCompoundWords: splitCompounds,
		});
		symspell.createDictionary(allWords, allFreqs);

		if (whitelist && whitelist.length > 0) {
			symspell.addToWhitelist(whitelist);
		}

		// Step 6: Spell correction
		const words = processedText.split(/\s+/).filter(Boolean);
		const wordSuggestions: Array<{
			word: string;
			corrected: string;
			options: Array<{ text: string; score: number; algorithm: string }>;
		}> = [];

		let correctedWords: string[] = [];
		let hasChanges = false;

		if (useContextCorrection && words.length > 1) {
			const contextCorrector = new ContextCorrector(allWords, allFreqs);
			if (whitelist && whitelist.length > 0) {
				contextCorrector.addToDictionary(whitelist);
			}

			const contextResult = contextCorrector.correctSentence(processedText, {
				maxDistance: 2,
				maxCandidates: maxSuggestions,
				minScore: 0.4,
				contextWindow: 1,
			});

			for (const wc of contextResult.wordCorrections) {
				wordSuggestions.push({
					word: wc.original,
					corrected: wc.corrected,
					options: wc.alternatives.map((a) => ({
						text: a.word,
						score: a.score,
						algorithm: "context-aware",
					})),
				});
				if (wc.wasCorrected) hasChanges = true;
			}

			correctedWords = contextResult.correctedSentence.split(/\s+/).filter(Boolean);
			if (contextResult.hasChanges && hasChanges) {
				fixes.push({
					type: "context-spell-correction",
					description: "Context-aware spelling correction applied",
					original: processedText,
					result: contextResult.correctedSentence,
				});
			}
		} else {
			for (const word of words) {
				const results = symspell.lookup(word);
				const exactMatch = results.find((r) => r.distance === 0);
				const bestResult = results[0];

				const options = results
					.filter((r) => r.distance > 0)
					.slice(0, maxSuggestions)
					.map((r) => ({
						text: r.term,
						score: r.score,
						algorithm: r.distance <= 1 ? "symspell-close" : "symspell-fuzzy",
					}));

				wordSuggestions.push({
					word,
					corrected: bestResult && !exactMatch ? bestResult.term : word,
					options,
				});

				if (bestResult && !exactMatch && mode === "auto") {
					correctedWords.push(bestResult.term);
					hasChanges = true;
				} else {
					correctedWords.push(word);
				}
			}
		}

		const corrected = correctedWords.join(" ");

		if (hasChanges && mode === "auto") {
			fixes.push({
				type: "spell-correction",
				description: "Spelling correction applied",
				original: text,
				result: corrected,
			});
		}

		return c.json({
			original: text,
			corrected: mode === "auto" ? corrected : text,
			didYouMean: hasChanges && mode === "auto" ? corrected : undefined,
			suggestions: wordSuggestions,
			appliedFixes: fixes,
			detectedLanguage,
			mode,
			dictionarySize: symspell.size,
		});
	})

	/**
	 * Convenience endpoint for simple spell-check without project context.
	 * Uses only common-word dictionaries (no index-specific data).
	 * POST /v1/spell-check
	 */
	.post("/spell-check", async (c) => {
		const gated = await requireScope("search")(c);
		if (gated instanceof Response) return gated;

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json", message: "Request body must be valid JSON" }, 400);
		}

		const parsed = z
			.object({
				text: z.string().min(1).max(1000),
				language: z.enum(SUPPORTED_LANGUAGES).optional(),
				mode: z.enum(SPELL_MODES).default("auto"),
				maxSuggestions: z.number().int().min(1).max(20).default(5),
				whitelist: z.array(z.string()).max(100).optional(),
				splitCompounds: z.boolean().default(false),
			})
			.safeParse(body);

		if (!parsed.success) {
			return c.json(
				{
					error: "invalid_input",
					message: "Validation failed",
					details: parsed.error.issues,
				},
				400,
			);
		}

		const {
			text,
			language: langHint,
			mode,
			maxSuggestions,
			whitelist,
			splitCompounds,
		} = parsed.data;

		const detectedLanguage: SpellLanguage =
			langHint ?? (detectLanguage(text) as SpellLanguage) ?? "en";
		const isRussian = detectedLanguage === "ru" || (text.match(/[а-яё]/i)?.length ?? 0) > 0;
		const lang = isRussian ? "ru" : "en";

		const commonWords = lang === "ru" ? COMMON_RUSSIAN : COMMON_ENGLISH;
		const allFreqs = new Map<string, number>();
		for (const w of commonWords) allFreqs.set(w, 100);

		const symspell = new SymSpell({
			maxEditDistance: 2,
			verbosity: 2,
			maxResults: maxSuggestions,
			splitCompoundWords: splitCompounds,
		});
		symspell.createDictionary(commonWords, allFreqs);

		if (whitelist && whitelist.length > 0) {
			symspell.addToWhitelist(whitelist);
		}

		const words = text.split(/\s+/).filter(Boolean);
		const wordSuggestions: Array<{
			word: string;
			corrected: string;
			options: Array<{ text: string; score: number; algorithm: string }>;
		}> = [];
		const correctedWords: string[] = [];
		let hasChanges = false;

		for (const word of words) {
			const results = symspell.lookup(word);
			const exactMatch = results.find((r) => r.distance === 0);
			const bestResult = results[0];

			const options = results
				.filter((r) => r.distance > 0)
				.slice(0, maxSuggestions)
				.map((r) => ({
					text: r.term,
					score: r.score,
					algorithm: r.distance <= 1 ? "symspell-close" : "symspell-fuzzy",
				}));

			wordSuggestions.push({
				word,
				corrected: bestResult && !exactMatch ? bestResult.term : word,
				options,
			});

			if (bestResult && !exactMatch && mode === "auto") {
				correctedWords.push(bestResult.term);
				hasChanges = true;
			} else {
				correctedWords.push(word);
			}
		}

		return c.json({
			original: text,
			corrected: mode === "auto" ? correctedWords.join(" ") : text,
			didYouMean: hasChanges && mode === "auto" ? correctedWords.join(" ") : undefined,
			suggestions: wordSuggestions,
			appliedFixes: hasChanges
				? [
						{
							type: "spell-correction",
							description: "Spelling correction applied",
							original: text,
							result: correctedWords.join(" "),
						},
					]
				: [],
			detectedLanguage,
			mode,
			dictionarySize: symspell.size,
		});
	});
