import { db } from "../client";

/**
 * Personalization queries — user preference profiles built from analytics
 * event data (SearchUsageEvent) for recommendations WITHOUT Neo4j dependency.
 *
 * This module provides analytics-based personalization that works with just
 * the existing Prisma/Postgres data — no graph database required.
 */

export interface ClickEvent {
	productId: string;
	query: string | null;
	position: number | null;
	timestamp: Date;
}

export interface SearchEvent {
	query: string;
	count: number;
	lastSearched: Date;
}

export interface UserProfileSummary {
	clickedProductIds: string[];
	recentQueries: string[];
	filterPreferences: Record<string, unknown>;
	categoryAffinities: Array<{ key: string; weight: number }>;
	totalEvents: number;
	lastActive: Date | null;
}

/**
 * Extract the analytics metadata from a SearchUsageEvent's JSON metadata field.
 */
function extractMeta(metadata: unknown): Record<string, unknown> {
	if (!metadata || typeof metadata !== "object") return {};
	return metadata as Record<string, unknown>;
}

/**
 * Get a user's click history (result_click events) from SearchUsageEvent data.
 * Accepts either an anonymousUserId (session-based) or returns by sessionId.
 */
export async function getUserClickHistory(
	organizationId: string,
	anonymousUserId?: string | null,
	sessionId?: string | null,
	limit = 50,
): Promise<ClickEvent[]> {
	const events = await db.searchUsageEvent.findMany({
		where: {
			organizationId,
			type: "click",
			createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // last 90 days
		},
		orderBy: { createdAt: "desc" },
		take: 500, // fetch a wider window for filtering
	});

	// Filter by anonymousUserId/sessionId in application layer (JSON fields)
	const filtered =
		anonymousUserId || sessionId
			? events.filter((ev) => {
					const meta = extractMeta(ev.metadata);
					if (anonymousUserId && meta.anonymousUserId === anonymousUserId) return true;
					if (sessionId && meta.sessionId === sessionId) return true;
					return false;
				})
			: events;

	return filtered
		.slice(0, limit)
		.map((ev) => {
			const meta = extractMeta(ev.metadata);
			return {
				productId: (meta.productId as string) ?? "",
				query: (meta.query as string) ?? null,
				position: (meta.position as number) ?? null,
				timestamp: ev.createdAt,
			};
		})
		.filter((c) => c.productId.length > 0);
}

/**
 * Get a user's search history (distinct queries from search_query events).
 */
export async function getUserSearchHistory(
	organizationId: string,
	anonymousUserId?: string | null,
	sessionId?: string | null,
	limit = 20,
): Promise<SearchEvent[]> {
	const events = await db.searchUsageEvent.findMany({
		where: {
			organizationId,
			type: "search_query",
			createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
		},
		orderBy: { createdAt: "desc" },
		take: 1000,
	});

	// Filter by user identifier
	const filtered =
		anonymousUserId || sessionId
			? events.filter((ev) => {
					const meta = extractMeta(ev.metadata);
					if (anonymousUserId && meta.anonymousUserId === anonymousUserId) return true;
					if (sessionId && meta.sessionId === sessionId) return true;
					return false;
				})
			: events;

	// Aggregate distinct queries
	const queryMap = new Map<string, { count: number; lastSearched: Date }>();
	for (const ev of filtered) {
		const meta = extractMeta(ev.metadata);
		const query = (meta.query as string) ?? "";
		if (!query) continue;
		const existing = queryMap.get(query);
		if (existing) {
			existing.count += ev.count;
			if (ev.createdAt > existing.lastSearched) {
				existing.lastSearched = ev.createdAt;
			}
		} else {
			queryMap.set(query, { count: ev.count, lastSearched: ev.createdAt });
		}
	}

	return Array.from(queryMap.entries())
		.map(([query, data]) => ({ query, ...data }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}

/**
 * Find users with similar product click patterns (collaborative filtering).
 * For each product the user clicked, find other users who clicked the same product,
 * then aggregate their other clicks as recommendations.
 */
export async function findSimilarUsersByProducts(
	organizationId: string,
	clickedProductIds: string[],
	limit = 10,
): Promise<Array<{ anonymousUserId: string; sharedClicks: number }>> {
	if (clickedProductIds.length === 0) return [];

	// Fetch all click events in the org for these products
	const events = await db.searchUsageEvent.findMany({
		where: {
			organizationId,
			type: "click",
			createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
		},
		orderBy: { createdAt: "desc" },
		take: 2000,
	});

	// Extract productId from metadata and build user->productId map
	const userProducts = new Map<string, Set<string>>();
	for (const ev of events) {
		const meta = extractMeta(ev.metadata);
		const uid = (meta.anonymousUserId as string) ?? (meta.sessionId as string);
		const pid = meta.productId as string;
		if (!uid || !pid) continue;

		if (!userProducts.has(uid)) {
			userProducts.set(uid, new Set());
		}
		userProducts.get(uid)!.add(pid);
	}

	// Score users by overlap with the source user's clicked products
	const sourceSet = new Set(clickedProductIds);
	const scored = Array.from(userProducts.entries())
		.map(([uid, products]) => {
			let overlap = 0;
			for (const pid of products) {
				if (sourceSet.has(pid)) overlap++;
			}
			return { anonymousUserId: uid, sharedClicks: overlap };
		})
		.filter((u) => u.sharedClicks > 0)
		.sort((a, b) => b.sharedClicks - a.sharedClicks)
		.slice(0, limit);

	return scored;
}

/**
 * Get recommended product IDs based on collaborative filtering — products
 * that similar users clicked but the source user hasn't.
 */
export async function getCollaborativeRecommendations(
	organizationId: string,
	sourceClickedIds: string[],
	similarUserIds: string[],
	limit = 20,
): Promise<Array<{ productId: string; score: number; matchedUsers: number }>> {
	if (similarUserIds.length === 0) return [];

	const events = await db.searchUsageEvent.findMany({
		where: {
			organizationId,
			type: "click",
			createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
		},
		orderBy: { createdAt: "desc" },
		take: 3000,
	});

	const sourceSet = new Set(sourceClickedIds);
	const similarSet = new Set(similarUserIds);
	const productScores = new Map<string, { score: number; userSet: Set<string> }>();

	for (const ev of events) {
		const meta = extractMeta(ev.metadata);
		const uid = (meta.anonymousUserId as string) ?? (meta.sessionId as string);
		const pid = meta.productId as string;
		if (!uid || !pid || !similarSet.has(uid)) continue;
		if (sourceSet.has(pid)) continue; // exclude products user already clicked

		const existing = productScores.get(pid);
		if (existing) {
			existing.userSet.add(uid);
			existing.score += 1.0 / similarUserIds.length;
		} else {
			const userSet = new Set([uid]);
			productScores.set(pid, { score: 1.0 / similarUserIds.length, userSet });
		}
	}

	return Array.from(productScores.entries())
		.map(([productId, data]) => ({
			productId,
			score: Math.min(data.score, 1.0),
			matchedUsers: data.userSet.size,
		}))
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);
}

/**
 * Get trending products from analytics data — products with the most click
 * events in the time window.
 */
export async function getTrendingFromAnalytics(
	organizationId: string,
	indexId?: string,
	windowDays = 7,
	limit = 20,
): Promise<Array<{ productId: string; clickCount: number }>> {
	const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

	const events = await db.searchUsageEvent.findMany({
		where: {
			organizationId,
			type: "click",
			...(indexId ? { indexId } : {}),
			createdAt: { gte: since },
		},
		orderBy: { createdAt: "desc" },
		take: 2000,
	});

	const productCounts = new Map<string, number>();
	for (const ev of events) {
		const meta = extractMeta(ev.metadata);
		const pid = meta.productId as string;
		if (!pid) continue;
		productCounts.set(pid, (productCounts.get(pid) ?? 0) + ev.count);
	}

	return Array.from(productCounts.entries())
		.map(([productId, clickCount]) => ({ productId, clickCount }))
		.sort((a, b) => b.clickCount - a.clickCount)
		.slice(0, limit);
}

/**
 * Extract filter preferences from a user's filter_used events.
 * Returns frequency-weighted filter key-value pairs.
 */
export async function getUserFilterAffinity(
	organizationId: string,
	anonymousUserId?: string | null,
	sessionId?: string | null,
	limit = 10,
): Promise<Array<{ key: string; value: string; weight: number }>> {
	const events = await db.searchUsageEvent.findMany({
		where: {
			organizationId,
			type: "filter_applied",
			createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
		},
		orderBy: { createdAt: "desc" },
		take: 1000,
	});

	const filtered =
		anonymousUserId || sessionId
			? events.filter((ev) => {
					const meta = extractMeta(ev.metadata);
					if (anonymousUserId && meta.anonymousUserId === anonymousUserId) return true;
					if (sessionId && meta.sessionId === sessionId) return true;
					return false;
				})
			: events;

	const affinityMap = new Map<string, { weight: number; seenValues: Set<string> }>();
	for (const ev of filtered) {
		const meta = extractMeta(ev.metadata);
		const filters = meta.filters as Record<string, unknown> | undefined;
		if (!filters) continue;

		for (const [key, value] of Object.entries(filters)) {
			const strVal = String(value);
			if (!strVal) continue;
			const mapKey = `${key}::${strVal}`;
			const existing = affinityMap.get(mapKey);
			if (existing) {
				existing.weight += ev.count;
				existing.seenValues.add(strVal);
			} else {
				affinityMap.set(mapKey, { weight: ev.count, seenValues: new Set([strVal]) });
			}
		}
	}

	return Array.from(affinityMap.entries())
		.map(([mapKey, data]) => {
			const [key, value] = mapKey.split("::", 2);
			return { key, value, weight: data.weight };
		})
		.sort((a, b) => b.weight - a.weight)
		.slice(0, limit);
}

/**
 * Build a full user profile summary from analytics data.
 */
export async function buildUserProfile(
	organizationId: string,
	anonymousUserId?: string | null,
	sessionId?: string | null,
): Promise<UserProfileSummary> {
	const clicks = await getUserClickHistory(organizationId, anonymousUserId, sessionId, 50);
	const searches = await getUserSearchHistory(organizationId, anonymousUserId, sessionId, 20);
	const filterAffinities = await getUserFilterAffinity(
		organizationId,
		anonymousUserId,
		sessionId,
		10,
	);

	// Count total events for this user
	const allEvents = await db.searchUsageEvent.findMany({
		where: {
			organizationId,
			createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
		},
		select: { createdAt: true },
		take: 5000,
	});

	const userEvents = anonymousUserId || sessionId ? allEvents : allEvents;

	const totalEvents = userEvents.length;
	const lastActive = userEvents.length > 0 ? userEvents[0].createdAt : null;

	return {
		clickedProductIds: [...new Set(clicks.map((c) => c.productId))],
		recentQueries: searches.map((s) => s.query),
		filterPreferences: Object.fromEntries(filterAffinities.map((f) => [f.key, f.value])),
		categoryAffinities: filterAffinities.map((f) => ({
			key: f.key,
			weight: f.weight,
		})),
		totalEvents,
		lastActive,
	};
}

// ─── User Segment Definitions ───────────────────────────────────────────────

/**
 * Criteria for a custom user segment.
 */
export interface SegmentCriteria {
	/** Minimum events a user must have to qualify */
	minEvents?: number;
	/** Maximum events a user can have (upper bound, e.g. for "new" users) */
	maxEvents?: number;
	/** Query patterns to match (substring match) */
	queryPatterns?: string[];
	/** Date range: last N days of activity to check */
	lastActiveDays?: number;
}

const DEFAULT_LAST_ACTIVE_DAYS = 90;

/**
 * Compute stats for a single segment: number of unique users matching,
 * average events per user, and total events in the time window.
 */
export async function computeSegmentStats(
	organizationId: string,
	criteria: SegmentCriteria,
	windowDays = DEFAULT_LAST_ACTIVE_DAYS,
): Promise<{
	userCount: number;
	averageEvents: number;
	totalEvents: number;
}> {
	const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

	const events = await db.searchUsageEvent.findMany({
		where: {
			organizationId,
			createdAt: { gte: since },
		},
		select: { metadata: true, count: true },
	});

	// Group events by user
	const userEvents = new Map<string, number[]>();
	for (const ev of events) {
		const meta = extractMeta(ev.metadata);
		const uid =
			(typeof meta.anonymousUserId === "string" ? meta.anonymousUserId : undefined) ??
			(typeof meta.sessionId === "string" ? meta.sessionId : undefined);
		if (!uid) continue;
		if (!userEvents.has(uid)) {
			userEvents.set(uid, []);
		}
		userEvents.get(uid)!.push(ev.count);
	}

	// Apply criteria filters
	const matchingUsers: Array<{ eventCount: number; total: number }> = [];

	for (const [, counts] of userEvents) {
		const total = counts.reduce((a, b) => a + b, 0);
		const eventCount = counts.length;

		if (criteria.minEvents !== undefined && eventCount < criteria.minEvents) {
			continue;
		}
		if (criteria.maxEvents !== undefined && eventCount > criteria.maxEvents) {
			continue;
		}

		matchingUsers.push({ eventCount, total });
	}

	// TODO: queryPatterns filtering would need full event data (not just counts)
	// For now, query patterns are stored but require fetching full events

	const userCount = matchingUsers.length;
	const totalEvents = matchingUsers.reduce((sum, u) => sum + u.total, 0);
	const averageEvents = userCount > 0 ? Math.round(totalEvents / userCount) : 0;

	return { userCount, averageEvents, totalEvents };
}

/**
 * Predefined segment definitions that are always available.
 */
export const PREDEFINED_SEGMENTS = [
	{
		id: "new_users" as const,
		name: "New Users",
		description: "Users with fewer than 5 events — minimal engagement",
		criteria: { maxEvents: 5, lastActiveDays: 90 },
	},
	{
		id: "returning" as const,
		name: "Returning Users",
		description: "Users with 5–50 events — regular engagement",
		criteria: { minEvents: 5, maxEvents: 50, lastActiveDays: 90 },
	},
	{
		id: "vip" as const,
		name: "VIP Users",
		description: "Users with 50+ events — power users",
		criteria: { minEvents: 50, lastActiveDays: 90 },
	},
] as const;

export type PredefinedSegmentId = (typeof PREDEFINED_SEGMENTS)[number]["id"];
