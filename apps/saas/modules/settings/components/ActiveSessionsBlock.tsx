"use client";
import { useSession } from "@auth/hooks/use-session";
import { sessionQueryKey } from "@auth/lib/api";
import { config } from "@config";
import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { toastSuccess } from "@repo/ui/components/toast";
import { SettingsItem } from "@shared/components/SettingsItem";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ComputerIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function ActiveSessionsBlock() {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { session: currentSession } = useSession();

	const { data: sessions, isPending } = useQuery({
		queryKey: ["active-sessions"],
		queryFn: async () => {
			const { data, error } = await authClient.listSessions();

			if (error) {
				throw error;
			}

			return data;
		},
	});

	const revokeSession = async (token: string) => {
		await authClient.revokeSession(
			{
				token,
			},
			{
				onSuccess: async () => {
					toastSuccess(
						t(
							"settings.account.security.activeSessions.notifications.revokeSession.success",
						),
					);

					if (currentSession?.token === token) {
						await queryClient.refetchQueries({
							queryKey: sessionQueryKey,
						});

						window.location.href = new URL(
							config.redirectAfterLogout,
							window.location.origin,
						).toString();
					} else {
						await queryClient.invalidateQueries({
							queryKey: ["active-sessions"],
						});
					}
				},
			},
		);
	};

	return (
		<SettingsItem
			title={t("settings.account.security.activeSessions.title")}
			description={t("settings.account.security.activeSessions.description")}
		>
			<div className="gap-2 grid grid-cols-1">
				{isPending ? (
					<div className="gap-2 flex">
						<Skeleton className="size-6 shrink-0" />
						<div className="flex-1">
							<Skeleton className="mb-0.5 h-4 w-full" />
							<Skeleton className="h-8 w-full" />
						</div>
						<Skeleton className="size-9 shrink-0" />
					</div>
				) : (
					sessions?.map((session) => (
						<div
							key={session.id}
							className="gap-4 p-4 flex justify-between rounded-2xl border"
						>
							<div className="gap-2 flex">
								<ComputerIcon className="size-6 shrink-0 text-primary/50" />
								<div>
									<strong className="text-sm block">
										{session.id === currentSession?.id
											? t(
													"settings.account.security.activeSessions.currentSession",
												)
											: session.ipAddress}
									</strong>
									<small className="text-xs leading-tight block text-foreground/60">
										{session.userAgent}
									</small>
								</div>
							</div>
							<Button
								variant="secondary"
								size="icon"
								className="shrink-0"
								onClick={() => revokeSession(session.token)}
							>
								<XIcon className="size-4" />
							</Button>
						</div>
					))
				)}
			</div>
		</SettingsItem>
	);
}
