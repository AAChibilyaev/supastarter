import { listPersonalSearchIndexes } from "@repo/database";
import { logger } from "@repo/logs";
import {
	aliasName,
	formatVectorQuery,
	generateEmbedding,
	getTypesenseClient,
	multiSearchDocuments,
} from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

const searchHitSchema = z.object({
	/** Typesense text match score (higher = better match) */
	score: z.number().optional(),
	/** Vector distance (present in hybrid mode) */
	vectorDistance: z.number().optional(),
	/** Hybrid fusion score (present in hybrid mode) */
	hybridScore: z.number().optional(),
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
	/** Whether this result came from hybrid search */
	hybrid: z.boolean().optional(),
});

/** Convert an ISO 8601 date string to a Unix epoch timestamp (seconds). */
function toUnixTimestamp(isoDate: string): number {
	return Math.floor(new Date(isoDate).getTime() / 1000);
}

/**
 * Map a raw Typesense hit to the structured searchHitSchema.
 */
function mapHit(hit: Record<string, unknown>): z.infer<typeof searchHitSchema> {
	const doc = (hit.document ?? {}) as Record<string, unknown>;
	const textMatchInfo = hit.text_match_info as Record<string, unknown> | undefined;
	const highlights = (hit.highlights as Array<Record<string, unknown>>) ?? [];

	return {
		score: (textMatchInfo?.score as number) ?? undefined,
		vectorDistance: (hit.vector_distance as number | undefined) ?? undefined,
		hybridScore: (hit._hybrid_score as number | undefined) ?? undefined,
		chunkId: (doc.chunk_id as string) ?? "",
		fileId: (doc.file_id as string) ?? "",
		content: (doc.content as string) ?? "",
		filename: (doc.filename as string) ?? "",
		fileType: (doc.file_type as string) ?? "",
		sourceUrl: (doc.source_url as string | undefined) ?? undefined,
		uploadedAt: (doc.uploaded_at as number) ?? 0,
		highlightSnippet: (highlights[0]?.snippet as string | undefined) ?? undefined,
		hybrid: hit.vector_query !== undefined || hit._hybrid_score !== undefined,
	};
}

export const crossSearch = protectedProcedure
	.route({
		method: "POST",
		path: "/my-search/search",
		tags: ["My Search"],
		summary: "Search across all personal search indexes",
		description:
			"Performs a federated search across all personal search indexes belonging to the user's organization. Supports pagination, file type filter, date range filter, and hybrid (vector + keyword) search using semantic embeddings.",
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
			/** Enable hybrid search (vector + keyword). Default: true */
			hybrid: z.boolean().optional().default(true),
			/** Alpha fusion parameter for hybrid search (0 = full keyword, 1 = full vector). Default: 0.5 */
			alpha: z.number().min(0).max(1).optional().default(0.5),
		}),
	)
	.output(
		z.object({
			hits: z.array(searchHitSchema),
			found: z.number(),
			page: z.number(),
			perPage: z.number(),
			searchTimeMs: z.number(),
			hybrid: z.boolean(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAccess(input.organizationId, user.id);

		const indexes = await listPersonalSearchIndexes(input.organizationId);

		if (indexes.length === 0) {
			return {
				hits: [],
				found: 0,
				page: 1,
				perPage: input.perPage,
				searchTimeMs: 0,
				hybrid: false,
			};
		}

		// Build date range conditions
		const dateConditions: string[] = [];
		if (input.dateFrom) {
			dateConditions.push(`uploaded_at:>=${toUnixTimestamp(input.dateFrom)}`);
		}
		if (input.dateTo) {
			dateConditions.push(`uploaded_at:<=${toUnixTimestamp(input.dateTo)}`);
		}
		const dateFilterStr = dateConditions.length > 0 ? dateConditions.join(" && ") : undefined;

		const buildFilter = (slug: string): string => {
			const conditions: string[] = [`index_id:=${slug}`];
			if (input.fileTypeFilter) {
				conditions.push(`file_type:=${input.fileTypeFilter}`);
			}
			if (dateFilterStr) {
				conditions.push(dateFilterStr);
			}
			return conditions.join(" && ");
		};

		// Attempt hybrid search if enabled
		let usedHybrid = false;
		if (input.hybrid) {
			try {
				const embedding = await generateEmbedding(input.q);
				const vectorQuery = formatVectorQuery(embedding.vector, "embedding", input.perPage);

				const client = getTypesenseClient();
				const searches = indexes.map((idx) => {
					const chunkAlias = `${aliasName(input.organizationId, idx.slug)}_chunks`;
					return {
						collection: chunkAlias,
						q: input.q,
						query_by: "content",
						filter_by: buildFilter(idx.slug),
						vector_query: vectorQuery,
						per_page: input.perPage,
						page: input.page,
						highlight_fields: "content",
						hybrid_search: true,
						alpha: input.alpha,
					};
				});

				const response = await client.multiSearch.perform({
					searches: searches as never,
				});

				const results =
					(response as unknown as { results: Array<Record<string, unknown>> }).results ??
					[];

				let totalFound = 0;
				const mergedHits: Record<string, unknown>[] = [];
				let maxSearchTimeMs = 0;

				for (const result of results) {
					totalFound += (result.found as number) ?? 0;
					const hits = (result.hits as Array<Record<string, unknown>>) ?? [];
					mergedHits.push(...hits);
					maxSearchTimeMs = Math.max(
						maxSearchTimeMs,
						(result.search_time_ms as number) ?? 0,
					);
				}

				// Sort by hybrid score descending
				mergedHits.sort((a, b) => {
					const aScore =
						(a._hybrid_score as number) ??
						((a.text_match_info as Record<string, unknown> | undefined)
							?.score as number) ??
						0;
					const bScore =
						(b._hybrid_score as number) ??
						((b.text_match_info as Record<string, unknown> | undefined)
							?.score as number) ??
						0;
					return (bScore as number) - (aScore as number);
				});

				// Paginate merged results
				const totalPages = Math.ceil(totalFound / input.perPage);
				const page = Math.min(input.page, totalPages || 1);
				const startIndex = (page - 1) * input.perPage;
				const paginatedHits = mergedHits.slice(startIndex, startIndex + input.perPage);

				usedHybrid = true;

				return {
					hits: paginatedHits.map(mapHit),
					found: totalFound,
					page,
					perPage: input.perPage,
					searchTimeMs: maxSearchTimeMs,
					hybrid: true,
				};
			} catch (error) {
				// Hybrid search failed — fall back to keyword-only
				logger.warn({ error }, "Hybrid search failed, falling back to keyword-only search");
			}
		}

		// Keyword-only fallback (also used when hybrid is disabled or fails)
		const entries = indexes.map((idx) => {
			const chunkAlias = `${aliasName(input.organizationId, idx.slug)}_chunks`;
			return {
				alias: chunkAlias,
				q: input.q,
				queryBy: "content",
				highlightFields: "content",
				filterBy: buildFilter(idx.slug),
				tenantId: input.organizationId,
				perPage: input.perPage,
				page: input.page,
			};
		});

		const results = await multiSearchDocuments(entries);

		// Merge results from all collections
		let totalFound = 0;
		const mergedHits: Record<string, unknown>[] = [];
		let maxSearchTimeMs = 0;

		for (const result of results) {
			totalFound += result.found;
			mergedHits.push(...(result.hits as Record<string, unknown>[]));
			maxSearchTimeMs = Math.max(maxSearchTimeMs, result.searchTimeMs);
		}

		// Sort merged hits by text_match score descending
		mergedHits.sort((a, b) => {
			const aScore =
				((a.text_match_info as Record<string, unknown> | undefined)?.score as number) ?? 0;
			const bScore =
				((b.text_match_info as Record<string, unknown> | undefined)?.score as number) ?? 0;
			return bScore - aScore;
		});

		// Paginate merged results
		const totalPages = Math.ceil(totalFound / input.perPage);
		const page = Math.min(input.page, totalPages || 1);
		const startIndex = (page - 1) * input.perPage;
		const paginatedHits = mergedHits.slice(startIndex, startIndex + input.perPage);

		return {
			hits: paginatedHits.map(mapHit),
			found: totalFound,
			page,
			perPage: input.perPage,
			searchTimeMs: maxSearchTimeMs,
			hybrid: usedHybrid,
		};
	});
