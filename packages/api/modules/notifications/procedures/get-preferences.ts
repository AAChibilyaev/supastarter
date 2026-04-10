import { getDisabledNotificationPreferences } from "@repo/notifications";

import { protectedProcedure } from "../../../orpc/procedures";

export const getPreferences = protectedProcedure
	.route({
		method: "GET",
		path: "/notifications/preferences",
		tags: ["Notifications"],
		summary: "Get notification preferences",
	})
	.handler(async ({ context: { user } }) => {
		const disabled = await getDisabledNotificationPreferences(user.id);
		return { disabled };
	});
