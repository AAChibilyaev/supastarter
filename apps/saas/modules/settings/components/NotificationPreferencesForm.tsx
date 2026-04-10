"use client";

import { NOTIFICATION_GROUPS } from "@repo/notifications/catalog";
import { Card, Switch } from "@repo/ui";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

type TargetKey = "IN_APP" | "EMAIL";

export function NotificationPreferencesForm() {
	const t = useTranslations("settings.notificationsPage");
	const queryClient = useQueryClient();

	const { data, isPending } = useQuery(
		orpc.notifications.getPreferences.queryOptions({ input: {} }),
	);

	const disabledSet = useMemo(() => {
		const set = new Set<string>();
		for (const row of data?.disabled ?? []) {
			set.add(`${row.type}:${row.target}`);
		}
		return set;
	}, [data?.disabled]);

	const updateMutation = useMutation(
		orpc.notifications.updatePreference.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.notifications.getPreferences.queryKey({
						input: {},
					}),
				});
			},
		}),
	);

	const isEnabled = (type: string, target: TargetKey) => !disabledSet.has(`${type}:${target}`);

	const onToggle = (type: "WELCOME" | "APP_UPDATE", target: TargetKey, nextEnabled: boolean) => {
		updateMutation.mutate({
			type,
			target,
			disabled: !nextEnabled,
		});
	};

	return (
		<Card className="p-6">
			{isPending ? (
				<p className="text-sm text-muted-foreground">…</p>
			) : (
				<div className="gap-8 flex flex-col">
					{NOTIFICATION_GROUPS.map((group) => (
						<section key={group.id}>
							<h3 className="mb-3 font-medium text-sm text-foreground">
								{t(`groups.${group.id}.title`)}
							</h3>
							<div className="overflow-x-auto rounded-lg border">
								<table className="text-sm w-full min-w-[320px]">
									<thead>
										<tr className="border-b bg-muted/40 text-left">
											<th className="px-3 py-2 font-medium">
												{t("columns.type")}
											</th>
											<th className="px-3 py-2 font-medium">
												{t("columns.inApp")}
											</th>
											<th className="px-3 py-2 font-medium">
												{t("columns.email")}
											</th>
										</tr>
									</thead>
									<tbody>
										{group.types.map((type) => (
											<tr key={type} className="border-b last:border-0">
												<td className="px-3 py-3 font-medium">
													{t(`types.${type}.label`)}
												</td>
												<td className="px-3 py-2">
													<Switch
														checked={isEnabled(type, "IN_APP")}
														disabled={updateMutation.isPending}
														onCheckedChange={(checked) =>
															onToggle(type, "IN_APP", checked)
														}
														aria-label={`${type} in-app`}
													/>
												</td>
												<td className="px-3 py-2">
													<Switch
														checked={isEnabled(type, "EMAIL")}
														disabled={updateMutation.isPending}
														onCheckedChange={(checked) =>
															onToggle(type, "EMAIL", checked)
														}
														aria-label={`${type} email`}
													/>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>
					))}
				</div>
			)}
		</Card>
	);
}
