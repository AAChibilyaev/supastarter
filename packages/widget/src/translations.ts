/**
 * AACsearch Widget — i18n translations
 *
 * Every user-visible string is defined here. Add new locales as needed.
 * The locale is set via `data-locale` on the script tag (default: "en").
 */
export type Locale = keyof typeof translations;
export type TranslationKey = keyof (typeof translations)["en"];

const translations: Record<string, Record<string, string>> = {
	en: {
		searchPlaceholder: "Search products...",
		searchLabel: "Search products",
		noResults: "No products found. Try a different search term.",
		startTyping: "Start typing to search products...",
		loading: "Searching...",
		results: "results for",
		error: "Search failed",
		inStock: "In Stock",
		outOfStock: "Out of Stock",
		preorder: "Pre-order",
		relevance: "Relevance",
		priceLowHigh: "Price: Low to High",
		priceHighLow: "Price: High to Low",
		newest: "Newest First",
		prev: "Prev",
		next: "Next",
		untitled: "Untitled",
		sku: "SKU",
		noData: "No data",
	},
	ru: {
		searchPlaceholder: "Поиск товаров...",
		searchLabel: "Поиск товаров",
		noResults: "Товары не найдены. Попробуйте изменить поисковый запрос.",
		startTyping: "Начните вводить текст для поиска товаров...",
		loading: "Поиск...",
		results: "результатов по запросу",
		error: "Ошибка поиска",
		inStock: "В наличии",
		outOfStock: "Нет в наличии",
		preorder: "Предзаказ",
		relevance: "По релевантности",
		priceLowHigh: "Цена: по возрастанию",
		priceHighLow: "Цена: по убыванию",
		newest: "Сначала новые",
		prev: "Назад",
		next: "Вперёд",
		untitled: "Без названия",
		sku: "Артикул",
		noData: "Нет данных",
	},
	de: {
		searchPlaceholder: "Produkte suchen...",
		searchLabel: "Produkte suchen",
		noResults: "Keine Produkte gefunden. Versuchen Sie einen anderen Suchbegriff.",
		startTyping: "Geben Sie Text ein, um nach Produkten zu suchen...",
		loading: "Suche läuft...",
		results: "Ergebnisse für",
		error: "Suche fehlgeschlagen",
		inStock: "Auf Lager",
		outOfStock: "Nicht auf Lager",
		preorder: "Vorbestellung",
		relevance: "Relevanz",
		priceLowHigh: "Preis: aufsteigend",
		priceHighLow: "Preis: absteigend",
		newest: "Neueste zuerst",
		prev: "Zurück",
		next: "Weiter",
		untitled: "Ohne Titel",
		sku: "Artikelnummer",
		noData: "Keine Daten",
	},
	es: {
		searchPlaceholder: "Buscar productos...",
		searchLabel: "Buscar productos",
		noResults: "No se encontraron productos. Intente con otro término de búsqueda.",
		startTyping: "Empiece a escribir para buscar productos...",
		loading: "Buscando...",
		results: "resultados para",
		error: "Búsqueda fallida",
		inStock: "En stock",
		outOfStock: "Agotado",
		preorder: "Pre-pedido",
		relevance: "Relevancia",
		priceLowHigh: "Precio: menor a mayor",
		priceHighLow: "Precio: mayor a menor",
		newest: "Más recientes",
		prev: "Anterior",
		next: "Siguiente",
		untitled: "Sin título",
		sku: "SKU",
		noData: "Sin datos",
	},
	fr: {
		searchPlaceholder: "Rechercher des produits...",
		searchLabel: "Rechercher des produits",
		noResults: "Aucun produit trouvé. Essayez un autre terme de recherche.",
		startTyping: "Commencez à taper pour rechercher des produits...",
		loading: "Recherche en cours...",
		results: "résultats pour",
		error: "Échec de la recherche",
		inStock: "En stock",
		outOfStock: "Rupture de stock",
		preorder: "Précommande",
		relevance: "Pertinence",
		priceLowHigh: "Prix : croissant",
		priceHighLow: "Prix : décroissant",
		newest: "Plus récents d'abord",
		prev: "Précédent",
		next: "Suivant",
		untitled: "Sans titre",
		sku: "Référence",
		noData: "Aucune donnée",
	},
};

/**
 * Translate a key for the given locale, falling back to English.
 */
export function t(locale: string, key: TranslationKey): string {
	return translations[locale]?.[key] ?? translations["en"][key] ?? key;
}

/**
 * Get a locale string from a user-provided locale (e.g., "en-US", "ru-RU").
 * Falls back to the base language (e.g., "en"), then to "en".
 */
export function resolveLocale(locale?: string): string {
	if (!locale) return "en";
	if (translations[locale]) return locale;
	// Try base language (e.g., "en-US" -> "en")
	const base = locale.split("-")[0];
	if (translations[base]) return base;
	return "en";
}

export default translations;
