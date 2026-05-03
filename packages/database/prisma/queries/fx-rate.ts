import { db } from "../index";

export interface FxRateRecord {
	id: string;
	pair: string;
	ratePer1UnitMicros: bigint;
	source: string;
	effectiveAt: Date;
}

/**
 * Get the latest FxRate for a currency pair (e.g. "USDRUB").
 * Returns null if no rate exists.
 */
export async function getFxRate(pair: string): Promise<FxRateRecord | null> {
	const result = await db.fxRate.findFirst({
		where: { pair },
		orderBy: { effectiveAt: "desc" },
	});

	if (!result) return null;

	return {
		...result,
		ratePer1UnitMicros: result.ratePer1UnitMicros as bigint,
	};
}

/**
 * Upsert an FxRate record. If a rate for the same pair + source already
 * exists at the same effectiveAt, it will be updated; otherwise created.
 *
 * The pair should be formatted as uppercase with no separator, e.g. "USDRUB".
 */
export async function upsertFxRate(input: {
	pair: string;
	ratePer1UnitMicros: bigint;
	source: string;
	effectiveAt: Date;
}): Promise<FxRateRecord> {
	// Use upsert with compound unique — find existing by pair+source+effectiveAt
	const pair = input.pair.toUpperCase();

	const existing = await db.fxRate.findFirst({
		where: {
			pair,
			source: input.source,
			effectiveAt: input.effectiveAt,
		},
	});

	const result = existing
		? await db.fxRate.update({
				where: { id: existing.id },
				data: {
					ratePer1UnitMicros: input.ratePer1UnitMicros,
				},
			})
		: await db.fxRate.create({
				data: {
					pair,
					ratePer1UnitMicros: input.ratePer1UnitMicros,
					source: input.source,
					effectiveAt: input.effectiveAt,
				},
			});

	return {
		...result,
		ratePer1UnitMicros: result.ratePer1UnitMicros as bigint,
	};
}

/**
 * Convert an amount from one currency to another using the latest FxRate.
 *
 * @param amount The amount in the source currency (as a number, e.g. 99.99)
 * @param fromCurrency Source currency code (e.g. "USD")
 * @param toCurrency Target currency code (e.g. "RUB")
 * @returns The converted amount in the target currency, or null if no rate found
 */
export async function convertAmount(
	amount: number,
	fromCurrency: string,
	toCurrency: string,
): Promise<number | null> {
	if (fromCurrency === toCurrency) return amount;

	const pair = `${fromCurrency.toUpperCase()}${toCurrency.toUpperCase()}`;
	const rate = await getFxRate(pair);

	if (!rate) return null;

	// ratePer1UnitMicros = micro-units per 1 unit of source currency
	// e.g. for USDRUB: 100_000_000 means 1 USD = 100 RUB
	const micros = Number(rate.ratePer1UnitMicros);
	const ratePerUnit = micros / 1_000_000;

	return amount * ratePerUnit;
}

/**
 * Get the inverse rate for a pair (e.g. USDRUB -> RUBUSD = 1 / rate).
 */
export async function getInverseRate(pair: string): Promise<FxRateRecord | null> {
	if (pair.length !== 6) return null;

	const from = pair.slice(0, 3);
	const to = pair.slice(3, 6);
	const inversePair = `${to}${from}`;

	return getFxRate(inversePair);
}
