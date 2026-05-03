     1|import type { z } from "zod";
     2|
     3|import { db } from "../client";
     4|import type { UserSchema } from "../zod";
     5|
     6|export async function getUsers({
     7|	limit,
     8|	offset,
     9|	query,
    10|}: {
    11|	limit: number;
    12|	offset: number;
    13|	query?: string;
    14|}) {
    15|	return await db.user.findMany({
    16|		where: query
    17|			? {
    18|					OR: [
    19|						{
    20|							name: {
    21|								contains: query,
    22|								mode: "insensitive",
    23|							},
    24|						},
    25|						{
    26|							email: {
    27|								contains: query,
    28|								mode: "insensitive",
    29|							},
    30|						},
    31|					],
    32|				}
    33|			: undefined,
    34|		take: limit,
    35|		skip: offset,
    36|	});
    37|}
    38|
    39|export async function countAllUsers({ query }: { query?: string }) {
    40|	return await db.user.count({
    41|		where: query
    42|			? {
    43|					OR: [
    44|						{
    45|							name: {
    46|								contains: query,
    47|								mode: "insensitive",
    48|							},
    49|						},
    50|						{
    51|							email: {
    52|								contains: query,
    53|								mode: "insensitive",
    54|							},
    55|						},
    56|					],
    57|				}
    58|			: undefined,
    59|	});
    60|}
    61|
    62|export async function getUserById(id: string) {
    63|	return await db.user.findUnique({
    64|		where: {
    65|			id,
    66|		},
    67|	});
    68|}
    69|
    70|export async function getUserByEmail(email: string) {
    71|	return await db.user.findUnique({
    72|		where: {
    73|			email,
    74|		},
    75|	});
    76|}
    77|
    78|export async function createUser({
    79|	email,
    80|	name,
    81|	role,
    82|	emailVerified,
    83|	onboardingComplete,
    84|}: {
    85|	email: string;
    86|	name: string;
    87|	role: "admin" | "user";
    88|	emailVerified: boolean;
    89|	onboardingComplete: boolean;
    90|}) {
    91|	return await db.user.create({
    92|		data: {
    93|			email,
    94|			name,
    95|			role,
    96|			emailVerified,
    97|			onboardingComplete,
    98|			createdAt: new Date(),
    99|			updatedAt: new Date(),
   100|		},
   101|	});
   102|}
   103|
   104|export async function getAccountById(id: string) {
   105|	return await db.account.findUnique({
   106|		where: {
   107|			id,
   108|		},
   109|	});
   110|}
   111|
   112|export async function createUserAccount({
   113|	userId,
   114|	providerId,
   115|	accountId,
   116|	hashedPassword,
   117|}: {
   118|	userId: string;
   119|	providerId: string;
   120|	accountId: string;
   121|	hashedPassword?: string;
   122|}) {
   123|	return await db.account.create({
   124|		data: {
   125|			userId,
   126|			accountId,
   127|			providerId,
   128|			password: hashedPassword,
   129|			createdAt: new Date(),
   130|			updatedAt: new Date(),
   131|		},
   132|	});
   133|}
   134|
   135|export async function updateUser(user: Partial<z.infer<typeof UserSchema>> & { id: string }) {
   136|	return await db.user.update({
   137|		where: {
   138|			id: user.id,
   139|		},
   140|		data: user,
   141|	});
   142|}
   143|
   144|/**
   145| * GDPR Article 20 — Data Portability Export
   146| * Fetches all user data from existing models for JSON export.
   147| * Includes: profile, memberships, organizations, API keys, purchases, usage events.
   148| */
   149|export async function exportUserData(userId: string) {
   150|	const user = await db.user.findUnique({
   151|		where: { id: userId },
   152|		select: {
   153|			id: true,
   154|			email: true,
   155|			name: true,
   156|			image: true,
   157|			role: true,
   158|			emailVerified: true,
   159|			locale: true,
   160|			onboardingComplete: true,
   161|			createdAt: true,
   162|			updatedAt: true,
   163|		},
   164|	});
   165|	if (!user) return null;
   166|
   167|	const memberships = await db.member.findMany({
   168|		where: { userId },
   169|		select: {
   170|			id: true,
   171|			role: true,
   172|			createdAt: true,
   173|			organization: {
   174|				select: {
   175|					id: true,
   176|					name: true,
   177|					slug: true,
   178|					createdAt: true,
   179|				},
   180|			},
   181|		},
   182|	});
   183|
   184|	const organizationIds = memberships.map((m) => m.organization.id);
   185|
   186|	const apiKeys = await db.searchApiKey.findMany({
   187|		where: { organizationId: { in: organizationIds } },
   188|		select: {
   189|			id: true,
   190|			prefix: true,
   191|			scopes: true,
   192|			indexSlug: true,
   193|			expiresAt: true,
   194|			createdAt: true,
   195|		},
   196|	});
   197|
   198|	const purchases = await db.purchase.findMany({
   199|		where: { userId },
   200|		select: {
   201|			id: true,
   202|			type: true,
   203|			status: true,
   204|			planId: true,
   205|			priceId: true,
   206|			createdAt: true,
   207|		},
   208|		orderBy: { createdAt: "desc" },
   209|		take: 100,
   210|	});
   211|
   212|	const usageEvents = await db.searchUsageEvent.findMany({
   213|		where: { organizationId: { in: organizationIds } },
   214|		select: {
   215|			id: true,
   216|			type: true,
   217|			count: true,
   218|			createdAt: true,
   219|		},
   220|		orderBy: { createdAt: "desc" },
   221|		take: 500,
   222|	});
   223|
   224|	return {
   225|		exportedAt: new Date().toISOString(),
   226|		user,
   227|		memberships: memberships.map((m) => ({
   228|			organizationId: m.organization.id,
   229|			organizationName: m.organization.name,
   230|			organizationSlug: m.organization.slug,
   231|			role: m.role,
   232|			joinedAt: m.createdAt,
   233|		})),
   234|		apiKeys: apiKeys.map((k) => ({
   235|			prefix: k.prefix,
   236|			scopes: k.scopes,
   237|			indexSlug: k.indexSlug,
   238|			expiresAt: k.expiresAt,
   239|			createdAt: k.createdAt,
   240|		})),
   241|		purchases: purchases.map((p) => ({
   242|			type: p.type,
   243|			status: p.status,
   244|			planId: p.planId,
   245|			date: p.createdAt,
   246|		})),
   247|		usageSummary: {
   248|			totalEvents: usageEvents.length,
   249|			eventsByType: usageEvents.reduce<Record<string, number>>((acc, e) => {
   250|				acc[e.type] = (acc[e.type] ?? 0) + (e.count ?? 1);
   251|				return acc;
   252|			}, {}),
   253|		},
   254|	};
   255|}
   256|

// ─── GDPR Deletion Pipeline ───────────────────────────────────────

import { randomBytes } from "crypto";

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
