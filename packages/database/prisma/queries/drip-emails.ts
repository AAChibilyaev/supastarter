import { db } from "../client";

/**
 * Drip day offsets (in days from dripStartedAt):
 *   Day 0 → welcome (immediate)
 *   Day 1 → how to create first collection
 *   Day 3 → connect your CMS
 *   Day 7 → tips: synonyms, curations
 *   Day 14 → case study
 *   Day 21 → upgrade prompt
 */
export const DRIP_DAY_OFFSETS = [0, 1, 3, 7, 14, 21] as const;
export type DripDay = (typeof DRIP_DAY_OFFSETS)[number];

export interface DripEmailRecord {
	id: string;
	userId: string;
	dripDay: number;
	sentAt: Date;
}

/**
 * Find users whose drip sequence started exactly `dripDay` days ago
 * (within the last ~24h window) and haven't received that drip email.
 *
 * Uses `user.dripStartedAt` rather than `user.createdAt` so the
 * sequence begins when a meaningful activation event happens, not at signup.
 */
export async function findUsersForDripDay(
	dripDay: DripDay,
): Promise<{ userId: string; email: string; name: string }[]> {
	const now = new Date();

	// Window: users whose dripStartedAt is between N days ago (start of day) and N days ago (end of day)
	const since = new Date(now);
	since.setDate(since.getDate() - dripDay);
	since.setHours(0, 0, 0, 0);
	since.setMinutes(0, 0, 0);

	const until = new Date(since);
	until.setHours(23, 59, 59, 999);

	const users = await db.user.findMany({
		where: {
			dripStartedAt: { gte: since, lte: until },
		},
		select: {
			id: true,
			email: true,
			name: true,
			locale: true,
		},
	});

	if (users.length === 0) return [];

	const userIds = users.map((u) => u.id);

	// Check which users have already received this drip day via DripEmailRecord
	// Using WELCOME notification type with dripType data as a tracking mechanism
	const existingNotifications = await db.notification.findMany({
		where: {
			userId: { in: userIds },
			type: "WELCOME",
		},
		select: { userId: true, data: true },
	});

	const alreadySent = new Set(
		existingNotifications
			.filter((n) => {
				const data = n.data as Record<string, unknown> | null;
				return data?.dripType === `day${dripDay}`;
			})
			.map((n) => n.userId),
	);

	return users
		.filter((u) => !alreadySent.has(u.id))
		.map((u) => ({
			userId: u.id,
			email: u.email,
			name: u.name ?? u.email.split("@")[0],
		}));
}

/**
 * Record that a drip email was sent to a user.
 */
export async function recordDripSent(userId: string, dripDay: number) {
	return db.notification.create({
		data: {
			userId,
			type: "WELCOME",
			data: {
				dripType: `day${dripDay}`,
				sentAt: new Date().toISOString(),
			},
		},
	});
}

/**
 * Start the drip email sequence for a user.
 * Sets `dripStartedAt` to the given timestamp (defaults to now).
 * Idempotent — won't overwrite an existing start date.
 */
export async function startDripSequence(userId: string, startedAt: Date = new Date()) {
	// Only set if not already started
	await db.user.updateMany({
		where: {
			id: userId,
			dripStartedAt: null,
		},
		data: {
			dripStartedAt: startedAt,
		},
	});
}
