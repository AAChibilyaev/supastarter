import { db, getFxRate, upsertFxRate } from "@repo/database";
import { syncExchangeRates } from "@repo/payments";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

const FxRateOutputSchema = z.object({
	id: z.string(),
	pair: z.string(),
	ratePer1UnitMicros: z.string(), // BigInt → string via oRPC
	source: z.string(),
	effectiveAt: z.string(),
	createdAt: z.string(),
});

/**
 * List all FxRate records, optionally filtered by pair or source.
 */
export const listFxRates = adminProcedure
	.route({
		method: "GET",
		path: "/admin/fx-rates",
		tags: ["Administration"],
		summary: "List exchange rates",
		description: "List all FxRate records with optional pair and source filters",
	})
	.input(
		z.object({
			pair: z.string().optional(),
			source: z.string().optional(),
			limit: z.number().min(1).max(200).optional().default(100),
			offset: z.number().min(0).optional().default(0),
		}),
	)
	.output(
		z.object({
			rates: z.array(FxRateOutputSchema),
			total: z.number(),
		}),
	)
	.handler(async ({ input: { pair, source, limit, offset } }) => {
		const where: Record<string, unknown> = {};
		if (pair) where.pair = pair;
		if (source) where.source = source;

		const [rates, total] = await Promise.all([
			db.fxRate.findMany({
				where,
				orderBy: [{ pair: "asc" }, { effectiveAt: "desc" }],
				take: limit,
				skip: offset,
			}),
			db.fxRate.count({ where }),
		]);

		return {
			rates: rates.map((r) => ({
				id: r.id,
				pair: r.pair,
				ratePer1UnitMicros: r.ratePer1UnitMicros.toString(),
				source: r.source,
				effectiveAt: r.effectiveAt.toISOString(),
				createdAt: r.createdAt.toISOString(),
			})),
			total,
		};
	});

/**
 * Get the latest FxRate for a specific currency pair.
 */
export const getFxRateProcedure = adminProcedure
	.route({
		method: "GET",
		path: "/admin/fx-rates/{pair}",
		tags: ["Administration"],
		summary: "Get exchange rate by pair",
		description: "Get the latest exchange rate for a specific currency pair (e.g. USDRUB)",
	})
	.input(
		z.object({
			pair: z.string().min(6).max(6),
		}),
	)
	.output(
		z.object({
			rate: FxRateOutputSchema.nullable(),
		}),
	)
	.handler(async ({ input: { pair } }) => {
		const rate = await getFxRate(pair.toUpperCase());

		if (!rate) return { rate: null };

		return {
			rate: {
				id: rate.id,
				pair: rate.pair,
				ratePer1UnitMicros: rate.ratePer1UnitMicros.toString(),
				source: rate.source,
				effectiveAt: rate.effectiveAt.toISOString(),
				createdAt: rate.createdAt.toISOString(),
			},
		};
	});

/**
 * Create or update an exchange rate for a currency pair.
 */
export const upsertFxRateProcedure = adminProcedure
	.route({
		method: "POST",
		path: "/admin/fx-rates",
		tags: ["Administration"],
		summary: "Upsert exchange rate",
		description:
			"Create or update an exchange rate for a currency pair. The pair should be 6 characters (e.g. USDRUB). ratePer1UnitMicros is a BigInt: micro-units per 1 unit of source currency (e.g. 100000000 = 100 RUB per 1 USD).",
	})
	.input(
		z.object({
			pair: z
				.string()
				.min(6)
				.max(6)
				.transform((v) => v.toUpperCase()),
			rate: z.number().positive(),
			source: z.string().default("manual"),
			effectiveAt: z.string().optional(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
		}),
	)
	.handler(async ({ input: { pair, rate, source, effectiveAt } }) => {
		// Convert decimal rate to micros (BigInt)
		const ratePer1UnitMicros = BigInt(Math.round(rate * 1_000_000));

		await upsertFxRate({
			pair: pair.toUpperCase(),
			ratePer1UnitMicros,
			source,
			effectiveAt: effectiveAt ? new Date(effectiveAt) : new Date(),
		});

		return { success: true };
	});

/**
 * Sync exchange rates from the external API provider.
 */
export const syncFxRates = adminProcedure
	.route({
		method: "POST",
		path: "/admin/fx-rates/sync",
		tags: ["Administration"],
		summary: "Sync exchange rates from external API",
		description:
			"Fetch the latest exchange rates from the configured external API (open.er-api.com or FX_RATE_API_URL) and upsert them into the database.",
	})
	.input(z.object({}))
	.output(
		z.object({
			count: z.number(),
		}),
	)
	.handler(async () => {
		const count = await syncExchangeRates();
		return { count };
	});
