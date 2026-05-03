import { convertAmount as dbConvertAmount, getFxRate, upsertFxRate } from "@repo/database";
import { logger } from "@repo/logs";

const MICROS_PER_UNIT = 1_000_000;

/**
 * Convert an invoice amount from Stripe's currency to a preferred display currency.
 *
 * Stripe amounts are in minor units (cents for USD, kopecks for RUB).
 * This function converts from Stripe's native currency to the target currency
 * using the latest FxRate from the database.
 *
 * @param stripeAmountMinor Amount in Stripe minor units (e.g. 9999 for $99.99)
 * @param fromCurrency Stripe's currency code (e.g. "usd" — Stripe lowercase)
 * @param toCurrency Target display currency (e.g. "RUB" — uppercase)
 * @returns Converted amount in target currency's minor units, or null if no rate
 */
export async function convertInvoiceAmount(
	stripeAmountMinor: number,
	fromCurrency: string,
	toCurrency: string,
): Promise<number | null> {
	const from = fromCurrency.toUpperCase();
	const to = toCurrency.toUpperCase();

	if (from === to) return stripeAmountMinor;

	try {
		// Convert from minor units to major units (e.g. cents → dollars)
		const amountMajor = getMajorUnits(from, stripeAmountMinor);

		// Convert using FxRate
		const convertedMajor = await dbConvertAmount(amountMajor, from, to);

		if (convertedMajor === null) {
			logger.warn({ from, to }, "No FxRate found for currency pair");
			return null;
		}

		// Convert back to minor units of the target currency
		const convertedMinor = getMinorUnits(to, convertedMajor);
		return Math.round(convertedMinor);
	} catch (err) {
		logger.error({ err, from, to, stripeAmountMinor }, "Failed to convert invoice amount");
		return null;
	}
}

/**
 * Format a Stripe currency pair for FxRate lookup.
 */
export function formatCurrencyPair(from: string, to: string): string {
	return `${from.toUpperCase()}${to.toUpperCase()}`;
}

/**
 * Determine the number of minor units per major unit for a given currency.
 * Most currencies use 2 decimal places (cents), some use 0 or 3.
 */
function getMinorUnitDecimals(currency: string): number {
	const zeroDecimalCurrencies = new Set([
		"BIF",
		"CLP",
		"DJF",
		"GNF",
		"JPY",
		"KMF",
		"KRW",
		"MGA",
		"PYG",
		"RWF",
		"UGX",
		"VND",
		"VUV",
		"XAF",
		"XOF",
		"XPF",
	]);
	const threeDecimalCurrencies = new Set(["BHD", "IQD", "JOD", "KWD", "OMR", "TND"]);

	const upper = currency.toUpperCase();
	if (zeroDecimalCurrencies.has(upper)) return 0;
	if (threeDecimalCurrencies.has(upper)) return 3;
	return 2; // default: cents
}

/**
 * Convert from minor units to major units (e.g., cents → dollars).
 */
function getMajorUnits(currency: string, minorAmount: number): number {
	const decimals = getMinorUnitDecimals(currency);
	const divisor = 10 ** decimals;
	// Handle floating point from Stripe integer minor units
	return minorAmount / divisor;
}

/**
 * Convert from major units to minor units (e.g., dollars → cents).
 */
function getMinorUnits(currency: string, majorAmount: number): number {
	const decimals = getMinorUnitDecimals(currency);
	const multiplier = 10 ** decimals;
	return majorAmount * multiplier;
}

export { getFxRate, upsertFxRate };
