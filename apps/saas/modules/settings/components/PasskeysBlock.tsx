"use client";
import { userPasskeyQueryKey, useUserPasskeysQuery } from "@auth/lib/api";
import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { toastError, toastPromise, toastSuccess } from "@repo/ui/components/toast";
import { SettingsItem } from "@shared/components/SettingsItem";
import { useQueryClient } from "@tanstack/react-query";
import { KeyIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

export function PasskeysBlock() {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const formatter = useFormatter();

	const { data: passkeys, isPending } = useUserPasskeysQuery();

	const addPasskey = async () => {
		await authClient.passkey.addPasskey({
			fetchOptions: {
				onSuccess: async () => {
					await queryClient.invalidateQueries({
						queryKey: userPasskeyQueryKey,
					});

					toastSuccess(
						t(
							"settings.account.security.passkeys.notifications.addPasskey.success.title",
						),
					);
				},
				onError: () => {
					toastError(
						t(
							"settings.account.security.passkeys.notifications.addPasskey.error.title",
						),
					);
				},
			},
		});
	};

	const deletePasskey = (id: string) => {
		toastPromise(
			async () => {
				await authClient.passkey.deletePasskey({
					id,
					fetchOptions: {
						onSuccess: () => {
							void queryClient.invalidateQueries({
								queryKey: userPasskeyQueryKey,
							});
						},
					},
				});
			},
			{
				loading: t(
					"settings.account.security.passkeys.notifications.deletePasskey.loading.title",
				),
				success: t(
					"settings.account.security.passkeys.notifications.deletePasskey.success.title",
				),
				error: t(
					"settings.account.security.passkeys.notifications.deletePasskey.error.title",
				),
			},
		);
	};

	return (
		<SettingsItem
			title={t("settings.account.security.passkeys.title")}
			description={t("settings.account.security.passkeys.description")}
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
					passkeys?.map((passkey) => (
						<div key={passkey.id} className="gap-2 flex">
							<KeyIcon className="size-6 shrink-0 text-primary/50" />
							<div className="flex-1">
								<strong className="text-sm block">
									{passkey.deviceType} {passkey.name}
								</strong>
								<small className="text-xs leading-tight block text-foreground/60">
									{formatter.dateTime(new Date(passkey.createdAt))}
								</small>
							</div>
							<Button
								variant="secondary"
								size="icon"
								className="shrink-0"
								onClick={() => deletePasskey(passkey.id)}
							>
								<TrashIcon className="size-4" />
							</Button>
						</div>
					))
				)}

				<div className="flex justify-start">
					<Button variant="secondary" onClick={addPasskey}>
						<PlusIcon className="mr-1.5 size-4" />
						{t("settings.account.security.passkeys.addPasskey")}
					</Button>
				</div>
			</div>
		</SettingsItem>
	);
}
