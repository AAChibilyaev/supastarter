"use client";

import { useSession } from "@auth/hooks/use-session";
import { Button } from "@repo/ui/components/button";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { SettingsItem } from "@shared/components/SettingsItem";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function DeleteAccountForm() {
	const t = useTranslations();
	const { reloadSession } = useSession();
	const { confirm } = useConfirmationAlert();
	const [cancellationToken, setCancellationToken] = useState<string | null>(null);

	const requestDeletionMutation = useMutation(orpc.users.requestDeletion.mutationOptions());

	const cancelDeletionMutation = useMutation(orpc.users.cancelDeletion.mutationOptions());

	const confirmDelete = () => {
		confirm({
			title: t("settings.account.deleteAccount.title"),
			message: t("settings.account.deleteAccount.confirmation"),
			onConfirm: async () => {
				try {
					const result = await requestDeletionMutation.mutateAsync({
						reason: undefined,
					});

					if (result.success) {
						setCancellationToken(result.cancellationToken);
						toastSuccess(result.message);
					}
				} catch {
					toastError(t("settings.account.deleteAccount.notifications.error"));
				}
			},
		});
	};

	const handleCancelDeletion = async () => {
		if (!cancellationToken) return;

		try {
			const result = await cancelDeletionMutation.mutateAsync({
				cancellationToken,
			});

			if (result.success) {
				setCancellationToken(null);
				toastSuccess(result.message);
				await reloadSession();
			} else {
				toastError(result.message);
			}
		} catch {
			toastError(t("settings.account.deleteAccount.notifications.error"));
		}
	};

	if (cancellationToken) {
		return (
			<SettingsItem
				danger
				title={t("settings.account.deleteAccount.title")}
				description="Deletion is scheduled with a 30-day grace period. Use the button below to cancel."
			>
				<div className="mt-4 gap-3 flex flex-col">
					<p className="text-sm text-muted-foreground">
						Cancellation token: <code className="text-xs">{cancellationToken}</code>
					</p>
					<div className="gap-2 flex justify-end">
						<Button
							variant="outline"
							onClick={handleCancelDeletion}
							disabled={cancelDeletionMutation.isPending}
						>
							Cancel Deletion
						</Button>
					</div>
				</div>
			</SettingsItem>
		);
	}

	return (
		<SettingsItem
			danger
			title={t("settings.account.deleteAccount.title")}
			description={t("settings.account.deleteAccount.description")}
		>
			<div className="mt-4 flex justify-end">
				<Button
					variant="destructive"
					onClick={() => confirmDelete()}
					disabled={requestDeletionMutation.isPending}
				>
					{t("settings.account.deleteAccount.submit")}
				</Button>
			</div>
		</SettingsItem>
	);
}
