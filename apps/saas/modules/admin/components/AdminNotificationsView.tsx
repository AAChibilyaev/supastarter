"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { toastPromise } from "@repo/ui/components/toast";
import { NotificationPreferencesForm } from "@settings/components/NotificationPreferencesForm";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type NotificationRow = {
	id: string;
	type: string;
	data: unknown;
	read: boolean;
	createdAt: Date | string;
};

export function AdminNotificationsView() {
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
					<CardTitle>Recent notifications</CardTitle>
					<Button
						variant="outline"
						onClick={() =>
							toastPromise(async () => markAllReadMutation.mutateAsync({}), {
								loading: "Marking notifications as read...",
								success: "Done.",
								error: "Could not mark all as read.",
							})
						}
						disabled={markAllReadMutation.isPending}
					>
						Mark all as read
					</Button>
				</CardHeader>
				<CardContent className="gap-2 grid grid-cols-1">
					{(notificationsQuery.data as NotificationRow[] | undefined)?.map((item) => (
						<div
							key={item.id}
							className="p-3 text-sm flex items-center justify-between rounded-md border"
						>
							<div>
								<p className="font-medium">{item.type}</p>
								<p className="text-foreground/60">
									{new Date(item.createdAt).toLocaleString()}
								</p>
							</div>
							<span className="text-xs text-foreground/60">
								{item.read ? "read" : "unread"}
							</span>
						</div>
					))}
					{!notificationsQuery.isLoading &&
					(notificationsQuery.data as NotificationRow[] | undefined)?.length === 0 ? (
						<p className="text-sm text-foreground/60">No notifications yet.</p>
					) : null}
				</CardContent>
			</Card>

			<NotificationPreferencesForm />
		</div>
	);
}
