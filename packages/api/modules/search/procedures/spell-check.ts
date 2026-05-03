import { SpellCorrector } from "@repo/nlp";
import { detectLanguage } from "@repo/nlp";
import { fixKeyboardLayout, fixCapsLock } from "@repo/nlp";
import { normalize } from "@repo/nlp";
import { transliterate } from "@repo/nlp";
import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

const SPELL_MODES = ["auto", "suggest"] as const;

const SUPPORTED_LANGUAGES = ["ru", "en", "de", "es", "fr"] as const;
type SpellLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const spellCheck = protectedProcedure
	.route({
		method: "POST",
		path: "/search/spell-check",
		tags: ["Search"],
		summary: "Check and correct spelling in search queries",
		description:
			"Applies AACSearch's NLP pipeline: language detection, keyboard layout fix (RU↔EN), " +
			"transliteration detection, diacritics normalization, and multi-algorithm spell correction. " +
			"Returns suggestions ranked by similarity + frequency.",
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
		}),
	)
	.handler(async ({ input, context }) => {
		const { organizationId, text, language: langHint, mode, maxSuggestions, indexSlug } = input;

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

		// Step 5: Spell correction
		const words = processedText.split(/\s+/).filter(Boolean);
		const wordSuggestions: Array<{
			word: string;
			corrected: string;
			options: Array<{ text: string; score: number; algorithm: string }>;
		}> = [];

		// Build dictionary from index if available
		let dictionary: string[] = [];

		if (indexSlug) {
			try {
				const client = getTypesenseClient();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const schema = (await (client as any).collections(indexSlug).retrieve()) as any;
				if (schema?.fields) {
					// Extract values from string fields to build a rough dictionary
					const stringFields = schema.fields
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						.filter((f: any) => f.type === "string")
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						.map((f: any) => f.name);

					for (const field of stringFields.slice(0, 5)) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const docs = (await (client as any)
							.collections(indexSlug)
							.documents()
							.search({
								q: "*",
								query_by: field,
								limit: 100,
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
							})) as any;

						if (docs?.hits) {
							for (const hit of docs.hits) {
								const val = hit?.document?.[field];
								if (typeof val === "string") {
									dictionary.push(...val.split(/\s+/).filter(Boolean));
								}
							}
						}
					}
				}
			} catch {
				// Proceed without index-specific dictionary
			}
		}

		// Use a basic dictionary for common English and Russian words as fallback
		const commonEnglish = [
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
			"hello",
			"world",
			"test",
			"data",
			"user",
			"admin",
			"api",
			"key",
			"token",
			"aacsearch",
			"typesense",
			"search",
			"engine",
			"widget",
			"dashboard",
		];

		const commonRussian = [
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
			"привет",
			"мир",
			"тест",
			"данные",
			"пользователь",
			"админ",
			"ключ",
		];

		dictionary.push(...commonEnglish, ...commonRussian);
		const uniqueDictionary = [...new Set(dictionary.map((w) => w.toLowerCase()))];

		const corrector = new SpellCorrector(uniqueDictionary);

		// Check each word
		let correctedWords: string[] = [];
		let hasChanges = false;

		for (const word of words) {
			const results = corrector.correct(word, {
				maxDistance: 2,
				maxResults: maxSuggestions,
				language: isRussian ? "ru" : "en",
				minScore: 0.5,
			});

			const bestResult = results[0];
			const isCorrect =
				bestResult &&
				bestResult.original === bestResult.suggestion &&
				bestResult.score === 1;

			const options = (results ?? [])
				.filter((r) => r.original !== r.suggestion)
				.slice(0, maxSuggestions)
				.map((r) => ({
					text: r.suggestion,
					score: r.score,
					algorithm: r.algorithm,
				}));

			wordSuggestions.push({
				word,
				corrected: bestResult && !isCorrect ? bestResult.suggestion : word,
				options,
			});

			if (bestResult && !isCorrect && mode === "auto") {
				correctedWords.push(bestResult.suggestion);
				hasChanges = true;
			} else {
				correctedWords.push(word);
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
		};
	});
