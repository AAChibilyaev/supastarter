import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

export const importJobs = protectedProcedure
	.route({
		method: "GET",
		path: "/search/import-jobs",
		tags: ["Search"],
		summary: "Get import jobs dashboard data",
		description:
			"Returns recent ingest activity aggregated from SearchIngestBuffer, grouped by index+action and derived status.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			indexSlug: z.string().optional(),
		}),
	)
	.handler(async ({ input: { organizationId, indexSlug }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		// Look back 7 days for recent import activity
		const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		const rows = await db.searchIngestBuffer.findMany({
			where: {
				organizationId,
				...(indexSlug
					? {
							index: { slug: indexSlug },
						}
					: {}),
				createdAt: { gte: since },
			},
			include: {
				index: { select: { slug: true } },
			},
			orderBy: { createdAt: "desc" },
		});

		// Derive status for each row
		const withStatus = rows.map((row) => {
			let status: "pending" | "processing" | "completed" | "failed";
			if (row.processedAt) {
				status = "completed";
			} else if (row.lastError) {
				status = "failed";
			} else if (row.attempts > 0) {
				status = "processing";
			} else {
				status = "pending";
			}
			return { ...row, status };
		});

		// Group by index slug + action + derived status to form "import job" entries
		const groups = new Map<
			string,
			{
				id: string;
				type: string;
				status: string;
				totalItems: number;
				processedItems: number;
				errorMessage: string | null;
				startedAt: string;
				finishedAt: string | null;
			}
		>();

		for (const item of withStatus) {
			const key = `${item.index.slug}::${item.action}::${item.status}`;
			const existing = groups.get(key);
			if (existing) {
				existing.totalItems++;
				if (item.processedAt) existing.processedItems++;
				if (item.lastError && !existing.errorMessage) {
					existing.errorMessage = item.lastError.slice(0, 500);
				}
				if (item.createdAt.toISOString() < existing.startedAt) {
					existing.startedAt = item.createdAt.toISOString();
				}
				if (
					item.processedAt &&
					(!existing.finishedAt || item.processedAt.toISOString() > existing.finishedAt)
				) {
					existing.finishedAt = item.processedAt.toISOString();
				}
			} else {
				groups.set(key, {
					id: key,
					type: item.action,
					status: item.status,
					totalItems: 1,
					processedItems: item.processedAt ? 1 : 0,
					errorMessage: item.lastError?.slice(0, 500) ?? null,
					startedAt: item.createdAt.toISOString(),
					finishedAt: item.processedAt?.toISOString() ?? null,
				});
			}
		}

		// Also collect summary counts
		const pendingCount = withStatus.filter((r) => r.status === "pending").length;
		const processingCount = withStatus.filter((r) => r.status === "processing").length;
		const completedCount = withStatus.filter((r) => r.status === "completed").length;
		const failedCount = withStatus.filter((r) => r.status === "failed").length;

		const jobs = Array.from(groups.values()).sort(
			(a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
		);

		return {
			jobs,
			summary: {
				pending: pendingCount,
				processing: processingCount,
				completed: completedCount,
				failed: failedCount,
				total: rows.length,
			},
		};
	});
