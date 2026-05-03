import { getSearchIndexBySlug } from "@repo/database";
import { db } from "@repo/database/prisma/client";
import { logger } from "@repo/logs";
import { suggestSynonyms, type AISynonymSuggestionsResult } from "@repo/nlp";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

/**
 * Sample up to N documents from a collection that matches the search index slug.
 * Returns concatenated text from document data fields.
 */
async function sampleCollectionText(
	organizationId: string,
	slug: string,
	maxDocs: number = 5,
	maxChars: number = 4000,
): Promise<string> {
	try {
		// Try to find a Collection whose slug matches the search index slug
		const collection = await db.collection.findFirst({
			where: { organizationId, slug },
		});

		if (!collection) {
			return "";
		}

		// Get up to maxDocs documents from this collection
		const docs = await db.collectionDocument.findMany({
			where: { collectionId: collection.id },
			take: maxDocs,
			orderBy: { createdAt: "desc" },
		});

		if (docs.length === 0) {
			return "";
		}

		// Extract text from document data fields, joining as plain text
		const textParts: string[] = [];
		for (const doc of docs) {
			const data = doc.data as Record<string, unknown>;
			const values: string[] = [];

			for (const val of Object.values(data)) {
				if (typeof val === "string" && val.length > 0) {
					values.push(val);
				} else if (typeof val === "number" || typeof val === "boolean") {
					values.push(String(val));
				}
			}

			if (values.length > 0) {
				textParts.push(values.join(". "));
			}
		}

		const joined = textParts.join("\n\n---\n\n");
		return joined.length > maxChars ? joined.slice(0, maxChars) : joined;
	} catch (err) {
		logger.warn("sampleCollectionText: failed to sample documents", {
			organizationId,
			slug,
			err,
		});
		return "";
	}
}

export const suggestAISynonyms = protectedProcedure
	.use(creditGate("auto_synonym_generation", CREDIT_RATES.auto_synonym_generation))
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/synonyms/suggest",
		tags: ["Search"],
		summary: "AI-powered synonym suggestions",
		description:
			"Uses AI to suggest synonyms for a root word based on document content context. Results are cached per (rootWord, locale) pair for 1 hour.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			rootWord: z.string().min(1).max(255),
			locale: z.string().max(10).default("en"),
		}),
	)
	.output(
		z.object({
			suggestions: z.array(
				z.object({
					word: z.string(),
					score: z.number().min(0).max(1),
					rationale: z.string(),
				}),
			),
			rootWord: z.string(),
			locale: z.string(),
			cached: z.boolean(),
		}),
	)
	.handler(async ({ input, context }) => {
		const { creditReservationId } = context as unknown as CreditGateContext;
		await requireOrganizationAdmin(input.organizationId, context.user);
		await requireSearchIndex(input.organizationId, input.slug);

		try {
			const sampleText = await sampleCollectionText(input.organizationId, input.slug);

			logger.info("suggestAISynonyms: generating suggestions", {
				organizationId: input.organizationId,
				slug: input.slug,
				rootWord: input.rootWord,
				locale: input.locale,
				hasSampleText: sampleText.length > 0,
			});

			const result = await suggestSynonyms(input.rootWord, sampleText, input.locale);

			// Commit flat-fee on success
			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "auto_synonym_generation",
				provider: "openai",
				model: "gpt-4o-mini",
				flatFeeKopecks: CREDIT_RATES.auto_synonym_generation,
			});

			return {
				suggestions: result.suggestions.map((s) => ({
					word: s.word,
					score: s.score,
					rationale: s.rationale,
				})),
				rootWord: result.rootWord,
				locale: result.locale,
				cached: result.cached,
			};
		} catch (err) {
			await releaseCreditReservation(creditReservationId);
			throw err;
		}
	});

export const suggestAIGlobalSynonyms = protectedProcedure
	.use(creditGate("auto_synonym_generation", CREDIT_RATES.auto_synonym_generation))
	.route({
		method: "POST",
		path: "/search/global-synonyms/suggest",
		tags: ["Search"],
		summary: "AI-powered global synonym suggestions",
		description:
			"Uses AI to suggest global synonyms for a root word. Samples text from all collections in the organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			rootWord: z.string().min(1).max(255),
			locale: z.string().max(10).default("en"),
		}),
	)
	.output(
		z.object({
			suggestions: z.array(
				z.object({
					word: z.string(),
					score: z.number().min(0).max(1),
					rationale: z.string(),
				}),
			),
			rootWord: z.string(),
			locale: z.string(),
			cached: z.boolean(),
		}),
	)
	.handler(async ({ input, context }) => {
		const { creditReservationId } = context as unknown as CreditGateContext;
		await requireOrganizationAdmin(input.organizationId, context.user);

		try {
			// Sample text from all collections in the org (up to 5 docs across all collections)
			let sampleText = "";
			try {
				const docs = await db.collectionDocument.findMany({
					where: { organizationId: input.organizationId },
					take: 5,
					orderBy: { createdAt: "desc" },
				});

				const textParts: string[] = [];
				for (const doc of docs) {
					const data = doc.data as Record<string, unknown>;
					const values: string[] = [];
					for (const val of Object.values(data)) {
						if (typeof val === "string" && val.length > 0) {
							values.push(val);
						} else if (typeof val === "number" || typeof val === "boolean") {
							values.push(String(val));
						}
					}
					if (values.length > 0) {
						textParts.push(values.join(". "));
					}
				}
				sampleText = textParts.join("\n\n---\n\n").slice(0, 4000);
			} catch (err) {
				logger.warn("suggestAIGlobalSynonyms: failed to sample docs", {
					organizationId: input.organizationId,
					err,
				});
			}

			const result = await suggestSynonyms(input.rootWord, sampleText, input.locale);

			// Commit flat-fee on success
			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "auto_synonym_generation",
				provider: "openai",
				model: "gpt-4o-mini",
				flatFeeKopecks: CREDIT_RATES.auto_synonym_generation,
			});

			return {
				suggestions: result.suggestions.map((s) => ({
					word: s.word,
					score: s.score,
					rationale: s.rationale,
				})),
				rootWord: result.rootWord,
				locale: result.locale,
				cached: result.cached,
			};
		} catch (err) {
			await releaseCreditReservation(creditReservationId);
			throw err;
		}
	});
