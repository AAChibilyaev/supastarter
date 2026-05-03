import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";
import { readPersonalizationConfig } from "./personalization-config";

export const personalizationOverview = protectedProcedure
	.route({
		method: "GET",
		path: "/recommendations/personalization-overview",
		tags: ["Recommendations"],
		summary: "Get personalization overview metrics",
		description:
			"Returns overview metrics for personalization: traffic percentage, CTR lift, " +
			"total personalized impressions, and total search/click activity.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			window: z.coerce.number().min(1).max(90).default(7),
		}),
	)
	.output(
		z.object({
			totalSearches: z.number(),
			totalClicks: z.number(),
			uniqueUsers: z.number(),
			ctr: z.number(),
			personalizationEnabled: z.boolean(),
		}),
	)
	.handler(async ({ input: { organizationId, window }, context: { user } }) => {
		await requireOrganizationAccess(organizationId, user.id);

		try {
			const since = new Date(Date.now() - window * 24 * 60 * 60 * 1000);

			// Fetch all events in the time window
			const events = await db.searchUsageEvent.findMany({
				where: {
					organizationId,
					createdAt: { gte: since },
				},
				select: {
					type: true,
					metadata: true,
					count: true,
				},
			});

			// Aggregate metrics
			let totalSearches = 0;
			let totalClicks = 0;
			const uniqueUsersSet = new Set<string>();

			for (const ev of events) {
				if (ev.type === "search_query") {
					totalSearches += ev.count;
				} else if (ev.type === "click") {
					totalClicks += ev.count;
				}

				// Extract user identifier from metadata for unique count
				if (ev.metadata) {
					const meta = ev.metadata as Record<string, unknown>;
					const uid =
						(typeof meta.anonymousUserId === "string" ? meta.anonymousUserId : undefined) ??
						(typeof meta.sessionId === "string" ? meta.sessionId : undefined);
					if (uid) uniqueUsersSet.add(uid);
				}
			}

			const ctr = totalSearches > 0 ? Math.round((totalClicks / totalSearches) * 1000) / 10 : 0;

			// Read personalization config to determine if enabled
			const org = await db.organization.findUniqueOrThrow({
				where: { id: organizationId },
				select: { metadata: true },
			});
			const config = readPersonalizationConfig(org.metadata);
			const hasEvents = totalSearches > 0 || totalClicks > 0;

			return {
				totalSearches,
				totalClicks,
				uniqueUsers: uniqueUsersSet.size,
				ctr,
				personalizationEnabled: hasEvents && config.minEventsPerUser <= 50,
			};
		} catch (err) {
			logger.error({ err, organizationId, window }, "Failed to fetch personalization overview");
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Personalization overview unavailable",
			});
		}
	});
