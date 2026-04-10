import { createNotification } from "./create-notification";
import { NOTIFICATION_TYPES } from "./types";

export async function createWelcomeNotification(userId: string) {
	return await createNotification({
		userId,
		type: NOTIFICATION_TYPES.WELCOME,
		data: {
			title: "Welcome!",
			message: "This is an example notification.",
		},
		link: "/",
	});
}
