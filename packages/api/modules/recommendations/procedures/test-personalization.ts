import { ORPCError } from "@orpc/client";
import {
	buildUserProfile,
	findSimilarUsersByProducts,
	getCollaborativeRecommendations,
	getTrendingFromAnalytics,
} from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const testPersonalization = protectedProcedure
	.route({
		method: "GET",
		path: "/recommendations/test-personalization",
		tags: ["Recommendations"],
		summary: "Test personalization for a specific user",
		description:
			"Returns a comparison view of personalized vs non-personalized recommendations " +
			"for a given user. Shows user profile, personalized results, and baseline trending results.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			anonymousUserId: z.string().min(1, "User ID is required"),
			sessionId: z.string().optional(),
			limit: z.coerce.number().min(1).max(100).default(10),
		}),
	)
	.output(
		z.object({
			profile: z.object({
				clickedProductIds: z.array(z.string()),
				recentQueries: z.array(z.string()),
				categoryAffinities: z.array(z.object({ key: z.string(), weight: z.number() })),
				totalEvents: z.number(),
				lastActive: z.string().nullable(),
				hasProfile: z.boolean(),
			}),
			personalized: z.array(
				z.object({
					productId: z.string(),
					score: z.number(),
					source: z.enum(["collaborative", "trending", "similar_queries"]),
					matchedUsers: z.number().optional(),
					reason: z.string().optional(),
				}),
			),
			baseline: z.array(
				z.object({
					productId: z.string(),
					score: z.number(),
					clickCount: z.number(),
				}),
			),
		}),
	)
	.handler(
		async ({ input: { organizationId, anonymousUserId, sessionId, limit }, context: { user } }) => {
			await requireOrganizationAccess(organizationId, user.id);

			try {
				// Build user profile from analytics
				const profile = await buildUserProfile(organizationId, anonymousUserId, sessionId);
				const hasProfile = profile.totalEvents > 0;

				// Personalized recommendations (collaborative + trending hybrid)
				const personalized: Array<{
					productId: string;
					score: number;
					source: "collaborative" | "trending" | "similar_queries";
					matchedUsers?: number;
					reason?: string;
				}> = [];

				if (hasProfile) {
					// Collaborative filtering
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
							Math.ceil(limit * 0.6),
						);

						for (const rec of collabRecs) {
							personalized.push({
								productId: rec.productId,
								score: rec.score,
								source: "collaborative",
								matchedUsers: rec.matchedUsers,
								reason: `Also clicked by ${rec.matchedUsers} similar user${rec.matchedUsers !== 1 ? "s" : ""}`,
							});
						}
					}

					// Similar queries
					if (profile.recentQueries.length > 0 && personalized.length < limit) {
						for (const query of profile.recentQueries.slice(0, 5)) {
							if (personalized.length >= limit) break;
							personalized.push({
								productId: `query:${query}`,
								score: 0.5,
								source: "similar_queries",
								reason: `Based on recent search: "${query}"`,
							});
						}
					}
				}

				// Trending fallback for personalized
				if (personalized.length < limit) {
					const trendingRecs = await getTrendingFromAnalytics(
						organizationId,
						undefined,
						7,
						limit - personalized.length,
					);

					const existingIds = new Set(personalized.map((r) => r.productId));
					for (const tr of trendingRecs) {
						if (existingIds.has(tr.productId)) continue;
						if (personalized.length >= limit) break;
						personalized.push({
							productId: tr.productId,
							score: Math.min(tr.clickCount / 10, 1.0),
							source: "trending",
							reason: `Trending product (${tr.clickCount} clicks this week)`,
						});
					}
				}

				// Sort personalized by score
				personalized.sort((a, b) => b.score - a.score);

				// Baseline: top trending products (non-personalized)
				const baselineRecs = await getTrendingFromAnalytics(organizationId, undefined, 30, limit);

				const baseline = baselineRecs.map((rec) => ({
					productId: rec.productId,
					score: Math.min(rec.clickCount / 10, 1.0),
					clickCount: rec.clickCount,
				}));

				// Format lastActive
				const lastActiveStr = profile.lastActive ? profile.lastActive.toISOString() : null;

				return {
					profile: {
						clickedProductIds: profile.clickedProductIds,
						recentQueries: profile.recentQueries,
						categoryAffinities: profile.categoryAffinities,
						totalEvents: profile.totalEvents,
						lastActive: lastActiveStr,
						hasProfile,
					},
					personalized: personalized.slice(0, limit),
					baseline: baseline.slice(0, limit),
				};
			} catch (err) {
				logger.error(
					{ err, organizationId, anonymousUserId },
					"Failed to generate test personalization",
				);
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Test personalization engine unavailable",
				});
			}
		},
	);
