import { markNotificationsAsRead } from "@repo/notifications";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const markNotificationsRead = protectedProcedure
	.route({
		method: "POST",
		path: "/notifications/mark-read",
		tags: ["Notifications"],
		summary: "Mark notifications as read",
	})
	.input(
		z.object({
			ids: z.array(z.string()).min(1),
		}),
	)
	.handler(async ({ input: { ids }, context: { user } }) => {
		const result = await markNotificationsAsRead(user.id, ids);
		return { count: result.count };
	});
