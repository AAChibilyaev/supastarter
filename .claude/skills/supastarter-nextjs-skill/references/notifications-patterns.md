# Notifications Patterns (Next.js)

In-app and email notifications in supastarter Next.js, served by the `@repo/notifications` package.

## Layout

```
packages/notifications/
  create-notification.ts   # main entry — createNotification()
  list.ts                  # query helper for notification lists
  mark-read.ts             # mark single / mark all read
  preferences.ts           # user preference storage
  catalog.ts               # NOTIFICATION_GROUPS + i18n label keys
  types.ts                 # NotificationType union (kept in sync with Prisma enum)
  resolve-link.ts          # builds the deep link for a notification
  welcome.ts               # ad-hoc welcome notification helper
  index.ts
```

API: `packages/api/modules/notifications/` (list, unreadCount, markRead, markAllRead, getPreferences, updatePreference).

UI (notification center): `apps/saas/modules/shared/components/`.

## Creating a notification

```typescript
import { createNotification } from "@repo/notifications";

await createNotification({
	userId: targetUserId,
	type: "feedback_received", // must exist in NotificationType / catalog
	data: {
		// arbitrary JSON, used by template + UI
		title: "New feedback",
		headline: "Someone left feedback",
		message: "...",
	},
	link: "/feedback/123", // optional deep link
});
```

Behavior, gated by user preferences:

- **In-app**: a row is inserted in the notifications table (visible in the notification center).
- **Email**: the `notification` mail template is sent (`data.headline` / `data.title` / `data.message` drive copy).

The user can disable each channel per type via `updatePreference`.

## Adding a new notification type

1. **Prisma enum** — add the value to `NotificationType` in `packages/database/prisma/schema.prisma`. Push:
    ```bash
    pnpm --filter @repo/database push
    pnpm --filter @repo/database generate
    ```
2. **TS union** — add the same string to `NotificationType` in `packages/notifications/types.ts`.
3. **Catalog** — register it in `packages/notifications/catalog.ts`:
    - Assign it to a group in `NOTIFICATION_GROUPS`.
    - Add the i18n label keys (`title`, `description`) under `saas.settings.notificationsPage.types.<type>` in **all 4 locales** (`en, de, es, fr`).
4. (Optional) Customize `resolve-link.ts` if the deep link depends on `data`.
5. Trigger via `createNotification({ type: "<new_type>", ... })`.

## Frontend usage

```typescript
"use client";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function NotificationCenter() {
	const qc = useQueryClient();
	const { data } = useQuery(orpc.notifications.list.queryOptions());
	const unread = useQuery(orpc.notifications.unreadCount.queryOptions());
	const markAll = useMutation(
		orpc.notifications.markAllRead.mutationOptions({
			onSuccess: () => qc.invalidateQueries(orpc.notifications.list.key()),
		}),
	);
	// ...
}
```

## Preferences UI

Settings page: `apps/saas/app/(authenticated)/(main)/(account)/settings/notifications/` (or wherever the SaaS app routes notification settings). Backed by `orpc.notifications.getPreferences` and `updatePreference`.

The settings page reads `NOTIFICATION_GROUPS` from `packages/notifications/catalog.ts` and renders a checkbox per channel × type.

## Common pitfalls

- Forgetting one of: Prisma enum value / TS union / catalog entry / i18n labels → notification system silently skips or shows empty rows.
- Sending email but no in-app: ensure user preference allows in-app, and check the user is opted in.
- New notification not showing in settings UI: the catalog drives the UI — re-check `NOTIFICATION_GROUPS` and i18n keys.

## Docs

The notification module is supastarter-specific — read the source under `packages/notifications/` (small, well-scoped) before adding new types.
