import { ORPCError } from "@orpc/client";
import { getSearchIndexBySlug } from "@repo/database";
import {
	getGlobalSynonymSets,
	globalSynonymSetsToPairs,
	replaceGlobalSynonymSets,
	validateGlobalSynonymSetEntries,
} from "@repo/database/prisma/queries/global-synonym-sets";
import {
	getSynonymsByIndexId,
	getSynonymsByOrganizationId,
	getSynonymRootsByIndexId,
	replaceSynonyms,
	rowsToSynonymPairs,
	validateSynonymEntries,
} from "@repo/database/prisma/queries/synonyms";
import { logger } from "@repo/logs";
import { aliasName, syncSynonymsToTypesense } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

// ─── Shared schemas ────────────────────────────────────────────────

const synonymPairSchema = z.object({
	root: z.string().min(1).max(255),
	synonym: z.string().min(1).max(255),
});

const synonymImportRowSchema = z.object({
	root: z.string().min(1).max(255),
	synonym: z.string().min(1).max(255),
	locale: z.string().max(10).optional().nullable(),
});

const importResultSchema = z.object({
	imported: z.number(),
	skipped: z.number(),
	errors: z.array(z.string()),
	warnings: z.array(z.string()),
	dryRun: z.boolean(),
});

// ─── CSV helpers ───────────────────────────────────────────────────

function synonymsToCsv(
	rows: { root: string; synonym: string; locale?: string | null }[],
	includeLocale = true,
): string {
	const header = includeLocale ? "root,synonym,locale" : "root,synonym";
	const lines = [header];
	for (const r of rows) {
		const escapedRoot = r.root.includes(",") ? `"${r.root}"` : r.root;
		const escapedSynonym = r.synonym.includes(",") ? `"${r.synonym}"` : r.synonym;
		if (includeLocale) {
			lines.push(`${escapedRoot},${escapedSynonym},${r.locale ?? "en"}`);
		} else {
			lines.push(`${escapedRoot},${escapedSynonym}`);
		}
	}
	return lines.join("\n");
}

function parseCsvSynonyms(csv: string): { root: string; synonym: string; locale: string | null }[] {
	const lines = csv.split("\n").filter((l) => l.trim());
	if (lines.length < 2) return [];

	// Detect header: if first line contains "root", skip it
	const firstLine = lines[0].toLowerCase();
	const startIdx = firstLine.includes("root") ? 1 : 0;

	const results: { root: string; synonym: string; locale: string | null }[] = [];

	for (let i = startIdx; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		// Simple CSV parser (handles quoted values)
		const parts = parseCsvLine(line);
		if (parts.length >= 2) {
			results.push({
				root: parts[0].trim(),
				synonym: parts[1].trim(),
				locale: parts[2]?.trim() || "en",
			});
		}
	}

	return results;
}

function parseCsvLine(line: string): string[] {
	const parts: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === "," && !inQuotes) {
			parts.push(current);
			current = "";
		} else {
			current += char;
		}
	}
	parts.push(current);

	return parts;
}

// ─── Per-index synonym export ──────────────────────────────────────

export const exportIndexSynonyms = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/synonyms/export",
		tags: ["Search"],
		summary: "Export synonyms for a search index",
		description:
			"Exports synonyms for a search index in CSV or JSON format. CSV format: root,synonym,locale. JSON format: array of {root, synonym, locale}.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			format: z.enum(["csv", "json"]).default("json"),
		}),
	)
	.output(
		z.object({
			format: z.string(),
			data: z.string(),
			total: z.number(),
			filename: z.string(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await getSearchIndexBySlug(input.organizationId, input.slug);
		if (!index) {
			throw new ORPCError("NOT_FOUND", { message: "Index not found" });
		}

		const rows = await getSynonymsByIndexId(index.id);
		const pairs = rowsToSynonymPairs(rows);

		const filename = `synonyms-${input.slug}`;

		if (input.format === "csv") {
			return {
				format: "csv",
				data: synonymsToCsv(pairs),
				total: pairs.length,
				filename: `${filename}.csv`,
			};
		}

		return {
			format: "json",
			data: JSON.stringify(pairs, null, 2),
			total: pairs.length,
			filename: `${filename}.json`,
		};
	});

// ─── Per-index synonym import ──────────────────────────────────────

export const importIndexSynonyms = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/synonyms/import",
		tags: ["Search"],
		summary: "Import synonyms for a search index",
		description:
			"Imports synonyms from CSV or JSON body. Dry-run mode previews changes without applying.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			format: z.enum(["csv", "json"]).default("json"),
			data: z.string(),
			dryRun: z.boolean().default(false),
		}),
	)
	.output(importResultSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await getSearchIndexBySlug(input.organizationId, input.slug);
		if (!index) {
			throw new ORPCError("NOT_FOUND", { message: "Index not found" });
		}

		// Parse input
		let entries: { root: string; synonym: string; locale: string | null }[];
		try {
			if (input.format === "csv") {
				entries = parseCsvSynonyms(input.data);
			} else {
				const parsed = JSON.parse(input.data);
				if (!Array.isArray(parsed)) {
					throw new Error("JSON must be an array of synonym objects");
				}
				entries = parsed.map(
					(item: { root?: string; synonym?: string; locale?: string }) => ({
						root: item.root ?? "",
						synonym: item.synonym ?? "",
						locale: item.locale ?? "en",
					}),
				);
			}
		} catch (err) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Failed to parse input: ${err instanceof Error ? err.message : "Unknown error"}`,
			});
		}

		if (entries.length === 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: "No valid synonym entries found in input",
			});
		}

		// Validate
		const existingRoots = await getSynonymRootsByIndexId(index.id);
		const validation = validateSynonymEntries(entries, existingRoots);

		if (!validation.valid) {
			return {
				imported: 0,
				skipped: 0,
				errors: validation.errors,
				warnings: validation.warnings,
				dryRun: input.dryRun,
			};
		}

		if (input.dryRun) {
			return {
				imported: entries.length,
				skipped: 0,
				errors: [],
				warnings: validation.warnings,
				dryRun: true,
			};
		}

		// Apply
		try {
			await replaceSynonyms(index.id, input.organizationId, entries);

			// Sync to Typesense (best-effort)
			const collection = aliasName(input.organizationId, input.slug);
			syncSynonymsToTypesense(collection, entries).catch((err) =>
				logger.error("importIndexSynonyms: Typesense sync failed", {
					organizationId: input.organizationId,
					slug: input.slug,
					err,
				}),
			);

			return {
				imported: entries.length,
				skipped: 0,
				errors: [],
				warnings: validation.warnings,
				dryRun: false,
			};
		} catch (err) {
			logger.error("importIndexSynonyms failed", {
				organizationId: input.organizationId,
				slug: input.slug,
				err,
			});
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to import synonyms",
			});
		}
	});

// ─── Global synonym export ─────────────────────────────────────────

export const exportGlobalSynonyms = protectedProcedure
	.route({
		method: "GET",
		path: "/search/global-synonyms/export",
		tags: ["Search"],
		summary: "Export global synonym sets",
		description:
			"Exports global synonym sets in CSV or JSON format. CSV format: name,root,synonyms,locale. JSON format: array of global synonym set objects.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			format: z.enum(["csv", "json"]).default("json"),
		}),
	)
	.output(
		z.object({
			format: z.string(),
			data: z.string(),
			total: z.number(),
			filename: z.string(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const sets = await getGlobalSynonymSets(input.organizationId);

		if (input.format === "csv") {
			const lines = ["name,root,synonyms,locale"];
			for (const s of sets) {
				const escapedName = s.name.includes(",") ? `"${s.name}"` : s.name;
				const escapedRoot = s.root.includes(",") ? `"${s.root}"` : s.root;
				const synonymsStr = s.synonyms.join(";");
				lines.push(`${escapedName},${escapedRoot},${synonymsStr},${s.locale ?? "en"}`);
			}
			return {
				format: "csv",
				data: lines.join("\n"),
				total: sets.length,
				filename: "global-synonyms.csv",
			};
		}

		return {
			format: "json",
			data: JSON.stringify(
				sets.map((s) => ({
					name: s.name,
					root: s.root,
					synonyms: s.synonyms,
					locale: s.locale ?? "en",
					scope: s.scope,
					excludedCollectionIds: s.excludedCollectionIds,
				})),
				null,
				2,
			),
			total: sets.length,
			filename: "global-synonyms.json",
		};
	});

// ─── Global synonym import ─────────────────────────────────────────

export const importGlobalSynonyms = protectedProcedure
	.route({
		method: "POST",
		path: "/search/global-synonyms/import",
		tags: ["Search"],
		summary: "Import global synonym sets",
		description:
			"Imports global synonym sets from CSV or JSON body. Dry-run mode previews changes without applying.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			format: z.enum(["csv", "json"]).default("json"),
			data: z.string(),
			dryRun: z.boolean().default(false),
		}),
	)
	.output(importResultSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		// Parse input
		let entries: {
			name: string;
			root: string;
			synonyms: string[];
			locale?: string | null;
			scope?: string;
			excludedCollectionIds?: string[];
		}[];
		try {
			if (input.format === "csv") {
				entries = parseCsvGlobalSynonyms(input.data);
			} else {
				const parsed = JSON.parse(input.data);
				if (!Array.isArray(parsed)) {
					throw new Error("JSON must be an array of global synonym set objects");
				}
				entries = parsed.map(
					(item: {
						name?: string;
						root?: string;
						synonyms?: string[];
						locale?: string;
						scope?: string;
						excludedCollectionIds?: string[];
					}) => ({
						name: item.name ?? "",
						root: item.root ?? "",
						synonyms: item.synonyms ?? [],
						locale: item.locale,
						scope: item.scope ?? "all",
						excludedCollectionIds: item.excludedCollectionIds ?? [],
					}),
				);
			}
		} catch (err) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Failed to parse input: ${err instanceof Error ? err.message : "Unknown error"}`,
			});
		}

		if (entries.length === 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: "No valid global synonym sets found in input",
			});
		}

		// Validate
		const validation = validateGlobalSynonymSetEntries(entries);

		if (!validation.valid) {
			return {
				imported: 0,
				skipped: 0,
				errors: validation.errors,
				warnings: validation.warnings,
				dryRun: input.dryRun,
			};
		}

		if (input.dryRun) {
			return {
				imported: entries.length,
				skipped: 0,
				errors: [],
				warnings: validation.warnings,
				dryRun: true,
			};
		}

		// Apply
		try {
			await replaceGlobalSynonymSets(input.organizationId, entries);

			return {
				imported: entries.length,
				skipped: 0,
				errors: [],
				warnings: validation.warnings,
				dryRun: false,
			};
		} catch (err) {
			logger.error("importGlobalSynonyms failed", {
				organizationId: input.organizationId,
				err,
			});
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to import global synonyms",
			});
		}
	});

function parseCsvGlobalSynonyms(csv: string): {
	name: string;
	root: string;
	synonyms: string[];
	locale?: string;
	scope?: string;
	excludedCollectionIds?: string[];
}[] {
	const lines = csv.split("\n").filter((l) => l.trim());
	if (lines.length < 2) return [];

	const firstLine = lines[0].toLowerCase();
	const startIdx = firstLine.includes("name") ? 1 : 0;

	return lines.slice(startIdx).map((line) => {
		const parts = parseCsvLine(line.trim());
		return {
			name: parts[0]?.trim() || "",
			root: parts[1]?.trim() || "",
			synonyms: (parts[2]?.trim() || "").split(";").filter(Boolean),
			locale: parts[3]?.trim() || "en",
		};
	});
}
