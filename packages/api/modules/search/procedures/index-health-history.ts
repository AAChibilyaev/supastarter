import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

/**
 * Returns anomaly/health event history for an organization.
 * Computed from existing models (SearchIngestBuffer, SearchConnectorSyncJob)
 * rather than a dedicated health events table.
 */
export const indexHealthHistory = protectedProcedure
	.route({
		method: "GET",
		path: "/search/index-health-history",
		tags: ["Search", "Health"],
		summary: "Get index health event history",
		description:
			"Returns recent health-related events: failed ingest batches, connector sync failures, " +
			"reindex completions, and other noteworthy pipeline events.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			limit: z.number().int().min(1).max(100).optional().default(20),
			offset: z.number().int().min(0).optional().default(0),
		}),
	)
	.output(
		z.object({
			events: z.array(
				z.object({
					id: z.string(),
					type: z.enum([
						"ingest_failure",
						"sync_failure",
						"reindex_completed",
						"reindex_failed",
						"buffer_high",
					]),
					indexId: z.string(),
					indexSlug: z.string(),
					message: z.string(),
					severity: z.enum(["info", "warning", "critical"]),
					timestamp: z.string(),
				}),
			),
			total: z.number(),
		}),
	)
	.handler(async ({ input: { organizationId, limit, offset }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		// Fetch indexes for slug resolution
		const indexes = await db.searchIndex.findMany({
			where: { organizationId },
			select: { id: true, slug: true },
		});
		const indexSlugMap = new Map(indexes.map((i) => [i.id, i.slug]));

		// Fetch recent failed ingest items
		const failedIngest = await db.searchIngestBuffer.findMany({
			where: {
				organizationId,
				processedAt: null,
				attempts: { gt: 0 },
			},
			orderBy: { createdAt: "desc" },
			take: limit,
			skip: offset,
		});

		// Fetch failed connector syncs
		const failedSyncs = await db.searchConnectorSyncJob.findMany({
			where: {
				organizationId,
				status: "failed",
			},
			orderBy: { createdAt: "desc" },
			take: limit,
			skip: offset,
		});

		// Combine and sort events
		const events: Array<{
			id: string;
			type:
				| "ingest_failure"
				| "sync_failure"
				| "reindex_completed"
				| "reindex_failed"
				| "buffer_high";
			indexId: string;
			indexSlug: string;
			message: string;
			severity: "info" | "warning" | "critical";
			timestamp: string;
		}> = [];

		for (const item of failedIngest) {
			const slug = indexSlugMap.get(item.indexId) ?? item.indexId;
			const attempts = item.attempts ?? 0;
			events.push({
				id: `ingest-${item.id}`,
				type: "ingest_failure",
				indexId: item.indexId,
				indexSlug: slug,
				message: `Ingest failed after ${attempts} attempt(s)`,
				severity: attempts > 5 ? "critical" : attempts > 2 ? "warning" : "info",
				timestamp: item.createdAt.toISOString(),
			});
		}

		for (const sync of failedSyncs) {
			const slug = indexSlugMap.get(sync.indexId) ?? sync.indexId;
			const errorMsg: string = (sync.lastError as string) ?? "Unknown error";
			events.push({
				id: `sync-${sync.id}`,
				type: "sync_failure",
				indexId: sync.indexId,
				indexSlug: slug,
				message: `Sync failed: ${errorMsg}`,
				severity: "warning",
				timestamp: sync.updatedAt.toISOString(),
			});
		}

		// Sort by timestamp descending
		events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

		// Count total failed items
		const total = await db.searchIngestBuffer.count({
			where: { organizationId, processedAt: null, attempts: { gt: 0 } },
		});

		return {
			events: events.slice(0, limit),
			total,
		};
	});
