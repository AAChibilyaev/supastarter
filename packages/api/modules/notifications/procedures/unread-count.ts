import { countUnreadNotifications } from "@repo/notifications";

import { protectedProcedure } from "../../../orpc/procedures";

export const unreadCount = protectedProcedure
	.route({
		method: "GET",
		path: "/notifications/unread-count",
		tags: ["Notifications"],
		summary: "Unread notification count",
	})
	.handler(async ({ context: { user } }) => {
		const count = await countUnreadNotifications(user.id);
		return { count };
	});
