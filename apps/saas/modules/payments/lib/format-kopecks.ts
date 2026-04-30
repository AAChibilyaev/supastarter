/**
 * Format kopecks (or numeric string of kopecks) as a localized currency string.
 *
 * Always renders RUB with 2 fraction digits. Accepts `bigint`, `number`, or
 * a numeric `string` (because oRPC serializes BigInt as string on the wire).
 */
export function formatKopecks(
	amount: bigint | number | string,
	options: { locale?: string; currency?: string } = {},
): string {
	const locale = options.locale ?? "ru-RU";
	const currency = options.currency ?? "RUB";

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
