import { db } from "@repo/database";

export async function markNotificationAsRead(userId: string, notificationId: string) {
	return await db.notification.updateMany({
		where: { id: notificationId, userId },
		data: { read: true },
	});
}

export async function markNotificationsAsRead(userId: string, ids: string[]) {
	if (ids.length === 0) {
		return { count: 0 };
	}
	return await db.notification.updateMany({
		where: { userId, id: { in: ids } },
		data: { read: true },
	});
}

export async function markAllNotificationsAsReadForUser(userId: string) {
	return await db.notification.updateMany({
		where: { userId, read: false },
		data: { read: true },
	});
}
