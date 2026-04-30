import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

interface ActivityItem {
	id: string;
	kind: "index_created" | "api_key_created" | "usage_event" | "sync_job";
	label: string;
	description: string;
	indexSlug: string | null;
	createdAt: string;
}

export const recentActivity = protectedProcedure
	.route({
		method: "GET",
		path: "/search/recent-activity",
		tags: ["Search"],
		summary: "Recent organization activity feed",
		description:
			"Returns a unified activity feed from SearchIndex, SearchApiKey, SearchUsageEvent, and SearchConnectorSyncJob, sorted by timestamp.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			limit: z.number().int().min(1).max(100).optional().default(20),
		}),
	)
	.handler(async ({ input: { organizationId, limit }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const activities: ActivityItem[] = [];

		// Index created events
		const indexes = await db.searchIndex.findMany({
			where: { organizationId },
			select: { id: true, slug: true, displayName: true, createdAt: true },
			orderBy: { createdAt: "desc" },
			take: limit,
		});
		for (const idx of indexes) {
			activities.push({
				id: `index-${idx.id}`,
				kind: "index_created",
				label: "Index created",
				description: `Index "${idx.displayName}" was created`,
				indexSlug: idx.slug,
				createdAt: idx.createdAt.toISOString(),
			});
		}

		// API key created events
		const apiKeys = await db.searchApiKey.findMany({
			where: { organizationId },
			select: {
				id: true,
				name: true,
				scopes: true,
				createdAt: true,
				index: { select: { slug: true } },
			},
			orderBy: { createdAt: "desc" },
			take: limit,
		});
		for (const key of apiKeys) {
			activities.push({
				id: `apikey-${key.id}`,
				kind: "api_key_created",
				label: "API key created",
				description: `API key "${key.name}" created with scopes: ${key.scopes.join(", ")}`,
				indexSlug: key.index.slug,
				createdAt: key.createdAt.toISOString(),
			});
		}

		// Usage events
		const usageEvents = await db.searchUsageEvent.findMany({
			where: { organizationId },
			select: {
				id: true,
				type: true,
				count: true,
				createdAt: true,
				index: { select: { slug: true } },
			},
			orderBy: { createdAt: "desc" },
			take: limit,
		});
		for (const event of usageEvents) {
			activities.push({
				id: `usage-${event.id}`,
				kind: "usage_event",
				label: `Usage: ${event.type}`,
				description: `${event.count} ${event.type} event(s) recorded`,
				indexSlug: event.index.slug,
				createdAt: event.createdAt.toISOString(),
			});
		}

		// Sync jobs
		const syncJobs = await db.searchConnectorSyncJob.findMany({
			where: { organizationId },
			select: {
				id: true,
				type: true,
				status: true,
				itemsCount: true,
				startedAt: true,
				index: { select: { slug: true } },
			},
			orderBy: { startedAt: "desc" },
			take: limit,
		});
		for (const job of syncJobs) {
			activities.push({
				id: `sync-${job.id}`,
				kind: "sync_job",
				label: `Sync job: ${job.type}`,
				description: `${job.type} sync ${job.status} — ${job.itemsCount} items`,
				indexSlug: job.index.slug,
				createdAt: job.startedAt.toISOString(),
			});
		}

		// Sort all activities by timestamp descending, take requested limit
		const sorted = activities
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
			.slice(0, limit);

		return { activities: sorted };
	});
