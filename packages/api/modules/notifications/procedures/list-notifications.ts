import { listNotificationsForUser } from "@repo/notifications";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const listNotifications = protectedProcedure
	.route({
		method: "GET",
		path: "/notifications",
		tags: ["Notifications"],
		summary: "List notifications",
		description: "Returns recent notifications for the current user",
	})
	.input(
		z.object({
			take: z.number().int().min(1).max(100).optional(),
		}),
	)
	.handler(async ({ input: { take }, context: { user } }) => {
		const items = await listNotificationsForUser(user.id, {
			take: take ?? 50,
		});
		return items.map((n) => ({
			id: n.id,
			userId: n.userId,
			type: n.type as string,
			data: n.data,
			link: n.link,
			read: n.read,
			createdAt: n.createdAt,
			updatedAt: n.updatedAt,
		}));
	});
