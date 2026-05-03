import { randomBytes } from "crypto";

import type { z } from "zod";

import { db } from "../client";
import type { UserSchema } from "../zod";

export async function getUsers({
	limit,
	offset,
	query,
}: {
	limit: number;
	offset: number;
	query?: string;
}) {
	return await db.user.findMany({
		where: query
			? {
					OR: [
						{
							name: {
								contains: query,
								mode: "insensitive",
							},
						},
						{
							email: {
								contains: query,
								mode: "insensitive",
							},
						},
					],
				}
			: undefined,
		take: limit,
		skip: offset,
	});
}

export async function countAllUsers({ query }: { query?: string }) {
	return await db.user.count({
		where: query
			? {
					OR: [
						{
							name: {
								contains: query,
								mode: "insensitive",
							},
						},
						{
							email: {
								contains: query,
								mode: "insensitive",
							},
						},
					],
				}
			: undefined,
	});
}

export async function getUserById(id: string) {
	return await db.user.findUnique({
		where: {
			id,
		},
	});
}

export async function getUserByEmail(email: string) {
	return await db.user.findUnique({
		where: {
			email,
		},
	});
}

export async function createUser({
	email,
	name,
	role,
	emailVerified,
	onboardingComplete,
}: {
	email: string;
	name: string;
	role: "admin" | "user";
	emailVerified: boolean;
	onboardingComplete: boolean;
}) {
	return await db.user.create({
		data: {
			email,
			name,
			role,
			emailVerified,
			onboardingComplete,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	});
}

export async function getAccountById(id: string) {
	return await db.account.findUnique({
		where: {
			id,
		},
	});
}

export async function createUserAccount({
	userId,
	providerId,
	accountId,
	hashedPassword,
}: {
	userId: string;
	providerId: string;
	accountId: string;
	hashedPassword?: string;
}) {
	return await db.account.create({
		data: {
			userId,
			accountId,
			providerId,
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	});
}

export async function updateUser(user: Partial<z.infer<typeof UserSchema>> & { id: string }) {
	return await db.user.update({
		where: {
			id: user.id,
		},
		data: user,
	});
}

/**
 * GDPR Article 20 — Data Portability Export
 * Fetches all user data from existing models for JSON export.
 * Includes: profile, memberships, organizations, API keys, purchases, usage events.
 */
export async function exportUserData(userId: string) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			name: true,
			image: true,
			role: true,
			emailVerified: true,
			locale: true,
			onboardingComplete: true,
			createdAt: true,
			updatedAt: true,
		},
	});
	if (!user) return null;

	const memberships = await db.member.findMany({
		where: { userId },
		select: {
			id: true,
			role: true,
			createdAt: true,
			organization: {
				select: {
					id: true,
					name: true,
					slug: true,
					createdAt: true,
				},
			},
		},
	});

	const organizationIds = memberships.map((m) => m.organization.id);

	const apiKeys = await db.searchApiKey.findMany({
		where: { organizationId: { in: organizationIds } },
		select: {
			id: true,
			prefix: true,
			scopes: true,
			indexSlug: true,
			expiresAt: true,
			createdAt: true,
		},
	});

	const purchases = await db.purchase.findMany({
		where: { userId },
		select: {
			id: true,
			type: true,
			status: true,
			planId: true,
			priceId: true,
			createdAt: true,
		},
		orderBy: { createdAt: "desc" },
		take: 100,
	});

	const usageEvents = await db.searchUsageEvent.findMany({
		where: { organizationId: { in: organizationIds } },
		select: {
			id: true,
			type: true,
			count: true,
			createdAt: true,
		},
		orderBy: { createdAt: "desc" },
		take: 500,
	});

	return {
		exportedAt: new Date().toISOString(),
		user,
		memberships: memberships.map((m) => ({
			organizationId: m.organization.id,
			organizationName: m.organization.name,
			organizationSlug: m.organization.slug,
			role: m.role,
			joinedAt: m.createdAt,
		})),
		apiKeys: apiKeys.map((k) => ({
			prefix: k.prefix,
			scopes: k.scopes,
			indexSlug: k.indexSlug,
			expiresAt: k.expiresAt,
			createdAt: k.createdAt,
		})),
		purchases: purchases.map((p) => ({
			type: p.type,
			status: p.status,
			planId: p.planId,
			date: p.createdAt,
		})),
		usageSummary: {
			totalEvents: usageEvents.length,
			eventsByType: usageEvents.reduce<Record<string, number>>((acc, e) => {
				acc[e.type] = (acc[e.type] ?? 0) + (e.count ?? 1);
				return acc;
			}, {}),
		},
	};
}

// ─── GDPR Deletion Pipeline ───────────────────────────────────────

/**
 * Create a deletion request with a 30-day grace period.
 * Returns the created request with cancellation token.
 */
export async function createDeletionRequest(userId: string, reason?: string) {
	const token = randomBytes(32).toString("hex");
	const retentionUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

	return await db.userDeletionRequest.create({
		data: {
			userId,
			reason,
			retentionUntil,
			cancellationToken: token,
			status: "pending",
		},
	});
}

/**
 * Cancel a pending deletion request by its cancellation token.
 */
export async function cancelDeletionRequest(cancellationToken: string) {
	return await db.userDeletionRequest.update({
		where: { cancellationToken },
		data: { status: "cancelled" },
	});
}

/**
 * Immediately anonymize user personal data.
 * Replaces name, email, clears profile fields.
 */
export async function anonymizeUserData(userId: string) {
	return await db.user.update({
		where: { id: userId },
		data: {
			name: "Deleted User",
			email: `deleted-${userId}@deleted.aacsearch.com`,
			image: null,
			displayUsername: null,
			banReason: null,
			anonymized: true,
		},
	});
}

/**
 * Get all pending deletion requests past their retention date.
 */
export async function getPendingDeletionRequests() {
	return await db.userDeletionRequest.findMany({
		where: {
			status: "pending",
			retentionUntil: { lte: new Date() },
		},
	});
}

/**
 * Get an active deletion request for a user.
 */
export async function getUserDeletionRequest(userId: string) {
	return await db.userDeletionRequest.findUnique({
		where: { userId },
	});
}

/**
 * Mark a deletion request as completed.
 */
export async function completeDeletionRequest(id: string) {
	return await db.userDeletionRequest.update({
		where: { id },
		data: {
			status: "completed",
			completedAt: new Date(),
		},
	});
}

/**
 * Anonymize records that reference a deleted user but must be retained
 * for legal/compliance reasons (financial data, audit logs, etc.).
 * Uses the sentinel user approach — reassigns userId to a known sentinel.
 */
export async function anonymizeUserReferences(userId: string) {
	const sentinelId = "00000000-0000-0000-0000-000000000000";

	// Anonymize audit logs
	await db.auditLog.updateMany({
		where: { userId },
		data: {
			userId: sentinelId,
			userAgent: null,
			ipAddress: null,
		},
	});

	// Anonymize purchases (keep financial data)
	await db.purchase.updateMany({
		where: { userId },
		data: {
			userId: sentinelId,
		},
	});

	// Anonymize NPS survey responses
	await db.npsSurveyResponse.updateMany({
		where: { userId },
		data: {
			userId: sentinelId,
			feedback: null,
		},
	});

	// Anonymize knowledge spaces (user-owned only)
	await db.knowledgeSpace.updateMany({
		where: { userId },
		data: {
			userId: sentinelId,
		},
	});

	// Zero out AI wallet
	await db.aiWallet.updateMany({
		where: { userId },
		data: {
			balanceKopecks: BigInt(0),
		},
	});

	return { sentinelId };
}

/**
 * Check if a user is the last active member of any organization.
 * Returns organizations where they are the only member.
 */
export async function getOrphanOrganizations(userId: string) {
	const memberships = await db.member.findMany({
		where: { userId },
		select: {
			organizationId: true,
			organization: {
				select: {
					id: true,
					name: true,
					slug: true,
					_count: {
						select: { members: true },
					},
				},
			},
		},
	});

	return memberships.filter((m) => m.organization._count.members <= 1);
}
