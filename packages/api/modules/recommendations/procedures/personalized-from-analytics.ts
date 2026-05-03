import { ORPCError } from "@orpc/client";
import {
	buildUserProfile,
	findSimilarUsersByProducts,
	getCollaborativeRecommendations,
} from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const personalizedFromAnalytics = protectedProcedure
	.route({
		method: "GET",
		path: "/recommendations/personalized-from-analytics",
		tags: ["Recommendations"],
		summary: "Get personalized recommendations from analytics data",
		description:
			"Returns personalized recommendations built from user analytics data " +
			"(SearchUsageEvent clicks, queries, filter preferences). Uses collaborative " +
			"filtering on click patterns. Does NOT require Neo4j — works with Postgres analytics only.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			indexId: z.string().optional(),
			anonymousUserId: z.string().optional(),
			sessionId: z.string().optional(),
			limit: z.coerce.number().min(1).max(100).default(10),
			mode: z.enum(["collaborative", "trending", "hybrid"]).default("hybrid"),
		}),
	)
	.output(
		z.object({
			recommendations: z.array(
				z.object({
					productId: z.string(),
					score: z.number(),
					source: z.enum(["collaborative", "trending", "similar_queries"]),
					matchedUsers: z.number().optional(),
					reason: z.string().optional(),
				}),
			),
			profile: z.object({
				clickedProductIds: z.array(z.string()),
				recentQueries: z.array(z.string()),
				totalEvents: z.number(),
				hasProfile: z.boolean(),
			}),
		}),
	)
	.handler(
		async ({
			input: { organizationId, indexId, anonymousUserId, sessionId, limit, mode },
			context: { user },
		}) => {
			await requireOrganizationAccess(organizationId, user.id);

			try {
				// Build user profile from analytics
				const profile = await buildUserProfile(organizationId, anonymousUserId, sessionId);
				const hasProfile = profile.totalEvents > 0;

				const recommendations: Array<{
					productId: string;
					score: number;
					source: "collaborative" | "trending" | "similar_queries";
					matchedUsers?: number;
					reason?: string;
				}> = [];

				if (hasProfile && (mode === "collaborative" || mode === "hybrid")) {
					// Collaborative filtering: find similar users by shared clicks
					const similarUsers = await findSimilarUsersByProducts(
						organizationId,
						profile.clickedProductIds,
						10,
					);

					if (similarUsers.length > 0) {
						const similarIds = similarUsers.map((u) => u.anonymousUserId);
						const collabRecs = await getCollaborativeRecommendations(
							organizationId,
							profile.clickedProductIds,
							similarIds,
							mode === "hybrid" ? Math.ceil(limit * 0.6) : limit,
						);

						for (const rec of collabRecs) {
							recommendations.push({
								productId: rec.productId,
								score: rec.score,
								source: "collaborative",
								matchedUsers: rec.matchedUsers,
								reason: `Also clicked by ${rec.matchedUsers} similar user${rec.matchedUsers !== 1 ? "s" : ""}`,
							});
						}
					}

					// Similar queries: find trending products for the user's searches
					if (profile.recentQueries.length > 0 && recommendations.length < limit) {
						const recentQueries = profile.recentQueries.slice(0, 5);
						for (const query of recentQueries) {
							if (recommendations.length >= limit) break;
							recommendations.push({
								productId: `query:${query}`,
								score: 0.5,
								source: "similar_queries",
								reason: `Based on recent search: "${query}"`,
							});
						}
					}
				}

				if (mode === "trending" || mode === "hybrid") {
					// Fallback: trending products from analytics
					if (recommendations.length < limit) {
						const { getTrendingFromAnalytics } = await import("@repo/database");
						const trendingRecs = await getTrendingFromAnalytics(
							organizationId,
							indexId,
							7,
							limit - recommendations.length,
						);

						// Deduplicate against collaborative results
						const existingIds = new Set(recommendations.map((r) => r.productId));
						for (const tr of trendingRecs) {
							if (existingIds.has(tr.productId)) continue;
							if (recommendations.length >= limit) break;
							recommendations.push({
								productId: tr.productId,
								score: Math.min(tr.clickCount / 10, 1.0),
								source: "trending",
								reason: `Trending product (${tr.clickCount} clicks this week)`,
							});
						}
					}
				}

				// Sort by score descending
				recommendations.sort((a, b) => b.score - a.score);
				const finalRecs = recommendations.slice(0, limit);

				return {
					recommendations: finalRecs,
					profile: {
						clickedProductIds: profile.clickedProductIds,
						recentQueries: profile.recentQueries,
						totalEvents: profile.totalEvents,
						hasProfile,
					},
				};
			} catch (err) {
				logger.error(
					{ err, organizationId, anonymousUserId },
					"Failed to generate analytics-based personalization",
				);
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Personalization engine unavailable",
				});
			}
		},
	);
