import type { NotificationTarget, NotificationType } from "@repo/database";
import { db } from "@repo/database";

export async function getDisabledNotificationPreferences(userId: string) {
	return await db.userNotificationPreference.findMany({
		where: { userId },
		select: { type: true, target: true },
	});
}

export async function isNotificationDisabled(
	userId: string,
	type: NotificationType,
	target: NotificationTarget,
) {
	const row = await db.userNotificationPreference.findUnique({
		where: {
			userId_type_target: { userId, type, target },
		},
	});
	return Boolean(row);
}

export async function setNotificationDisabled(
	userId: string,
	type: NotificationType,
	target: NotificationTarget,
	disabled: boolean,
) {
	if (disabled) {
		await db.userNotificationPreference.upsert({
			where: {
				userId_type_target: { userId, type, target },
			},
			create: { userId, type, target },
			update: {},
		});
	} else {
		await db.userNotificationPreference.deleteMany({
			where: { userId, type, target },
		});
	}
}
