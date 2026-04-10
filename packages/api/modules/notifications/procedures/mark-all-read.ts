import { markAllNotificationsAsReadForUser } from "@repo/notifications";

import { protectedProcedure } from "../../../orpc/procedures";

export const markAllNotificationsRead = protectedProcedure
	.route({
		method: "POST",
		path: "/notifications/mark-all-read",
		tags: ["Notifications"],
		summary: "Mark all notifications as read",
	})
	.handler(async ({ context: { user } }) => {
		const result = await markAllNotificationsAsReadForUser(user.id);
		return { count: result.count };
	});
