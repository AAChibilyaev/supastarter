/** Section id for i18n (`settings.notificationsPage.groups.${id}`) and ordering. */
export type NotificationGroupId = "general" | "billing";

/** Mirrors Prisma `NotificationType` — keep in sync with schema. */
export type NotificationTypeId =
	| "WELCOME"
	| "APP_UPDATE"
	| "AI_LOW_BALANCE"
	| "AI_TOPUP_PAID"
	| "AI_TOPUP_FAILED"
	| "AI_OVERAGE_REACHED"
	| "PAYMENT_FAILED"
	| "QUOTA_ALERT";

export interface NotificationGroupConfig {
	id: NotificationGroupId;
	/** Notification types in this section, in display order. */
	types: readonly NotificationTypeId[];
}

/**
 * Ordered groups for the notification preferences UI.
 * Reorder this list or the `types` arrays to change settings layout without DB migrations.
 */
export const NOTIFICATION_GROUPS: readonly NotificationGroupConfig[] = [
	{
		id: "general",
		types: ["APP_UPDATE"],
	},
	{
		id: "billing",
		types: [
			"AI_LOW_BALANCE",
			"AI_TOPUP_PAID",
			"AI_TOPUP_FAILED",
			"AI_OVERAGE_REACHED",
			"QUOTA_ALERT",
			"PAYMENT_FAILED",
		],
	},
];
