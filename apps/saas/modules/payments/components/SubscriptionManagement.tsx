"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PauseIcon, PlayIcon, XCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface SubscriptionManagementProps {
	purchaseId: string;
	status: string | null;
}

export function SubscriptionManagement({ purchaseId, status }: SubscriptionManagementProps) {
	const t = useTranslations("settings.billing.subscriptionManagement");
	const queryClient = useQueryClient();

	const invalidatePurchases = () => {
		void queryClient.invalidateQueries({
			queryKey: orpc.payments.listPurchases.queryKey({ input: {} }),
		});
	};

	const cancelMutation = useMutation(
		orpc.payments.cancelSubscription.mutationOptions({
			onSuccess: () => {
				toastSuccess(t("cancelSuccess"));
				invalidatePurchases();
			},
			onError: () => {
				toastError(t("cancelError"));
			},
		}),
	);

	const pauseMutation = useMutation(
		orpc.payments.pauseSubscription.mutationOptions({
			onSuccess: () => {
				toastSuccess(t("pauseSuccess"));
				invalidatePurchases();
			},
			onError: () => {
				toastError(t("pauseError"));
			},
		}),
	);

	const resumeMutation = useMutation(
		orpc.payments.resumeSubscription.mutationOptions({
			onSuccess: () => {
				toastSuccess(t("resumeSuccess"));
				invalidatePurchases();
			},
			onError: () => {
				toastError(t("resumeError"));
			},
		}),
	);

	// For active subscriptions — show cancel and pause
	if (status === "active") {
		return (
			<div className="gap-2 flex flex-wrap">
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="destructive" size="sm">
							<XCircleIcon className="mr-2 size-4" />
							{t("cancelButton")}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t("cancelDialogTitle")}</AlertDialogTitle>
							<AlertDialogDescription>
								{t("cancelDialogDescription")}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t("cancelDialogCancel")}</AlertDialogCancel>
							<AlertDialogAction
								onClick={() =>
									cancelMutation.mutate({
										purchaseId,
										mode: "cancel_at_period_end",
									})
								}
							>
								{t("cancelDialogConfirm")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="secondary" size="sm">
							<PauseIcon className="mr-2 size-4" />
							{t("pauseButton")}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t("pauseDialogTitle")}</AlertDialogTitle>
							<AlertDialogDescription>
								{t("pauseDialogDescription")}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t("pauseDialogCancel")}</AlertDialogCancel>
							<AlertDialogAction
								onClick={() =>
									pauseMutation.mutate({
										purchaseId,
										behavior: "keep_as_draft",
									})
								}
							>
								{t("pauseDialogConfirm")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		);
	}

	// For paused or cancel_at_period_end — show resume
	if (status === "paused" || status === "canceling") {
		return (
			<Button
				variant="secondary"
				size="sm"
				loading={resumeMutation.isPending}
				onClick={() => resumeMutation.mutate({ purchaseId })}
			>
				<PlayIcon className="mr-2 size-4" />
				{t("resumeButton")}
			</Button>
		);
	}

	// For canceled subscriptions — show nothing (can't resume after immediate cancel)
	return null;
}
