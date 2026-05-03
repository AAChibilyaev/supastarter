import { db, type Prisma } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

/**
 * Spell correction configuration stored per-index in SearchIndex.schema JSON.
 */
export const spellConfigSchema = z.object({
	/** Maximum edit distance for SymSpell (1-4, default: 2) */
	maxEditDistance: z.number().int().min(1).max(4).default(2),
	/** Verbosity level: 0=top only, 1=same distance, 2=all (default: 2) */
	verbosity: z.number().int().min(0).max(2).default(2),
	/** Maximum results per word (default: 10) */
	maxResults: z.number().int().min(1).max(50).default(10),
	/** Whether to split compound words (German, Finnish) */
	splitCompoundWords: z.boolean().default(false),
	/** Auto-correct vs suggest mode */
	mode: z.enum(["auto", "suggest"]).default("auto"),
	/** Try context-aware correction */
	useContextCorrection: z.boolean().default(false),
	/** Per-language overrides */
	perLanguage: z
		.record(
			z.enum(["ru", "en", "de", "es", "fr"]),
			z.object({
				enabled: z.boolean().default(true),
				maxEditDistance: z.number().int().min(1).max(4).optional(),
				/** Try keyboard layout fix (RU↔EN) */
				fixKeyboardLayout: z.boolean().default(true),
				/** Try transliteration detection */
				transliterate: z.boolean().default(true),
				/** Normalize Yo/ё */
				normalizeYo: z.boolean().default(true),
			}),
		)
		.default({
			ru: { enabled: true, fixKeyboardLayout: true, transliterate: true, normalizeYo: true },
			en: { enabled: true, fixKeyboardLayout: true, transliterate: true, normalizeYo: true },
			de: { enabled: true, fixKeyboardLayout: true, transliterate: true, normalizeYo: true },
			es: { enabled: true, fixKeyboardLayout: true, transliterate: true, normalizeYo: true },
			fr: { enabled: true, fixKeyboardLayout: true, transliterate: true, normalizeYo: true },
		}),
});

export type SpellConfig = z.infer<typeof spellConfigSchema>;

export const DEFAULT_SPELL_CONFIG: SpellConfig = {
	maxEditDistance: 2,
	verbosity: 2,
	maxResults: 10,
	splitCompoundWords: false,
	mode: "auto",
	useContextCorrection: false,
	perLanguage: {
		ru: { enabled: true, fixKeyboardLayout: true, transliterate: true, normalizeYo: true },
		en: { enabled: true, fixKeyboardLayout: true, transliterate: true, normalizeYo: true },
		de: { enabled: true, fixKeyboardLayout: true, transliterate: true, normalizeYo: true },
		es: { enabled: true, fixKeyboardLayout: true, transliterate: true, normalizeYo: true },
		fr: { enabled: true, fixKeyboardLayout: true, transliterate: true, normalizeYo: true },
	},
};

export const getSpellConfig = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/spell-config",
		tags: ["Search"],
		summary: "Get spell correction config for a search index",
		description:
			"Returns the per-index spell correction configuration (SymSpell settings, language overrides).",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(spellConfigSchema)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const schema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};

		const raw = (schema as Record<string, unknown>)._spellConfig;
		if (raw && typeof raw === "object") {
			const parsed = spellConfigSchema.safeParse(raw);
			if (parsed.success) return parsed.data;
		}

		return { ...DEFAULT_SPELL_CONFIG };
	});

export const updateSpellConfig = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/spell-config",
		tags: ["Search"],
		summary: "Update spell correction config for a search index",
		description: "Replaces the entire spell correction configuration for the index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			config: spellConfigSchema,
		}),
	)
	.output(spellConfigSchema)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const schema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};

		await db.searchIndex.update({
			where: { id: index.id },
			data: {
				schema: {
					...schema,
					_spellConfig: input.config,
				} as Prisma.InputJsonValue,
			},
		});

		return input.config;
	});
