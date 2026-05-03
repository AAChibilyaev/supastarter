import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

/**
 * Returns computed health status for all indexes in an organization.
 * Health is derived from ingest buffer state, connector sync jobs,
 * and index metadata — no separate Prisma model needed.
 */
export const indexHealth = protectedProcedure
	.route({
		method: "GET",
		path: "/search/index-health",
		tags: ["Search", "Health"],
		summary: "Get index health overview",
		description:
			"Returns health status for all indexes in an organization. " +
			"Health is computed from ingest pipeline depth, retry counts, connector sync failures, and reindex activity.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			indexes: z.array(
				z.object({
					id: z.string(),
					slug: z.string(),
					displayName: z.string(),
					status: z.enum(["healthy", "warning", "critical"]),
					ingestBufferDepth: z.number(),
					failedIngestItems: z.number(),
					activeReindex: z.boolean(),
					lastActivityAt: z.string().nullable(),
					connectorStatus: z.string().nullable(),
				}),
			),
			summary: z.object({
				healthy: z.number(),
				warning: z.number(),
				critical: z.number(),
				totalIndexes: z.number(),
			}),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const [indexes, bufferCounts, failedCounts, activeJobs, connectors] = await Promise.all([
			db.searchIndex.findMany({
				where: { organizationId },
				orderBy: { createdAt: "desc" },
			}),
			// Per-index pending ingest count
			db.searchIngestBuffer.groupBy({
				by: ["indexId"],
				where: { organizationId, processedAt: null, nextRetryAt: null },
				_count: { id: true },
			}),
			// Per-index failed ingest count
			db.searchIngestBuffer.groupBy({
				by: ["indexId"],
				where: { organizationId, processedAt: null, attempts: { gt: 0 } },
				_count: { id: true },
			}),
			// Active reindex jobs
			db.searchConnectorSyncJob.findMany({
				where: {
					organizationId,
					type: "reindex",
					status: { in: ["pending", "running"] },
				},
				select: { indexId: true },
			}),
			// Latest connector sync status per index
			db.searchConnectorSyncJob.groupBy({
				by: ["indexId"],
				_max: { updatedAt: true },
				where: { organizationId, type: "full" },
			}),
		]);

		const bufferMap = new Map(bufferCounts.map((b) => [b.indexId, b._count.id]));
		const failedMap = new Map(failedCounts.map((f) => [f.indexId, f._count.id]));
		const activeReindexSet = new Set(activeJobs.map((j) => j.indexId));
		const connectorMap = new Map(connectors.map((c) => [c.indexId, c._max.updatedAt]));

		const indexHealthResults = indexes.map((idx) => {
			const bufferDepth = bufferMap.get(idx.id) ?? 0;
			const failedCount = failedMap.get(idx.id) ?? 0;
			const isReindexing = activeReindexSet.has(idx.id);
			const lastConnectorSync = connectorMap.get(idx.id)?.toISOString() ?? null;

			// Determine status
			let status: "healthy" | "warning" | "critical";
			if (failedCount > 100) {
				status = "critical";
			} else if (bufferDepth > 10000 || failedCount > 10 || isReindexing) {
				status = "warning";
			} else {
				status = "healthy";
			}

			return {
				id: idx.id,
				slug: idx.slug,
				displayName: idx.displayName,
				status,
				ingestBufferDepth: bufferDepth,
				failedIngestItems: failedCount,
				activeReindex: isReindexing,
				lastActivityAt: idx.updatedAt?.toISOString() ?? null,
				connectorStatus: lastConnectorSync,
			};
		});

		const healthy = indexHealthResults.filter((r) => r.status === "healthy").length;
		const warning = indexHealthResults.filter((r) => r.status === "warning").length;
		const critical = indexHealthResults.filter((r) => r.status === "critical").length;

		return {
			indexes: indexHealthResults,
			summary: {
				healthy,
				warning,
				critical,
				totalIndexes: indexes.length,
			},
		};
	});
