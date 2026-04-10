export const NOTIFICATION_TYPES = {
	WELCOME: "WELCOME",
	APP_UPDATE: "APP_UPDATE",
} as const;

export type { NotificationTarget, NotificationType } from "@repo/database";
