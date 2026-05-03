import { SymSpell, ContextCorrector, detectLanguage, fixKeyboardLayout, fixCapsLock, normalize, normalizeYo, transliterate } from "@repo/nlp";
import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

const SPELL_MODES = ["auto", "suggest"] as const;

const SUPPORTED_LANGUAGES = ["ru", "en", "de", "es", "fr"] as const;
type SpellLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// ─── Shared helper: build a SymSpell dictionary from an index ───────────────

async function buildIndexDictionary(
	indexSlug: string,
	language: SpellLanguage,
): Promise<{ dictionary: string[]; frequencies: Map<string, number> }> {
	const client = getTypesenseClient();
	const dictionary: string[] = [];
	const frequencies = new Map<string, number>();

	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const schema = (await (client as any).collections(indexSlug).retrieve()) as any;
		if (schema?.fields) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const stringFields = (schema.fields as any[])
				.filter((f: any) => f.type === "string")
				.map((f: any) => f.name);

			for (const field of stringFields.slice(0, 5)) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const docs = (await (client as any)
					.collections(indexSlug)
					.documents()
					.search({
						q: "*",
						query_by: field,
						limit: 200,
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─── Common dictionary words ───────────────────────────────────────────────

const COMMON_ENGLISH = [
	"the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
	"her", "was", "one", "our", "out", "has", "have", "been", "some", "them",
	"than", "what", "when", "which", "will", "with", "your", "about", "their",
	"would", "could", "should", "there", "where", "after", "before", "between",
	"through", "during", "without", "because", "however", "therefore", "moreover",
	"search", "find", "query", "result", "index", "document", "collection",
	"product", "price", "name", "title", "description", "category", "brand",
	"hello", "world", "test", "data", "user", "admin", "api", "key", "token",
	"aacsearch", "engine", "widget", "dashboard", "page", "home", "login",
	"signup", "register", "email", "password", "settings", "profile", "account",
	"help", "support", "contact", "about", "blog", "news", "shop", "store",
	"cart", "checkout", "order", "payment", "shipping", "address", "phone",
];

const COMMON_RUSSIAN = [
	"и", "в", "не", "на", "я", "быть", "он", "с", "что", "а", "по", "это",
	"она", "они", "мы", "как", "из", "у", "к", "от", "за", "так", "но", "его",
	"ее", "все", "или", "же", "то", "о", "для", "еще", "те", "когда", "где",
	"кто", "что", "есть", "нет", "да", "товар", "цена", "название", "описание",
	"категория", "бренд", "поиск", "результат", "запрос", "документ",
	"коллекция", "продукт", "имя", "привет", "мир", "тест", "данные",
	"пользователь", "админ", "ключ", "поисковый", "движок", "панель",
	"управления", "страница", "домой", "вход", "регистрация", "почта",
	"пароль", "настройки", "профиль", "аккаунт", "помощь", "поддержка",
	"контакты", "блог", "новости", "магазин", "корзина", "оформление",
	"заказ", "оплата", "доставка", "адрес", "телефон", "большой", "маленький",
	"хороший", "плохой", "новый", "старый", "красивый", "дешевый", "дорогой",
	"красный", "синий", "зеленый", "белый", "черный", "русский", "английский",
	"работа", "человек", "время", "день", "ночь", "утро", "завтра", "сегодня",
	"вчера", "теперь", "нужно", "можно", "нельзя", "спасибо", "пожалуйста",
	"здравствуйте", "до", "свидания",
];

// ─── oRPC Procedure ────────────────────────────────────────────────────────

export const spellCheck = protectedProcedure
	.route({
		method: "POST",
		path: "/search/spell-check",
		tags: ["Search"],
		summary: "Check and correct spelling in search queries",
		description:
			"Applies AACSearch's NLP pipeline: language detection, keyboard layout fix (RU↔EN), " +
			"transliteration detection, diacritics normalization, Yo/ё normalization, " +
			"SymSpell fast dictionary correction, and multi-algorithm distance correction. " +
			"Returns suggestions ranked by similarity + frequency + context.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			/** The search query text to check */
			text: z.string().min(1).max(1000),
			/** Optional language hint (auto-detected if omitted) */
			language: z.enum(SUPPORTED_LANGUAGES).optional(),
			/**
			 * Correction mode:
			 * - "auto" (default): auto-correct the query and return the fixed version
			 * - "suggest": return suggestions without auto-correcting the query
			 */
			mode: z.enum(SPELL_MODES).default("auto"),
			/** Maximum number of suggestions to return per word (default: 5) */
			maxSuggestions: z.number().int().min(1).max(20).default(5),
			/** Optional index slug — if provided, builds dictionary from the index's documents */
			indexSlug: z.string().min(1).max(64).optional(),
			/**
			 * Use context-aware correction using surrounding words (default: false).
			 * Requires training data for best results; falls back to standard correction.
			 */
			useContextCorrection: z.boolean().default(false),
			/**
			 * Whitelist of words to never correct (brand names, SKUs, technical terms).
			 * These are always preserved as-is regardless of edit distance.
			 */
			whitelist: z.array(z.string()).max(100).optional(),
			/** Try compound word splitting (German, Finnish). Default: false */
			splitCompounds: z.boolean().default(false),
		}),
	)
	.output(
		z.object({
			/** The original input text */
			original: z.string(),
			/**
			 * The corrected text (same as original in "suggest" mode).
			 * In "auto" mode, this is the best-guess corrected query.
			 */
			corrected: z.string(),
			/**
			 * Did-you-mean suggestion for the full query.
			 * Only populated when corrections were applied in "auto" mode.
			 */
			didYouMean: z.string().optional(),
			/** Per-word correction suggestions */
			suggestions: z.array(
				z.object({
					word: z.string(),
					corrected: z.string(),
					options: z.array(
						z.object({
							text: z.string(),
							score: z.number(),
							algorithm: z.string(),
						}),
					),
				}),
			),
			/** List of NLP fixes that were applied */
			appliedFixes: z.array(
				z.object({
					type: z.string(),
					description: z.string(),
					original: z.string(),
					result: z.string(),
				}),
			),
			/** Detected language */
			detectedLanguage: z.string(),
			/** Correction mode used */
			mode: z.enum(SPELL_MODES),
			/** Dictionary size (number of words in the correction dictionary) */
			dictionarySize: z.number().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const {
			organizationId,
			text,
			language: langHint,
			mode,
			maxSuggestions,
			indexSlug,
			useContextCorrection,
			whitelist,
			splitCompounds,
		} = input;

		await requireOrganizationMember(organizationId, context.user.id);

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

		// Step 2: Normalization (diacritics, unicode)
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

		// Step 3: Keyboard layout fix (for Russian text typed in Latin layout)
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

		// Step 3b: Caps Lock fix (e.g. "GHBDTN" → "ghbdt" → "привет")
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
			? await buildIndexDictionary(indexSlug, lang)
			: { dictionary: [], frequencies: new Map<string, number>() };

		const commonWords = lang === "ru" ? COMMON_RUSSIAN : COMMON_ENGLISH;
		const allWords = [...commonWords, ...indexWords];
		const allFreqs = new Map<string, number>();

		// Merge frequencies: common words first, then index words
		for (const w of commonWords) {
			allFreqs.set(w, (allFreqs.get(w) ?? 0) + 100); // Higher base frequency for common words
		}
		for (const [w, f] of indexFreqs) {
			allFreqs.set(w, (allFreqs.get(w) ?? 0) + f);
		}

		// Build SymSpell
		const symspell = new SymSpell({
			maxEditDistance: 2,
			verbosity: 2,
			maxResults: maxSuggestions,
			splitCompoundWords: splitCompounds,
		});
		symspell.createDictionary(allWords, allFreqs);

		// Add whitelist
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
			// Use context-aware correction
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
			// Standard SymSpell correction for each word
			for (const word of words) {
				const results = symspell.lookup(word);

				const exactMatch = results.find((r) => r.distance === 0);
				const bestResult = results[0];
				const isCorrect = !!exactMatch;

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

		return {
			original: text,
			corrected: mode === "auto" ? corrected : text,
			didYouMean: hasChanges && mode === "auto" ? corrected : undefined,
			suggestions: wordSuggestions,
			appliedFixes: fixes,
			detectedLanguage,
			mode,
			dictionarySize: symspell.size,
		};
	});
