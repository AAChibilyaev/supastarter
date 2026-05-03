import { ORPCError } from "@orpc/client";
import { getPersonalSearchIndexById } from "@repo/database";
import { aliasName, searchDocuments } from "@repo/search";
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

export const searchIndex = protectedProcedure
	.route({
		method: "POST",
		path: "/my-search/indexes/{id}/search",
		tags: ["My Search"],
		summary: "Search within a personal search index",
		description:
			"Searches across all document chunks indexed in a personal search index. Supports pagination, file type filter, and date range filter.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.string(),
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

		const index = await getPersonalSearchIndexById(input.organizationId, input.id);
		if (!index) {
			throw new ORPCError("NOT_FOUND", {
				message: "Search index not found",
			});
		}

		const chunkAlias = `${aliasName(input.organizationId, index.slug)}_chunks`;

		// Build filter conditions
		const conditions: string[] = [`index_id:=${index.slug}`];

		if (input.fileTypeFilter) {
			conditions.push(`file_type:=${input.fileTypeFilter}`);
		}

		if (input.dateFrom) {
			const ts = toUnixTimestamp(input.dateFrom);
			conditions.push(`uploaded_at:>=${ts}`);
		}

		if (input.dateTo) {
			const ts = toUnixTimestamp(input.dateTo);
			conditions.push(`uploaded_at:<=${ts}`);
		}

		const combinedFilter = conditions.join(" && ");

		const results = await searchDocuments({
			alias: chunkAlias,
			tenantId: input.organizationId,
			q: input.q,
			queryBy: "content",
			highlightFields: "content",
			filterBy: combinedFilter,
			perPage: input.perPage,
			page: input.page,
		});

		// Map Typesense hits to structured output
		const hits = results.hits.map((hit: unknown) => {
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
			found: results.found,
			page: results.page,
			perPage: results.perPage,
			searchTimeMs: results.searchTimeMs,
		};
	});
