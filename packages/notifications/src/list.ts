import { db } from "@repo/database";

import { resolveNotificationLink } from "./resolve-link";

export async function listNotificationsForUser(userId: string, options?: { take?: number }) {
	const take = options?.take ?? 50;
	const rows = await db.notification.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
		take,
	});
	return rows.map((row) => ({
		...row,
		link: resolveNotificationLink(row.link),
	}));
}

export async function countUnreadNotifications(userId: string) {
	return await db.notification.count({
		where: { userId, read: false },
	});
}
