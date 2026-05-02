import { db } from "../client";
import { NotificationType } from "../generated/client";

export interface DripEmailRecord {
	id: string;
	userId: string;
	dripDay: number;
	sentAt: Date;
}

export async function findUsersForDripDay(
	dripDay: number,
): Promise<{ userId: string; email: string; name: string }[]> {
	const since = new Date();
	since.setDate(since.getDate() - dripDay);
	since.setHours(0, 0, 0, 0);

	const until = new Date(since);
	until.setHours(23, 59, 59, 999);

	const users = await db.user.findMany({
		where: {
			createdAt: { gte: since, lte: until },
		},
		select: {
			id: true,
			email: true,
			name: true,
		},
	});

	if (users.length === 0) return [];

	const userIds = users.map((u) => u.id);

	const existingNotifications = await db.notification.findMany({
		where: {
			userId: { in: userIds },
			type: NotificationType.WELCOME,
		},
		select: { userId: true, data: true },
	});

	const existingUserIds = new Set(
		existingNotifications
			.filter((n) => {
				const data = n.data as Record<string, unknown> | null;
				return data?.dripType === `day${dripDay}`;
			})
			.map((n) => n.userId),
	);

	return users
		.filter((u) => !existingUserIds.has(u.id))
		.map((u) => ({
			userId: u.id,
			email: u.email,
			name: u.name ?? u.email.split("@")[0],
		}));
}

export async function recordDripSent(userId: string, dripDay: number) {
	return db.notification.create({
		data: {
			userId,
			type: NotificationType.WELCOME,
			data: {
				dripType: `day${dripDay}`,
				sentAt: new Date().toISOString(),
			},
		},
	});
}
