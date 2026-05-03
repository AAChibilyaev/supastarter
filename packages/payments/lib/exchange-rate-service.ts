import { upsertFxRate } from "@repo/database";
import { logger } from "@repo/logs";

/**
 * Supported FxRate source identifiers.
 */
export type FxRateSource = "open-exchange-rates" | "exchangerate-api" | "manual";

/**
 * Fetch exchange rates from the configured external API and upsert them into
 * the database's FxRate table.
 *
 * By default, fetches from the free exchangerate.host API (no key required for
 * basic usage). Override with FX_RATE_API_URL and FX_RATE_API_KEY env vars.
 *
 * Returns the number of rate pairs upserted, or 0 if the fetch failed.
 */
export async function syncExchangeRates(): Promise<number> {
	const apiUrl = process.env.FX_RATE_API_URL ?? "https://open.er-api.com/v6/latest/USD";
	const apiKey = process.env.FX_RATE_API_KEY;

	try {
		const url = apiKey ? `${apiUrl}&apikey=${apiKey}` : apiUrl;
		const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

		if (!response.ok) {
			logger.error(
				{ status: response.status, url: apiUrl },
				"Exchange rate API returned error",
			);
			return 0;
		}

		const data = (await response.json()) as Record<string, unknown>;

		// Parse response — supports multiple API formats
		// open.er-api.com format: { base_code: "USD", rates: { EUR: 0.92, ... } }
		// exchangerate.host format: { base: "USD", rates: { EUR: 0.92, ... } }
		const rates = (data.rates as Record<string, number> | undefined) ?? null;
		const baseCode =
			(typeof data.base_code === "string"
				? data.base_code
				: typeof data.base === "string"
					? data.base
					: null) ?? "USD";

		if (!rates || Object.keys(rates).length === 0) {
			logger.warn({ url: apiUrl }, "Exchange rate API returned empty rates");
			return 0;
		}

		const effectiveAt = new Date();
		const now = effectiveAt;

		// Upsert rates for common currency pairs relative to USD base
		const targetCurrencies = [
			"EUR",
			"RUB",
			"GBP",
			"JPY",
			"CNY",
			"INR",
			"CAD",
			"AUD",
			"CHF",
			"SEK",
			"NOK",
			"DKK",
			"NZD",
			"SGD",
			"HKD",
			"KRW",
			"BRL",
			"MXN",
			"TRY",
			"ZAR",
			"PLN",
			"CZK",
			"HUF",
			"ILS",
			"THB",
			"MYR",
			"PHP",
			"IDR",
			"VND",
			"AED",
			"SAR",
			"KWD",
		];

		let count = 0;

		for (const target of targetCurrencies) {
			const rate = rates[target];
			if (typeof rate !== "number" || rate <= 0) continue;

			// Store ratePer1UnitMicros: bigint of micro-units per 1 unit of base
			// e.g. for USDEUR rate=0.92 → 0.92 * 1_000_000 = 920_000
			const micros = BigInt(Math.round(rate * 1_000_000));

			const pair = `${baseCode.toUpperCase()}${target.toUpperCase()}`;

			await upsertFxRate({
				pair,
				ratePer1UnitMicros: micros,
				source: "open-exchange-rates",
				effectiveAt: now,
			});
			count++;

			// Also store the inverse pair (e.g. RUBUSD = 1/rate)
			const inversePair = `${target.toUpperCase()}${baseCode.toUpperCase()}`;
			const inverseRate = rate > 0 ? 1 / rate : 0;
			if (inverseRate > 0) {
				const inverseMicros = BigInt(Math.round(inverseRate * 1_000_000));
				await upsertFxRate({
					pair: inversePair,
					ratePer1UnitMicros: inverseMicros,
					source: "open-exchange-rates",
					effectiveAt: now,
				});
				count++;
			}
		}

		logger.info({ count, base: baseCode }, "Exchange rates synced successfully");
		return count;
	} catch (err) {
		logger.error({ err, url: apiUrl }, "Failed to sync exchange rates");
		return 0;
	}
}
