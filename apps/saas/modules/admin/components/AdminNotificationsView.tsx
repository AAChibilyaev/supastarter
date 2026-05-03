"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { toastPromise } from "@repo/ui/components/toast";
import { NotificationPreferencesForm } from "@settings/components/NotificationPreferencesForm";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type NotificationRow = {
	id: string;
	type: string;
	data: unknown;
	read: boolean;
	createdAt: Date | string;
};

export function AdminNotificationsView() {
	const t = useTranslations("admin.notifications");
	const queryClient = useQueryClient();
	const notificationsQuery = useQuery(
		orpc.notifications.list.queryOptions({
			input: {
				take: 30,
			},
		}),
	);

	const markAllReadMutation = useMutation(
		orpc.notifications.markAllRead.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.notifications.list.queryKey({
						input: {
							take: 30,
						},
					}),
				});
			},
		}),
	);

	return (
		<div className="gap-6 grid grid-cols-1">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>{t("recentNotifications")}</CardTitle>
					<Button
						variant="outline"
						onClick={() =>
							toastPromise(async () => markAllReadMutation.mutateAsync({}), {
								loading: t("markingRead"),
								success: t("markReadSuccess"),
								error: t("markReadError"),
							})
						}
						disabled={markAllReadMutation.isPending}
					>
						{t("markAllRead")}
					</Button>
				</CardHeader>
				<CardContent className="gap-2 grid grid-cols-1">
					{(notificationsQuery.data as NotificationRow[] | undefined)?.map((item) => (
						<Card key={item.id} className="rounded-md">
							<CardContent className="p-3 text-sm flex items-center justify-between">
								<div>
									<p className="font-medium">{item.type}</p>
									<p className="text-foreground/60">{new Date(item.createdAt).toLocaleString()}</p>
								</div>
								<span className="text-xs text-foreground/60">
									{item.read ? t("statusRead") : t("statusUnread")}
								</span>
							</CardContent>
						</Card>
					))}
					{!notificationsQuery.isLoading &&
					(notificationsQuery.data as NotificationRow[] | undefined)?.length === 0 ? (
						<p className="text-sm text-foreground/60">{t("noNotifications")}</p>
					) : null}
				</CardContent>
			</Card>

			<NotificationPreferencesForm />
		</div>
	);
}
