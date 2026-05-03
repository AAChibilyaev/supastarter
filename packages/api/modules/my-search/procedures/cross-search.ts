import { listPersonalSearchIndexes } from "@repo/database";
import { aliasName, multiSearchDocuments } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

const searchHitSchema = z.object({
	/** Typesense text match score (higher = better match) */
	score: z.number().optional(),
	/** Unique chunk identifier */
	chunkId: z.string(),
	/** File identifier this chunk belongs to */
	fileId: z.string(),
	/** The chunk text content */
	content: z.string(),
	/** Original filename */
	filename: z.string(),
	/** File type (pdf, docx, txt, md, etc.) */
	fileType: z.string(),
	/** Source URL if the file was added from a URL */
	sourceUrl: z.string().optional(),
	/** Unix timestamp of when the file was uploaded */
	uploadedAt: z.number(),
	/** Highlighted snippet from search */
	highlightSnippet: z.string().optional(),
});

/** Convert an ISO 8601 date string to a Unix epoch timestamp (seconds). */
function toUnixTimestamp(isoDate: string): number {
	return Math.floor(new Date(isoDate).getTime() / 1000);
}

export const crossSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/my-search/search",
		tags: ["My Search"],
		summary: "Search across all personal search indexes",
		description:
			"Performs a federated search across all personal search indexes belonging to the user's organization. Supports pagination, file type filter, and date range filter.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			q: z.string().min(1),
			page: z.number().int().min(1).optional().default(1),
			perPage: z.number().int().min(1).max(100).optional().default(20),
			fileTypeFilter: z.string().optional(),
			/** ISO 8601 date string — filters for chunks uploaded on or after this date */
			dateFrom: z.string().optional(),
			/** ISO 8601 date string — filters for chunks uploaded on or before this date */
			dateTo: z.string().optional(),
		}),
	)
	.output(
		z.object({
			hits: z.array(searchHitSchema),
			found: z.number(),
			page: z.number(),
			perPage: z.number(),
			searchTimeMs: z.number(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAccess(input.organizationId, user.id);

		const indexes = await listPersonalSearchIndexes(input.organizationId);

		if (indexes.length === 0) {
			return { hits: [], found: 0, page: 1, perPage: input.perPage, searchTimeMs: 0 };
		}

		// Build date range conditions (applied per-chunk, not per-index)
		const dateConditions: string[] = [];
		if (input.dateFrom) {
			dateConditions.push(`uploaded_at:>=${toUnixTimestamp(input.dateFrom)}`);
		}
		if (input.dateTo) {
			dateConditions.push(`uploaded_at:<=${toUnixTimestamp(input.dateTo)}`);
		}
		const dateFilterStr = dateConditions.length > 0 ? dateConditions.join(" && ") : undefined;

		const entries = indexes.map((idx) => {
			const chunkAlias = `${aliasName(input.organizationId, idx.slug)}_chunks`;

			// Build per-index filter
			const conditions: string[] = [`index_id:=${idx.slug}`];
			if (input.fileTypeFilter) {
				conditions.push(`file_type:=${input.fileTypeFilter}`);
			}
			if (dateFilterStr) {
				conditions.push(dateFilterStr);
			}

			return {
				alias: chunkAlias,
				q: input.q,
				queryBy: "content",
				highlightFields: "content",
				filterBy: conditions.join(" && "),
				tenantId: input.organizationId,
				perPage: input.perPage,
				page: input.page,
			};
		});

		const results = await multiSearchDocuments(entries);

		// Merge results from all collections
		let totalFound = 0;
		const mergedHits: unknown[] = [];
		let maxSearchTimeMs = 0;

		for (const result of results) {
			totalFound += result.found;
			mergedHits.push(...result.hits);
			if (result.searchTimeMs > maxSearchTimeMs) {
				maxSearchTimeMs = result.searchTimeMs;
			}
		}

		// Sort merged hits by text_match score descending (Typesense ranks per-collection)
		mergedHits.sort((a: unknown, b: unknown) => {
			const aScore = ((a as Record<string, unknown>).text_match as number) ?? 0;
			const bScore = ((b as Record<string, unknown>).text_match as number) ?? 0;
			return bScore - aScore;
		});

		// Paginate merged results
		const totalPages = Math.ceil(totalFound / input.perPage);
		const page = Math.min(input.page, totalPages || 1);
		const startIndex = (page - 1) * input.perPage;
		const paginatedHits = mergedHits.slice(startIndex, startIndex + input.perPage);

		// Map Typesense hits to structured output
		const hits = paginatedHits.map((hit: unknown) => {
			const h = hit as Record<string, unknown>;
			const doc = (h.document ?? {}) as Record<string, unknown>;
			const textMatchInfo = h.text_match_info as Record<string, unknown> | undefined;
			const highlights = (h.highlights as Array<Record<string, unknown>>) ?? [];

			return {
				score: (textMatchInfo?.score as number) ?? undefined,
				chunkId: (doc.chunk_id as string) ?? "",
				fileId: (doc.file_id as string) ?? "",
				content: (doc.content as string) ?? "",
				filename: (doc.filename as string) ?? "",
				fileType: (doc.file_type as string) ?? "",
				sourceUrl: (doc.source_url as string | undefined) ?? undefined,
				uploadedAt: (doc.uploaded_at as number) ?? 0,
				highlightSnippet: (highlights[0]?.snippet as string | undefined) ?? undefined,
			};
		});

		return {
			hits,
			found: totalFound,
			page,
			perPage: input.perPage,
			searchTimeMs: maxSearchTimeMs,
		};
	});
