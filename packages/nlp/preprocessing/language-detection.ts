export type SupportedLanguage = "ru" | "en" | "de" | "es" | "fr" | "unknown";

/**
 * Language detection using character frequency analysis + common word matching.
 * Supports AACSearch's 5 locales: en, de, es, fr, ru.
 */
export function detectLanguage(text: string): SupportedLanguage {
	if (!text || text.trim().length === 0) return "unknown";

	const cleaned = text.replace(/[0-9\s\p{P}]/gu, "").toLowerCase();
	if (cleaned.length === 0) return "unknown";

	// Cyrillic detection
	const cyrillicCount = (cleaned.match(/[\u0400-\u04FF]/g) || []).length;
	const latinCount = (cleaned.match(/[a-z]/g) || []).length;

	// If more than 20% cyrillic chars → Russian
	if (cyrillicCount > 0 && cyrillicCount / (cyrillicCount + latinCount || 1) > 0.2) {
		return "ru";
	}

	// If mostly non-latin, return unknown
	if (latinCount === 0) return "unknown";

	// Common word scoring for European languages
	const languagePatterns: Record<Exclude<SupportedLanguage, "ru" | "unknown">, RegExp[]> = {
		en: [
			/\b(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|has|have|been|some|them|than|what|when|which|will|with|your|about|their|would|could|should|there|where|after|before|between|through|during|without|because|however|therefore|moreover)\b/gi,
		],
		de: [
			/\b(der|die|das|und|ist|ein|eine|nicht|sich|auch|auf|mit|bei|zum|zur|nach|aus|dass|oder|aber|werden|haben|wird|durch|gegen|über|ohne|zwischen|während|weil|denn|dann|diese|dieser|dieses|welche|welcher|welches)\b/gi,
		],
		es: [
			/\b(el|la|los|las|que|y|es|por|con|para|una|del|como|más|pero|sus|han|era|son|había|ser|dos|vez|muy|este|esta|entre|también|donde|quien|nuestro|durante|según|contra|hasta|luego|entonces|porque|sino|tan|bien|poco|menos|primero|mejor)\b/gi,
		],
		fr: [
			/\b(le|la|les|des|est|pas|une|dans|sur|avec|pour|par|plus|mais|être|fait|leur|tout|très|avoir|faire|comme|notre|entre|aussi|donc|alors|sinon|depuis|pendant|cependant|dorénavant|autre|chaque|encore|enfin|bien|moins|selon|chez|voici|voilà|dorénavant|parfois|toujours)\b/gi,
		],
	};

	const scores: Record<string, number> = { en: 0, de: 0, es: 0, fr: 0 };

	for (const [lang, patterns] of Object.entries(languagePatterns)) {
		for (const pattern of patterns) {
			const matches = text.match(pattern);
			if (matches) scores[lang] += matches.length;
		}
	}

	const maxScore = Math.max(...Object.values(scores));
	if (maxScore === 0) {
		// Fallback: if text is mostly latin but no common words → check letter frequency
		return detectByFrequency(cleaned);
	}

	const best = Object.entries(scores).find(([, score]) => score === maxScore);
	return best ? (best[0] as SupportedLanguage) : "unknown";
}

/**
 * Character frequency analysis fallback for short texts or texts without common words.
 */
function detectByFrequency(text: string): SupportedLanguage {
	const cleaned = text.replace(/[^a-z]/g, "");
	if (cleaned.length < 3) return "unknown";

	const freq: Record<string, number> = {};
	for (const ch of cleaned) {
		freq[ch] = (freq[ch] || 0) + 1;
	}

	const total = cleaned.length;
	const freqRatio: Record<string, number> = {};
	for (const [ch, count] of Object.entries(freq)) {
		freqRatio[ch] = count / total;
	}

	// Distinctive letter frequencies per language
	// English: a, e, t, o, i, n, s, h, r
	// German: e, n, i, s, r, a, t, d, h, u, l, c, g, m, o, b, w, f, k, z
	// Spanish: e, a, o, s, r, n, i, d, l, c, t, u, m, p, b, g, v, y, q, h
	// French: e, a, s, i, t, n, r, u, l, o, d, c, p, m, v, q, f, b, g, h

	const languageProximity: Record<string, number> = {
		en: 0,
		de: 0,
		es: 0,
		fr: 0,
	};

	// Common English trigrams
	const enTrigrams = ["the", "and", "ing", "ent", "ion", "for", "tio", "ere", "her", "tha"];
	// Common German trigrams
	const deTrigrams = ["der", "ein", "ich", "die", "und", "sch", "cht", "gen", "den", "das"];
	// Common Spanish trigrams
	const esTrigrams = ["que", "del", "las", "por", "los", "con", "una", "las", "los", "por"];
	// Common French trigrams
	const frTrigrams = ["les", "des", "est", "que", "pas", "par", "sur", "dans", "une", "pour"];

	for (let i = 0; i < cleaned.length - 2; i++) {
		const tri = cleaned.slice(i, i + 3);
		if (enTrigrams.includes(tri)) languageProximity.en += 1;
		if (deTrigrams.includes(tri)) languageProximity.de += 1;
		if (esTrigrams.includes(tri)) languageProximity.es += 1;
		if (frTrigrams.includes(tri)) languageProximity.fr += 1;
	}

	const maxProx = Math.max(...Object.values(languageProximity));
	if (maxProx === 0) return "en"; // Default to English if nothing matches

	const best = Object.entries(languageProximity).find(([, p]) => p === maxProx);
	return best ? (best[0] as SupportedLanguage) : "en";
}
