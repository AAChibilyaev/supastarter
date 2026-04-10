import { getPreferences } from "./procedures/get-preferences";
import { listNotifications } from "./procedures/list-notifications";
import { markAllNotificationsRead } from "./procedures/mark-all-read";
import { markNotificationsRead } from "./procedures/mark-notifications-read";
import { unreadCount } from "./procedures/unread-count";
import { updatePreference } from "./procedures/update-preference";

export const notificationsRouter = {
	list: listNotifications,
	unreadCount,
	markRead: markNotificationsRead,
	markAllRead: markAllNotificationsRead,
	getPreferences,
	updatePreference,
};
