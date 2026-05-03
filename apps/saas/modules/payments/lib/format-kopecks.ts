/**
 * Resolve the Intl locale tag and currency code from a next-intl locale key.
 * ru → { intlLocale: "ru-RU", currency: "RUB" }
 * anything else → { intlLocale: locale, currency: "USD" }
 */
function resolveLocaleCurrency(locale: string): { intlLocale: string; currency: string } {
	if (locale === "ru") {
		return { intlLocale: "ru-RU", currency: "RUB" };
	}
	const intlLocale =
		locale === "de" ? "de-DE" : locale === "es" ? "es-ES" : locale === "fr" ? "fr-FR" : "en-US";
	return { intlLocale, currency: "USD" };
}

/**
 * Format kopecks (or numeric string of kopecks) as a localized currency string.
 *
 * For `ru` locale: renders as RUB (kopecks → rubles).
 * For all other locales: renders as USD (kopecks treated as cents → dollars).
 *
 * Accepts `bigint`, `number`, or a numeric `string` (oRPC serializes BigInt as
 * string on the wire). Pass `appLocale` from `useLocale()` / `getLocale()`.
 */
export function formatKopecks(
	amount: bigint | number | string,
	options: { locale?: string; currency?: string; appLocale?: string } = {},
): string {
	const appLocale = options.appLocale;
	const resolved = appLocale ? resolveLocaleCurrency(appLocale) : null;
	const locale = options.locale ?? resolved?.intlLocale ?? "ru-RU";
	const currency = options.currency ?? resolved?.currency ?? "RUB";

	const value =
		typeof amount === "bigint"
			? Number(amount) / 100
			: typeof amount === "string"
				? Number(amount) / 100
				: amount / 100;

	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

/**
 * Format kopecks without the currency symbol — just `1 234,56`.
 */
export function formatKopecksPlain(
	amount: bigint | number | string,
	options: { locale?: string } = {},
): string {
	const locale = options.locale ?? "ru-RU";
	const value =
		typeof amount === "bigint"
			? Number(amount) / 100
			: typeof amount === "string"
				? Number(amount) / 100
				: amount / 100;

	return new Intl.NumberFormat(locale, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}
